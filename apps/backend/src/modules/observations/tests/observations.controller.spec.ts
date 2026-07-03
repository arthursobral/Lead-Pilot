import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ObservationsController } from '../observations.controller';
import { ObservationsService } from '../observations.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'obs-1',
    developerId: 'dev-1',
    teamLeadId: 'tl-1',
    type: 'CONTEXT',
    severity: 'LOW',
    summary: 'Developer helped unblock a teammate',
    detail: null,
    occurredAt: '2026-06-20T10:00:00.000Z',
    createdAt: '2026-06-20T11:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
    ...overrides,
  };
}

function makePaginated(dtos: ReturnType<typeof makeDto>[] = [makeDto()]) {
  return { data: dtos, total: dtos.length, page: 1, limit: 20 };
}

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

type MockObservationsService = {
  create: jest.Mock;
  getById: jest.Mock;
  listByDeveloper: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

function makeMockService(): MockObservationsService {
  return {
    create: jest.fn(),
    getById: jest.fn(),
    listByDeveloper: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ObservationsController', () => {
  let controller: ObservationsController;
  let service: MockObservationsService;

  beforeEach(async () => {
    service = makeMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservationsController],
      providers: [{ provide: ObservationsService, useValue: service }],
    }).compile();

    controller = module.get<ObservationsController>(ObservationsController);
  });

  // -------------------------------------------------------------------------
  // POST /developers/:developerId/observations
  // -------------------------------------------------------------------------

  describe('create()', () => {
    it('delegates to service.create and returns the result', async () => {
      const dto = makeDto();
      service.create.mockResolvedValue(dto);

      const body = {
        type: 'CONTEXT' as any,
        severity: 'LOW' as any,
        summary: 'Developer helped unblock a teammate',
        occurredAt: '2026-06-20T10:00:00.000Z',
      };

      const result = await controller.create('dev-1', body as any);

      expect(service.create).toHaveBeenCalledWith('dev-1', body);
      expect(result).toBe(dto);
    });

    it('propagates errors from service', async () => {
      service.create.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.create('dev-1', {} as any),
      ).rejects.toThrow('DB error');
    });
  });

  // -------------------------------------------------------------------------
  // GET /developers/:developerId/observations
  // -------------------------------------------------------------------------

  describe('list()', () => {
    it('delegates to service.listByDeveloper and returns the result', async () => {
      const paginated = makePaginated();
      service.listByDeveloper.mockResolvedValue(paginated);

      const result = await controller.list('dev-1', {} as any);

      expect(service.listByDeveloper).toHaveBeenCalledWith('dev-1', {});
      expect(result).toBe(paginated);
    });

    it('forwards query params to service', async () => {
      service.listByDeveloper.mockResolvedValue(makePaginated());

      const query = { type: 'ACHIEVEMENT' as any, severity: 'HIGH' as any, page: 2, limit: 10 };
      await controller.list('dev-1', query as any);

      expect(service.listByDeveloper).toHaveBeenCalledWith('dev-1', query);
    });
  });

  // -------------------------------------------------------------------------
  // GET /developers/:developerId/observations/:id
  // -------------------------------------------------------------------------

  describe('getById()', () => {
    it('delegates to service.getById with both developerId and id', async () => {
      const dto = makeDto();
      service.getById.mockResolvedValue(dto);

      const result = await controller.getById('dev-1', 'obs-1');

      expect(service.getById).toHaveBeenCalledWith('obs-1', 'dev-1');
      expect(result).toBe(dto);
    });

    it('propagates NotFoundException from service', async () => {
      service.getById.mockRejectedValue(new NotFoundException('Observation obs-1 not found'));

      await expect(controller.getById('dev-1', 'obs-1')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /developers/:developerId/observations/:id
  // -------------------------------------------------------------------------

  describe('update()', () => {
    it('delegates to service.update with id, dto, and developerId', async () => {
      const updated = makeDto({ summary: 'New summary' });
      service.update.mockResolvedValue(updated);

      const body = { summary: 'New summary' };
      const result = await controller.update('dev-1', 'obs-1', body as any);

      expect(service.update).toHaveBeenCalledWith('obs-1', body, 'dev-1');
      expect(result).toBe(updated);
    });

    it('propagates NotFoundException from service', async () => {
      service.update.mockRejectedValue(new NotFoundException('Observation obs-1 not found'));

      await expect(
        controller.update('dev-1', 'obs-1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /developers/:developerId/observations/:id
  // -------------------------------------------------------------------------

  describe('delete()', () => {
    it('delegates to service.delete with id and developerId', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete('dev-1', 'obs-1');

      expect(service.delete).toHaveBeenCalledWith('obs-1', 'dev-1');
    });

    it('propagates NotFoundException from service', async () => {
      service.delete.mockRejectedValue(new NotFoundException('Observation obs-1 not found'));

      await expect(controller.delete('dev-1', 'obs-1')).rejects.toThrow(NotFoundException);
    });

    it('returns void (204 No Content)', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('dev-1', 'obs-1');

      expect(result).toBeUndefined();
    });
  });
});
