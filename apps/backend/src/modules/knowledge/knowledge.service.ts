import { Injectable } from '@nestjs/common';
import { DevelopersService } from '../developers/developers.service';
import { MetricsService } from '../metrics/metrics.service';
import { ObservationsRepository } from '../observations/observations.repository';
import { TimelineRepository } from '../timeline/timeline.repository';
import { FactsService } from '../facts/facts.service';
import { ContextBuilderService } from './context-builder.service';
import type { ContextPackResponseDto } from './dto/context-pack-response.dto';

/**
 * KnowledgeService -- the Knowledge Engine assembly layer.
 *
 * Responsibility (post Context Builder refactor):
 *   buildContextPack() -- fetch all domain data for a period, then delegate
 *   assembly to ContextBuilderService. The AI layer (Day 6) consumes the pack.
 *
 * Fact generation and listing are delegated to FactsService (FactsModule).
 * ContextPack assembly logic lives in ContextBuilderService (pure, testable).
 *
 * Architecture (ADR-004):
 *   - This is the only component that prepares AI context.
 *   - No LLM calls here -- pure data fetching and delegation.
 *   - Call FactsService.generate() before buildContextPack() to ensure facts
 *     are current for the period.
 */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly developersService: DevelopersService,
    private readonly metricsService: MetricsService,
    private readonly observationsRepository: ObservationsRepository,
    private readonly timelineRepository: TimelineRepository,
    private readonly factsService: FactsService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  /**
   * Build a dynamic ContextPack for AI consumption.
   *
   * Fetches developer profile, MetricSnapshot, Observations, TimelineEntries,
   * and stored Facts for the period, then assembles them into a structured
   * ContextPack via ContextBuilderService.
   *
   * The pack is assembled fresh on every call -- never persisted.
   * Call FactsService.generate() first to ensure Facts are current.
   */
  async buildContextPack(
    developerId: string,
    teamLeadId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ContextPackResponseDto> {
    const developer = await this.developersService.findById(developerId, teamLeadId);

    const [snapshot, observations, timelineEntries, facts] = await Promise.all([
      this.metricsService.getSnapshotForPeriod(developerId, periodStart, periodEnd),
      this.observationsRepository.findAllByDeveloperAndPeriod(developerId, periodStart, periodEnd),
      this.timelineRepository.findByDeveloperAndPeriod(developerId, periodStart, periodEnd),
      this.factsService.findByPeriod(developerId, periodStart, periodEnd),
    ]);

    return this.contextBuilder.build({
      developer: {
        id: developer.id,
        name: developer.name,
        githubLogin: developer.githubLogin,
        role: developer.role ?? null,
      },
      period: { start: periodStart, end: periodEnd },
      snapshot,
      observations,
      timelineEntries,
      facts,
    });
  }
}
