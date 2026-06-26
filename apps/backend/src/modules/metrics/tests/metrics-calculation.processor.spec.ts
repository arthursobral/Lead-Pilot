import { Test, TestingModule } from '@nestjs/testing';
import { MetricsCalculationProcessor } from '../metrics-calculation.processor';
import { MetricsService } from '../metrics.service';
import { METRICS_CALCULATION_JOB } from '../metrics-calculation.job';

function makeJob(overrides: { name?: string } = {}) {
  return {
    id: 'job-1',
    name: METRICS_CALCULATION_JOB,
    data: {
      developerId: 'dev-123',
      periodStart: '2026-05-25T00:00:00.000Z',
      periodEnd: '2026-06-24T00:00:00.000Z',
    },
    updateProgress: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('MetricsCalculationProcessor', () => {
  let processor: MetricsCalculationProcessor;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    const mockService = {
      calculateForDeveloper: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCalculationProcessor,
        { provide: MetricsService, useValue: mockService },
      ],
    }).compile();

    processor = module.get<MetricsCalculationProcessor>(MetricsCalculationProcessor);
    metricsService = module.get(MetricsService);
  });

  it('calls calculateForDeveloper with correct Date args and returns snapshotId', async () => {
    metricsService.calculateForDeveloper.mockResolvedValue({ id: 'snap-abc' } as any);
    const job = makeJob();

    const result = await processor.process(job as any);

    expect(metricsService.calculateForDeveloper).toHaveBeenCalledWith(
      'dev-123',
      new Date('2026-05-25T00:00:00.000Z'),
      new Date('2026-06-24T00:00:00.000Z'),
    );
    expect(result.snapshotId).toBe('snap-abc');
  });

  it('updates progress to 10 before and 100 after calculation', async () => {
    metricsService.calculateForDeveloper.mockResolvedValue({ id: 'snap-1' } as any);
    const job = makeJob();

    await processor.process(job as any);

    expect(job.updateProgress).toHaveBeenCalledWith(10);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  it('returns empty result without calling service for unknown job names', async () => {
    const job = makeJob({ name: 'unknown.job' });
    const result = await processor.process(job as any);

    expect(metricsService.calculateForDeveloper).not.toHaveBeenCalled();
    expect(result.snapshotId).toBe('');
  });

  it('re-throws errors so BullMQ can retry', async () => {
    metricsService.calculateForDeveloper.mockRejectedValue(new Error('DB down'));
    await expect(processor.process(makeJob() as any)).rejects.toThrow('DB down');
  });
});
