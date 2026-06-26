import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObservationsService } from '../observations.service';
import { ObservationsRepository } from '../observations.repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeObservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'obs-1',
    type: 'CONTEXT',
    severity: 'LOW',
    summary: 'Developer helped unblock a teammate',
    detail: null,
    developerId: 'dev-1',
    teamLeadId: 'tl-1',
    occurredAt: new Date('2026-06-20T10:00:00Z'),
    createdAt: new Date('2026-06-20T11:00:00Z'),
    updatedAt: new Date('2026-06-20T11:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeCreateDto(overrides: Record<string, unknown> = {}) {
  return {
    type: 'CONTEXT',
    severity: 'LOW',
    summary: 'Developer helped unblock a teammate',
    occurredAt: '2026-06-20T10:00:00Z',
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ObservationsService', () => {
  let service: ObservationsService;
  let repository: jest.Mocked<ObservationsRepository>;

  beforeEach(async () => {
    const mockRepository = {
      createWithTimelineEntry: jest.fn(),
      findById: jest.fn(),
      findByDeveloper: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      updateTimelineEntry: jest.fn(),
      findAnyTeamLeadId: jest.fn(),
    } as unknown as jest.Mocked<ObservationsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObservationsService,
        { provide: ObservationsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ObservationsService>(ObservationsService);
    repository = module.get(ObservationsRepository);
  });

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------

  describe('create()', () => {
    it('returns a DTO (not raw Prisma entity)', async () => {
      repository.findAnyTeamLeadId.mockResolvedValue('tl-1');
      repository.createWithTimelineEntry.mockResolvedValue(makeObservation() as any);

      const result = await service.create('dev-1', makeCreateDto());

      expect(result).toMatchObject({
        id: 'obs-1',
        type: 'CONTEXT',
        severity: 'LOW',
        summary: 'Developer helped unblock a teammate',
      });
      expect(typeof result.occurredAt).toBe('string');
      expect(typeof result.createdAt).toBe('string');
      expect(result).not.toHaveProperty('deletedAt');
    });

    it('uses explicit teamLeadId from dto when provided', async () => {
      repository.createWithTimelineEntry.mockResolvedValue(makeObservation() as any);

      await service.create('dev-1', makeCreateDto({ teamLeadId: 'tl-explicit' }));

      expect(repository.findAnyTeamLeadId).not.toHaveBeenCalled();
      expect(repository.createWithTimelineEntry).toHaveBeenCalledWith(
        expect.objectContaining({ teamLeadId: 'tl-explicit' }),
        expect.anything(),
      );
    });

    it('falls back to findAnyTeamLeadId when teamLeadId is omitted', async () => {
      repository.findAnyTeamLeadId.mockResolvedValue('tl-fallback');
      repository.createWithTimelineEntry.mockResolvedValue(makeObservation() as any);

      await service.create('dev-1', makeCreateDto());

      expect(repository.findAnyTeamLeadId).toHaveBeenCalled();
      expect(repository.createWithTimelineEntry).toHaveBeenCalledWith(
        expect.objectContaining({ teamLeadId: 'tl-fallback' }),
        expect.anything(),
      );
    });

    it('throws BadRequestException when no teamLeadId and no TeamLead in DB', async () => {
      repository.findAnyTeamLeadId.mockResolvedValue(null);

      await expect(service.create('dev-1', makeCreateDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('maps ACHIEVEMENT type to ACHIEVEMENT timeline entry type', async () => {
      repository.findAnyTeamLeadId.mockResolvedValue('tl-1');
      repository.createWithTimelineEntry.mockResolvedValue(
        makeObservation({ type: 'ACHIEVEMENT' }) as any,
      );

      await service.create('dev-1', makeCreateDto({ type: 'ACHIEVEMENT' }));

      expect(repository.createWithTimelineEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'ACHIEVEMENT' }),
      );
    });

    it('maps non-ACHIEVEMENT types to OBSERVATION timeline entry type', async () => {
      repository.findAnyTeamLeadId.mockResolvedValue('tl-1');

      for (const type of ['CUSTOMER_FEEDBACK', 'CONCERN', 'LEADERSHIP', 'MENTORING', 'INCIDENT']) {
        repository.createWithTimelineEntry.mockResolvedValue(
          makeObservation({ type }) as any,
        );
        repository.createWithTimelineEntry.mockClear();
        await service.create('dev-1', makeCreateDto({ type }));
        expect(repository.createWithTimelineEntry).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ type: 'OBSERVATION' }),
        );
      }
    });

    it('pre-computes timeline summary from type label and observation summary', async () => {
      repository.findAnyTeamLeadId.mockResolvedValue('tl-1');
      repository.createWithTimelineEntry.mockResolvedValue(makeObservation() as any);

      await service.create(
        'dev-1',
        makeCreateDto({
          type: 'CUSTOMER_FEEDBACK',
          summary: 'Customer praised communication',
        }),
      );

      expect(repository.createWithTimelineEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          summary: 'Customer feedback: Customer praised communication',
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getById()
  // -------------------------------------------------------------------------

  describe('getById()', () => {
    it('returns a DTO when found', async () => {
      const obs = makeObservation();
      repository.findById.mockResolvedValue(obs as any);

      const result = await service.getById('obs-1');

      expect(result.id).toBe('obs-1');
      expect(typeof result.occurredAt).toBe('string');
      expect(result).not.toHaveProperty('deletedAt');
    });

    it('passes developerId to repository when provided (ownership check)', async () => {
      repository.findById.mockResolvedValue(makeObservation() as any);

      await service.getById('obs-1', 'dev-1');

      expect(repository.findById).toHaveBeenCalledWith('obs-1', 'dev-1');
    });

    it('passes undefined developerId when not provided', async () => {
      repository.findById.mockResolvedValue(makeObservation() as any);

      await service.getById('obs-1');

      expect(repository.findById).toHaveBeenCalledWith('obs-1', undefined);
    });

    it('throws NotFoundException when observation does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when observation belongs to a different developer', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getById('obs-1', 'wrong-dev')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // listByDeveloper()
  // -------------------------------------------------------------------------

  describe('listByDeveloper()', () => {
    it('returns a paginated DTO response', async () => {
      repository.findByDeveloper.mockResolvedValue({
        data: [makeObservation() as any],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await service.listByDeveloper('dev-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(typeof result.data[0].occurredAt).toBe('string');
      expect(result.data[0]).not.toHaveProperty('deletedAt');
    });

    it('passes pagination defaults to repository', async () => {
      repository.findByDeveloper.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await service.listByDeveloper('dev-1', {});

      expect(repository.findByDeveloper).toHaveBeenCalledWith('dev-1', {
        type: undefined,
        severity: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('forwards type and severity filters to repository', async () => {
      repository.findByDeveloper.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listByDeveloper('dev-1', {
        type: 'ACHIEVEMENT' as any,
        severity: 'HIGH' as any,
        page: 2,
        limit: 10,
      });

      expect(repository.findByDeveloper).toHaveBeenCalledWith('dev-1', {
        type: 'ACHIEVEMENT',
        severity: 'HIGH',
        page: 2,
        limit: 10,
      });
    });
  });

  // -------------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------------

  describe('update()', () => {
    it('returns a DTO after update', async () => {
      const obs = makeObservation({ summary: 'Updated note' });
      repository.findById.mockResolvedValue(obs as any);
      repository.update.mockResolvedValue(obs as any);

      const result = await service.update('obs-1', { summary: 'Updated note' });

      expect(result.summary).toBe('Updated note');
      expect(typeof result.occurredAt).toBe('string');
      expect(result).not.toHaveProperty('deletedAt');
    });

    it('throws NotFoundException when observation does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('missing', { summary: 'new' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('passes developerId to getById for ownership validation', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('obs-1', { summary: 'x' }, 'dev-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findById).toHaveBeenCalledWith('obs-1', 'dev-1');
    });

    it('propagates updated summary AND type to the timeline entry', async () => {
      const obs = makeObservation({ type: 'MENTORING', summary: 'Updated note' });
      repository.findById.mockResolvedValue(obs as any);
      repository.update.mockResolvedValue(obs as any);

      await service.update('obs-1', { summary: 'Updated note' });

      expect(repository.updateTimelineEntry).toHaveBeenCalledWith('obs-1', {
        summary: 'Mentoring: Updated note',
        type: 'OBSERVATION',
      });
    });

    it('sets timeline type to ACHIEVEMENT when observation type is ACHIEVEMENT', async () => {
      const obs = makeObservation({ type: 'ACHIEVEMENT', summary: 'Shipped the feature' });
      repository.findById.mockResolvedValue(obs as any);
      repository.update.mockResolvedValue(obs as any);

      await service.update('obs-1', { type: 'ACHIEVEMENT' as any });

      expect(repository.updateTimelineEntry).toHaveBeenCalledWith('obs-1', {
        summary: 'Achievement: Shipped the feature',
        type: 'ACHIEVEMENT',
      });
    });

    it('sets timeline type to OBSERVATION when type changes away from ACHIEVEMENT', async () => {
      const obs = makeObservation({ type: 'CONCERN', summary: 'Note about communication' });
      repository.findById.mockResolvedValue(obs as any);
      repository.update.mockResolvedValue(obs as any);

      await service.update('obs-1', { type: 'CONCERN' as any });

      expect(repository.updateTimelineEntry).toHaveBeenCalledWith('obs-1', {
        summary: 'Concern: Note about communication',
        type: 'OBSERVATION',
      });
    });

    it('does not update timeline entry when neither summary nor type changed', async () => {
      const obs = makeObservation();
      repository.findById.mockResolvedValue(obs as any);
      repository.update.mockResolvedValue(obs as any);

      await service.update('obs-1', { severity: 'HIGH' as any });

      expect(repository.updateTimelineEntry).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  describe('delete()', () => {
    it('soft deletes the observation', async () => {
      repository.findById.mockResolvedValue(makeObservation() as any);
      repository.softDelete.mockResolvedValue(undefined);

      await service.delete('obs-1');

      expect(repository.softDelete).toHaveBeenCalledWith('obs-1');
    });

    it('throws NotFoundException when observation does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
    });

    it('passes developerId to getById for ownership validation', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete('obs-1', 'dev-1')).rejects.toThrow(NotFoundException);

      expect(repository.findById).toHaveBeenCalledWith('obs-1', 'dev-1');
    });
  });

  // -------------------------------------------------------------------------
  // buildTimelineSummary() -- pure function
  // -------------------------------------------------------------------------

  describe('buildTimelineSummary()', () => {
    it('formats summary with the correct type label', () => {
      expect(service.buildTimelineSummary('CUSTOMER_FEEDBACK' as any, 'Praised call handling'))
        .toBe('Customer feedback: Praised call handling');
      expect(service.buildTimelineSummary('INCIDENT' as any, 'Led production incident'))
        .toBe('Incident: Led production incident');
      expect(service.buildTimelineSummary('ACHIEVEMENT' as any, 'Delivered migration solo'))
        .toBe('Achievement: Delivered migration solo');
    });

    it('falls back to the raw type string for unknown types', () => {
      expect(service.buildTimelineSummary('UNKNOWN_TYPE' as any, 'Some context'))
        .toBe('UNKNOWN_TYPE: Some context');
    });
  });
});
