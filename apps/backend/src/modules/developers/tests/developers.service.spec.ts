import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Developer } from '@prisma/client';
import type { DeveloperResponseDto } from '../dto/developer-response.dto';
import type { ListDevelopersQueryDto } from '../dto/list-developers-query.dto';
import { DevelopersRepository } from '../developers.repository';
import { DevelopersService } from '../developers.service';
import { DeveloperMapper } from '../mapper/developer.mapper';
import type { DeveloperDomain } from '../types/developer.types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEAM_LEAD_ID = 'tl_test_001';

const mockPrismaRecord: Developer = {
  id: 'dev_001',
  githubId: 'gh_001',
  githubLogin: 'alice',
  name: 'Alice Dev',
  email: 'alice@example.com',
  avatarUrl: 'https://avatars.githubusercontent.com/alice',
  role: 'Backend Engineer',
  metadata: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockDomain: DeveloperDomain = {
  id: 'dev_001',
  githubId: 'gh_001',
  githubLogin: 'alice',
  name: 'Alice Dev',
  email: 'alice@example.com',
  avatarUrl: 'https://avatars.githubusercontent.com/alice',
  role: 'Backend Engineer',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockResponse: DeveloperResponseDto = {
  id: 'dev_001',
  githubLogin: 'alice',
  name: 'Alice Dev',
  email: 'alice@example.com',
  avatarUrl: 'https://avatars.githubusercontent.com/alice',
  role: 'Backend Engineer',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockRepository = () => ({
  findAllByTeamLead: jest.fn(),
  findByIdForTeamLead: jest.fn(),
  upsertWithTeamLead: jest.fn(),
  findByGithubId: jest.fn(),
});

const mockMapper = () => ({
  toDomain: jest.fn().mockReturnValue(mockDomain),
  toResponse: jest.fn().mockReturnValue(mockResponse),
  toResponseList: jest.fn().mockReturnValue([mockResponse]),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DevelopersService', () => {
  let service: DevelopersService;
  let repository: ReturnType<typeof mockRepository>;
  let mapper: ReturnType<typeof mockMapper>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevelopersService,
        { provide: DevelopersRepository, useFactory: mockRepository },
        { provide: DeveloperMapper, useFactory: mockMapper },
      ],
    }).compile();

    service = module.get(DevelopersService);
    repository = module.get(DevelopersRepository);
    mapper = module.get(DeveloperMapper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('returns a paginated response with mapped developers', async () => {
      repository.findAllByTeamLead.mockResolvedValue({
        developers: [mockPrismaRecord],
        total: 1,
      });

      const query: ListDevelopersQueryDto = { page: 1, limit: 20 };
      const result = await service.findAll(TEAM_LEAD_ID, query);

      expect(repository.findAllByTeamLead).toHaveBeenCalledWith(
        TEAM_LEAD_ID,
        1,
        20,
      );
      expect(mapper.toDomain).toHaveBeenCalledWith(mockPrismaRecord);
      expect(mapper.toResponseList).toHaveBeenCalledWith([mockDomain]);

      expect(result).toEqual({
        data: [mockResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('returns an empty paginated response when the team has no developers', async () => {
      repository.findAllByTeamLead.mockResolvedValue({
        developers: [],
        total: 0,
      });
      mapper.toResponseList.mockReturnValue([]);

      const query: ListDevelopersQueryDto = { page: 1, limit: 20 };
      const result = await service.findAll(TEAM_LEAD_ID, query);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('falls back to page=1 limit=20 when query is empty', async () => {
      repository.findAllByTeamLead.mockResolvedValue({
        developers: [],
        total: 0,
      });
      mapper.toResponseList.mockReturnValue([]);

      await service.findAll(TEAM_LEAD_ID, {});

      expect(repository.findAllByTeamLead).toHaveBeenCalledWith(
        TEAM_LEAD_ID,
        1,
        20,
      );
    });

    it('calculates totalPages correctly for non-round divisions', async () => {
      repository.findAllByTeamLead.mockResolvedValue({
        developers: [mockPrismaRecord],
        total: 25,
      });
      mapper.toResponseList.mockReturnValue([mockResponse]);

      const result = await service.findAll(TEAM_LEAD_ID, { page: 1, limit: 10 });

      // ceil(25 / 10) = 3
      expect(result.totalPages).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('returns a developer response when found and authorized', async () => {
      repository.findByIdForTeamLead.mockResolvedValue(mockPrismaRecord);

      const result = await service.findById('dev_001', TEAM_LEAD_ID);

      expect(repository.findByIdForTeamLead).toHaveBeenCalledWith(
        'dev_001',
        TEAM_LEAD_ID,
      );
      expect(mapper.toDomain).toHaveBeenCalledWith(mockPrismaRecord);
      expect(mapper.toResponse).toHaveBeenCalledWith(mockDomain);
      expect(result).toEqual(mockResponse);
    });

    it('throws NotFoundException when the developer is not found', async () => {
      repository.findByIdForTeamLead.mockResolvedValue(null);

      await expect(service.findById('dev_unknown', TEAM_LEAD_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when developer exists but belongs to another team lead', async () => {
      // The repository returns null for both cases (not found + not authorized)
      // to avoid leaking whether a developer ID exists.
      repository.findByIdForTeamLead.mockResolvedValue(null);

      await expect(
        service.findById('dev_001', 'tl_other'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // upsert
  // -------------------------------------------------------------------------

  describe('upsert', () => {
    const createDto = {
      githubId: 'gh_001',
      githubLogin: 'alice',
      name: 'Alice Dev',
      email: 'alice@example.com',
      avatarUrl: 'https://avatars.githubusercontent.com/alice',
      role: 'Backend Engineer',
    };

    it('creates a new developer and returns the response', async () => {
      repository.upsertWithTeamLead.mockResolvedValue(mockPrismaRecord);

      const result = await service.upsert(createDto, TEAM_LEAD_ID);

      expect(repository.upsertWithTeamLead).toHaveBeenCalledWith(
        {
          githubId: 'gh_001',
          githubLogin: 'alice',
          name: 'Alice Dev',
          email: 'alice@example.com',
          avatarUrl: 'https://avatars.githubusercontent.com/alice',
          role: 'Backend Engineer',
        },
        TEAM_LEAD_ID,
      );
      expect(result).toEqual(mockResponse);
    });

    it('passes undefined optional fields through to the repository', async () => {
      repository.upsertWithTeamLead.mockResolvedValue(mockPrismaRecord);

      const minimalDto = {
        githubId: 'gh_002',
        githubLogin: 'bob',
        name: 'Bob Dev',
      };

      await service.upsert(minimalDto, TEAM_LEAD_ID);

      expect(repository.upsertWithTeamLead).toHaveBeenCalledWith(
        expect.objectContaining({
          githubId: 'gh_002',
          githubLogin: 'bob',
          name: 'Bob Dev',
          email: undefined,
          avatarUrl: undefined,
          role: undefined,
        }),
        TEAM_LEAD_ID,
      );
    });

    it('propagates repository errors without swallowing them', async () => {
      repository.upsertWithTeamLead.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(service.upsert(createDto, TEAM_LEAD_ID)).rejects.toThrow(
        'DB connection lost',
      );
    });
  });
});
