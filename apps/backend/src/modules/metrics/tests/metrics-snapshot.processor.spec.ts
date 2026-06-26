import { Test, TestingModule } from '@nestjs/testing';
import { MetricsSnapshotProcessor } from '../metrics-snapshot.processor';
import { MetricsService } from '../metrics.service';
import { MetricsRepository } from '../metrics.repository';
import { METRICS_SNAPSHOT_JOB } from '../metrics-snapshot.job';

function makeJob(overrides: { name?: string; data?: { developerId: string } } = {}) {
  return {
    id: 'job-1',
    name: METRICS_SNAPSHOT_JOB,
    data: { developerId: 'dev-123' },
    updateProgress: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('MetricsSnapshotProcessor', () => {
  let processor: MetricsSnapshotProcessor;
  let metricsService: jest.Mocked<MetricsService>;

  const fakeSnapshot = { id: 'snap-abc' } as any;
  const fakePeriodStart = new Date('2026-05-26T00:00:00.000Z');
  const fakePeriodEnd = new Date('2026-06-25T00:00:00.000Z');

  beforeEach(async () => {
    const mockService = {
      calculateForDeveloper: jest.fn().mockResolvedValue(fakeSnapshot),
    } as unknown as jest.Mocked<MetricsService>;

    // Spy on the static method so tests control the period
    jest.spyOn(MetricsService, 'defaultPeriod').mockReturnValue({
      periodStart: fakePeriodStart,
      periodEnd: fakePeriodEnd,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsSnapshotProcessor,
        { provide: MetricsService, useValue: mockService },
        // MetricsRepository is a dep of MetricsService but service is mocked above;
        // provide a stub so NestJS DI is satisfied if it ever resolves the full graph.
        { provide: MetricsRepository, useValue: {} },
      ],
    }).compile();

    processor = module.get<MetricsSnapshotProcessor>(MetricsSnapshotProcessor);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('calls defaultPeriod and calculateForDeveloper with the derived period', async () => {
    const result = await processor.process(makeJob() as any);

    expect(MetricsService.defaultPeriod).toHaveBeenCalledTimes(1);
    expect(metricsService.calculateForDeveloper).toHaveBeenCalledWith(
      'dev-123',
      fakePeriodStart,
      fakePeriodEnd,
    );
    expect(result.snapshotId).toBe('snap-abc');
    expect(result.developerId).toBe('dev-123');
    expect(result.periodStart).toBe(fakePeriodStart.toISOString());
    expect(result.periodEnd).toBe(fakePeriodEnd.toISOString());
  });

  it('reports progress 10% then 30% then 100%', async () => {
    const job = makeJob() as any;
    await processor.process(job);

    expect(job.updateProgress).toHaveBeenCalledWith(10);
    expect(job.updateProgress).toHaveBeenCalledWith(30);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  // -------------------------------------------------------------------------
  // Unknown job name guard
  // -------------------------------------------------------------------------

  it('returns an empty result and skips processing for unknown job names', async () => {
    const result = await processor.process(makeJob({ name: 'unknown.job' }) as any);

    expect(result.snapshotId).toBe('');
    expect(result.developerId).toBe('dev-123');
    expect(metricsService.calculateForDeveloper).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error propagation (retryability)
  // -------------------------------------------------------------------------

  it('re-throws errors so BullMQ can retry the job', async () => {
    metricsService.calculateForDeveloper.mockRejectedValue(new Error('DB down'));

    await expect(processor.process(makeJob() as any)).rejects.toThrow('DB down');
  });
});
