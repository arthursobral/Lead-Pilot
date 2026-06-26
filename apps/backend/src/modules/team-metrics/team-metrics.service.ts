import { Injectable, Logger } from '@nestjs/common';
import { TeamMetricsRepository } from './team-metrics.repository';
import type {
  DeveloperSnapshotInput,
  TeamComputedMetrics,
  TeamMetricSnapshot,
} from './team-metrics.types';

/**
 * TeamMetricsService aggregates per-developer MetricSnapshots into a
 * team-level TeamMetricSnapshot.
 *
 * Design principles (same as MetricsService):
 *   - aggregate() is a pure function -- no DB calls, fully unit-testable.
 *   - calculateForTeam() is the main entrypoint called by the processor.
 *   - No AI, no ranking, no composite score.
 *   - Metrics describe what happened -- interpretation belongs upstream.
 *
 * Extensibility:
 *   - Add new team-level fields to TeamComputedMetrics + TeamMetricSnapshot.
 *   - The pure aggregate() function keeps new calculations isolated and testable.
 *   - UpsertTeamSnapshotData propagates new fields to the DB without changing
 *     the service signature.
 */
@Injectable()
export class TeamMetricsService {
  private readonly logger = new Logger(TeamMetricsService.name);

  constructor(private readonly teamMetricsRepository: TeamMetricsRepository) {}

  // ---------------------------------------------------------------------------
  // Main entrypoint
  // ---------------------------------------------------------------------------

  /**
   * Aggregate metrics for all developers under a team lead and persist.
   *
   * Flow:
   *   1. Resolve developer IDs from the TeamLeadDeveloper join table.
   *   2. Fetch each developer's MetricSnapshot for the exact period.
   *   3. Run aggregate() -- pure, no DB calls.
   *   4. Upsert the TeamMetricSnapshot.
   *
   * Developers without a MetricSnapshot for the period are skipped silently.
   * This is expected on first run or for newly added developers.
   */
  async calculateForTeam(
    teamLeadId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TeamMetricSnapshot> {
    this.logger.log(
      `Aggregating team metrics teamLead=${teamLeadId} ` +
        `[${periodStart.toISOString()} to ${periodEnd.toISOString()}]`,
    );

    const developerIds =
      await this.teamMetricsRepository.findDeveloperIdsByTeamLead(teamLeadId);

    const snapshots = await this.teamMetricsRepository.fetchDeveloperSnapshots(
      developerIds,
      periodStart,
      periodEnd,
    );

    this.logger.log(
      `Found ${snapshots.length} developer snapshot(s) of ${developerIds.length} developer(s)`,
    );

    const computed = this.aggregate(snapshots);

    const teamSnapshot = await this.teamMetricsRepository.upsertTeamSnapshot({
      teamLeadId,
      periodStart,
      periodEnd,
      ...computed,
    });

    this.logger.log(
      `Team snapshot upserted [${teamSnapshot.id}] teamLead=${teamLeadId} ` +
        `developers=${computed.developerCount} ` +
        `totalMerged=${computed.totalPrsMerged} ` +
        `avgMergeTime=${computed.averageMergeTimeHours?.toFixed(1) ?? 'null'}h`,
    );

    return teamSnapshot;
  }

  // ---------------------------------------------------------------------------
  // Snapshot reads
  // ---------------------------------------------------------------------------

  async getLatestTeamSnapshot(teamLeadId: string): Promise<TeamMetricSnapshot | null> {
    return this.teamMetricsRepository.findLatestTeamSnapshot(teamLeadId);
  }

  async getTeamSnapshotForPeriod(
    teamLeadId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TeamMetricSnapshot | null> {
    return this.teamMetricsRepository.findTeamSnapshotForPeriod(
      teamLeadId,
      periodStart,
      periodEnd,
    );
  }

  // ---------------------------------------------------------------------------
  // Pure aggregation (no side effects -- separated for testability)
  // ---------------------------------------------------------------------------

  /**
   * Aggregate per-developer snapshots into team-level metrics.
   *
   * averageMergeTimeHours (weighted):
   *   Uses pullRequestsMerged as the weight for each developer's average.
   *   Developers with null averageMergeTimeHours (no merged PRs) are excluded
   *   from both numerator and denominator.
   *
   *   Example: dev A merged 10 PRs @ avg 2h, dev B merged 1 PR @ avg 100h.
   *   Simple avg = (2 + 100) / 2 = 51h (misleading).
   *   Weighted avg = (10*2 + 1*100) / (10+1) = 120/11 ≈ 10.9h (correct).
   *
   * activeRepositories:
   *   Union of all developers' activeRepositories, deduplicated.
   *
   * repoFocus:
   *   Sum of per-developer repoFocus counts per repository, sorted descending.
   *   Reflects where the team collectively lands merged code.
   */
  aggregate(snapshots: DeveloperSnapshotInput[]): TeamComputedMetrics {
    if (snapshots.length === 0) {
      return {
        developerCount: 0,
        totalPrsOpened: 0,
        totalPrsMerged: 0,
        totalPrsClosed: 0,
        averageMergeTimeHours: null,
        totalReviewsGiven: 0,
        totalReviewsReceived: 0,
        activeRepositories: [],
        repoFocus: {},
      };
    }

    let totalPrsOpened = 0;
    let totalPrsMerged = 0;
    let totalPrsClosed = 0;
    let totalReviewsGiven = 0;
    let totalReviewsReceived = 0;

    // Weighted merge time
    let weightedMergeTimeSum = 0;
    let mergedWithTimeCount = 0;

    const activeRepoSet = new Set<string>();
    const aggregatedRepoFocus: Record<string, number> = {};

    for (const snap of snapshots) {
      totalPrsOpened += snap.pullRequestsOpened;
      totalPrsMerged += snap.pullRequestsMerged;
      totalPrsClosed += snap.pullRequestsClosed;
      totalReviewsGiven += snap.reviewsGiven;
      totalReviewsReceived += snap.reviewsReceived;

      if (snap.averageMergeTimeHours !== null && snap.pullRequestsMerged > 0) {
        weightedMergeTimeSum += snap.pullRequestsMerged * snap.averageMergeTimeHours;
        mergedWithTimeCount += snap.pullRequestsMerged;
      }

      for (const repo of snap.activeRepositories) {
        activeRepoSet.add(repo);
      }

      for (const [repo, count] of Object.entries(snap.repoFocus)) {
        aggregatedRepoFocus[repo] = (aggregatedRepoFocus[repo] ?? 0) + count;
      }
    }

    const averageMergeTimeHours =
      mergedWithTimeCount > 0 ? weightedMergeTimeSum / mergedWithTimeCount : null;

    const repoFocus = Object.fromEntries(
      Object.entries(aggregatedRepoFocus).sort(([, a], [, b]) => b - a),
    );

    return {
      developerCount: snapshots.length,
      totalPrsOpened,
      totalPrsMerged,
      totalPrsClosed,
      averageMergeTimeHours,
      totalReviewsGiven,
      totalReviewsReceived,
      activeRepositories: Array.from(activeRepoSet),
      repoFocus,
    };
  }
}
