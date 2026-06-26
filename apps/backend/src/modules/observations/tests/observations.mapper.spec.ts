import { toObservationDto, toPaginatedObservationsResponse } from '../mapper/observations.mapper';

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
    occurredAt: new Date('2026-06-20T10:00:00.000Z'),
    createdAt: new Date('2026-06-20T11:00:00.000Z'),
    updatedAt: new Date('2026-06-20T11:05:00.000Z'),
    deletedAt: null,
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// toObservationDto
// ---------------------------------------------------------------------------

describe('toObservationDto', () => {
  it('maps all scalar fields', () => {
    const dto = toObservationDto(makeObservation());

    expect(dto.id).toBe('obs-1');
    expect(dto.developerId).toBe('dev-1');
    expect(dto.teamLeadId).toBe('tl-1');
    expect(dto.type).toBe('CONTEXT');
    expect(dto.severity).toBe('LOW');
    expect(dto.summary).toBe('Developer helped unblock a teammate');
    expect(dto.detail).toBeNull();
  });

  it('serializes dates to ISO 8601 strings', () => {
    const dto = toObservationDto(makeObservation());

    expect(dto.occurredAt).toBe('2026-06-20T10:00:00.000Z');
    expect(dto.createdAt).toBe('2026-06-20T11:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-06-20T11:05:00.000Z');
    expect(typeof dto.occurredAt).toBe('string');
    expect(typeof dto.createdAt).toBe('string');
    expect(typeof dto.updatedAt).toBe('string');
  });

  it('excludes deletedAt from the DTO', () => {
    const dto = toObservationDto(makeObservation());
    expect(dto).not.toHaveProperty('deletedAt');
  });

  it('preserves non-null detail', () => {
    const dto = toObservationDto(makeObservation({ detail: 'Extended notes about the event' }));
    expect(dto.detail).toBe('Extended notes about the event');
  });

  it('maps ACHIEVEMENT type correctly', () => {
    const dto = toObservationDto(makeObservation({ type: 'ACHIEVEMENT' }));
    expect(dto.type).toBe('ACHIEVEMENT');
  });

  it('maps HIGH severity correctly', () => {
    const dto = toObservationDto(makeObservation({ severity: 'HIGH' }));
    expect(dto.severity).toBe('HIGH');
  });
});

// ---------------------------------------------------------------------------
// toPaginatedObservationsResponse
// ---------------------------------------------------------------------------

describe('toPaginatedObservationsResponse', () => {
  it('maps pagination metadata faithfully', () => {
    const result = toPaginatedObservationsResponse({
      data: [],
      total: 42,
      page: 3,
      limit: 10,
    });

    expect(result.total).toBe(42);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('maps all entries in the data array', () => {
    const result = toPaginatedObservationsResponse({
      data: [makeObservation({ id: 'obs-1' }), makeObservation({ id: 'obs-2' })],
      total: 2,
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('obs-1');
    expect(result.data[1].id).toBe('obs-2');
  });

  it('returns empty data array without throwing', () => {
    const result = toPaginatedObservationsResponse({ data: [], total: 0, page: 1, limit: 20 });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('entries in data are DTOs -- dates are strings, no deletedAt', () => {
    const result = toPaginatedObservationsResponse({
      data: [makeObservation()],
      total: 1,
      page: 1,
      limit: 20,
    });

    const dto = result.data[0];
    expect(typeof dto.occurredAt).toBe('string');
    expect(dto).not.toHaveProperty('deletedAt');
  });
});
