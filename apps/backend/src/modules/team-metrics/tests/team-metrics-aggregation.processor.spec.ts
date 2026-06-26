import { Test, TestingModule } from '@nestjs/testing';
import { TeamMetricsAggregationProcessor } from '../team-metrics-aggregation.processor';
import { TeamMetricsService } from '../team-metrics.service';
import { TeamMetricsRepository } from '../team-metrics.repository';
import { TEAM_METRICS_AGGREGATION_JOB } from '../team-metrics-aggregation.job';

function makeJob(overrides: {
  name?: string;
  data?: { teamLeadId: string; periodStart: string; periodEnd: string };
} = {}) {
  return {
    id: 'job-1',
    name: TEAM_METRICS_AGGREGATION_JOB,
    data: {
      teamLeadId: 'tl-xyz',
      periodStart: '2026-05-25T00:00:00.000Z',
      periodEnd: '2026-06-24T00:00:00.000Z',
    },
    updateProgress: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('TeamMetricsAggregationProcessor', () => {
  let processor: TeamMetricsAggregationProcessor;
  let teamMetricsService: jest.Mocked<TeamMetricsService>;

  const fakeSnapshot = { id: 'ts-1', developerCount: 3 } as any;

  beforeEach(async () => {
    const mockService = {
      calculateForTeam: jest.fn().mockResolvedValue(fakeSnapshot),
    } as unknown as jest.Mocked<TeamMetricsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMetricsAggregationProcessor,
        { provide: TeamMetricsService, useValue: mockService },
        { provide: TeamMetricsRepository, useValue: {} },
      ],
    }).compile();

    processor = module.get<TeamMetricsAggregationProcessor>(TeamMetricsAggregationProcessor);
    teamMetricsService = module.get(TeamMetricsService);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('calls calculateForTeam with parsed Dates and returns result', async () => {
    const result = await processor.process(makeJob() as any);

    expect(teamMetricsService.calculateForTeam).toHaveBeenCalledWith(
      'tl-xyz',
      new Date('2026-05-25T00:00:00.000Z'),
      new Date('2026-06-24T00:00:00.000Z'),
    );
    expect(result.snapshotId).toBe('ts-1');
    expect(result.developerCount).toBe(3);
    expect(result.teamLeadId).toBe('tl-xyz');
  });

  it('reports progress 10% then 100%', async () => {
    const job = makeJob() as any;
    await processor.process(job);
    expect(job.updateProgress).toHaveBeenCalledWith(10);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  // -------------------------------------------------------------------------
  // Unknown job name guard
  // -------------------------------------------------------------------------

  it('returns an empty result and skips processing for unknown job names', async () => {
    const result = await processor.process(makeJob({ name: 'unknown.job' }) as any);
    expect(result.snapshotId).toBe('');
    expect(result.developerCount).toBe(0);
    expect(teamMetricsService.calculateForTeam).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error propagation (retryability)
  // -------------------------------------------------------------------------

  it('re-throws errors so BullMQ can retry the job', async () => {
    teamMetricsService.calculateForTeam.mockRejectedValue(new Error('DB down'));
    await expect(processor.process(makeJob() as any)).rejects.toThrow('DB down');
  });
});
