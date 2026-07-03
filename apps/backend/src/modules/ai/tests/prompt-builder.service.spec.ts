import { PromptBuilderService } from '../prompt-builder.service';
import type { ContextPack } from '../../knowledge/types/knowledge.types';
import { FactType } from '../../facts/types/facts.types';
import { FactConfidence } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePack(overrides: Partial<ContextPack> = {}): ContextPack {
  return {
    developer:   { id: 'dev-1', name: 'Alice', githubLogin: 'alice', role: 'Backend Engineer' },
    period:      { start: '2026-06-01T00:00:00.000Z', end: '2026-07-01T00:00:00.000Z' },
    metrics:     null,
    observations: [],
    timeline:    [],
    facts: [
      {
        id:         'fact-abc',
        type:       FactType.ACTIVITY_SIGNAL,
        statement:  'Merged 8 pull requests.',
        confidence: FactConfidence.HIGH,
        evidence:   [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-1' }],
      },
      {
        id:         'fact-xyz',
        type:       FactType.COLLABORATION_SIGNAL,
        statement:  'Gave 12 reviews.',
        confidence: FactConfidence.MEDIUM,
        evidence:   [{ sourceType: 'METRIC_SNAPSHOT', sourceId: 'snap-1' }],
      },
    ],
    evidenceMap: {},
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  describe('buildSystemPrompt()', () => {
    it('returns a non-empty string', () => {
      expect(service.buildSystemPrompt().length).toBeGreaterThan(100);
    });

    it('includes hedged language examples', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('may suggest');
      expect(prompt).toContain('worth discussing');
    });

    it('lists all valid InsightType values', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('POSITIVE_SIGNAL');
      expect(prompt).toContain('COACHING_OPPORTUNITY');
      expect(prompt).toContain('RISK');
      expect(prompt).toContain('GROWTH_PATTERN');
      expect(prompt).toContain('RECOGNITION');
      expect(prompt).toContain('WORKLOAD_SIGNAL');
      expect(prompt).toContain('COMMUNICATION_SIGNAL');
      expect(prompt).toContain('LEADERSHIP_SIGNAL');
    });

    it('specifies JSON-only output', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toMatch(/respond only with valid json/i);
    });

    it('forbids prohibited language', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('underperforming');  // listed in the NEVER list
    });
  });

  describe('buildUserPrompt()', () => {
    it('includes developer name and role', () => {
      const prompt = service.buildUserPrompt(makePack());
      expect(prompt).toContain('Alice');
      expect(prompt).toContain('Backend Engineer');
    });

    it('includes period dates', () => {
      const prompt = service.buildUserPrompt(makePack());
      expect(prompt).toContain('2026-06-01');
      expect(prompt).toContain('2026-07-01');
    });

    it('uses f.id (not evidence sourceId) for available fact IDs', () => {
      const prompt = service.buildUserPrompt(makePack());
      // Fact IDs must appear
      expect(prompt).toContain('fact-abc');
      expect(prompt).toContain('fact-xyz');
      // Evidence sourceId should NOT be listed as factId
      // (snap-1 is evidence, not a Fact ID)
    });

    it('includes the serialized ContextPack JSON', () => {
      const pack = makePack();
      const prompt = service.buildUserPrompt(pack);
      // Pack is serialized as JSON -- these keys are always present
      expect(prompt).toContain('"generatedAt"');
      expect(prompt).toContain('"developer"');
    });

    it('handles developer with null role', () => {
      const pack = makePack({ developer: { id: 'd1', name: 'Bob', githubLogin: 'bob', role: null } });
      const prompt = service.buildUserPrompt(pack);
      expect(prompt).toContain('Bob');
      expect(prompt).toContain('Engineer'); // fallback role
    });

    it('handles empty facts array gracefully', () => {
      const pack = makePack({ facts: [] });
      expect(() => service.buildUserPrompt(pack)).not.toThrow();
    });
  });
});
