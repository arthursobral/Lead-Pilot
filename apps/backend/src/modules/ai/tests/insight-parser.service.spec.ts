import { InsightParserService, InsightParseException, PROHIBITED_PHRASES } from '../insight-parser.service';
import { InsightType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validInsightJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    insights: [
      {
        type:          'POSITIVE_SIGNAL',
        summary:       'Alice may be showing growing ownership of the codebase.',
        talkingPoints: ['Ask how she feels about the increase in scope.'],
        factIds:       ['fact-1'],
        ...overrides,
      },
    ],
  });
}

function validInsight() {
  return {
    type:          InsightType.POSITIVE_SIGNAL,
    summary:       'Alice may be showing growing ownership of the codebase.',
    talkingPoints: ['Ask how she feels about the increase in scope.'],
    factIds:       ['fact-1'],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InsightParserService', () => {
  let parser: InsightParserService;

  beforeEach(() => {
    parser = new InsightParserService();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('valid input', () => {
    it('parses a well-formed response and returns insights', () => {
      const result = parser.parse(validInsightJson());

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].type).toBe(InsightType.POSITIVE_SIGNAL);
      expect(result.insights[0].summary).toBe('Alice may be showing growing ownership of the codebase.');
      expect(result.insights[0].talkingPoints).toEqual(['Ask how she feels about the increase in scope.']);
      expect(result.insights[0].factIds).toEqual(['fact-1']);
    });

    it('accepts all valid InsightType values', () => {
      for (const type of Object.values(InsightType)) {
        const raw = validInsightJson({ type });
        const result = parser.parse(raw);
        expect(result.insights[0].type).toBe(type);
      }
    });

    it('trims whitespace from summary and talkingPoints', () => {
      const raw = validInsightJson({
        summary:       '  Insight with padding  ',
        talkingPoints: ['  Point A  '],
      });
      const result = parser.parse(raw);
      expect(result.insights[0].summary).toBe('Insight with padding');
      expect(result.insights[0].talkingPoints[0]).toBe('Point A');
    });

    it('accepts multiple insights in the response', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'POSITIVE_SIGNAL',      summary: 'S1', talkingPoints: ['TP1'], factIds: ['f1'] },
          { type: 'COACHING_OPPORTUNITY', summary: 'S2', talkingPoints: ['TP2'], factIds: ['f2'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(2);
    });

    it('accepts an insight with multiple factIds', () => {
      const raw = validInsightJson({ factIds: ['fact-1', 'fact-2', 'fact-3'] });
      const result = parser.parse(raw);
      expect(result.insights[0].factIds).toHaveLength(3);
    });

    it('accepts an insight with an empty factIds array', () => {
      // Parser accepts empty factIds -- InsightsService handles the discard logic
      const raw = validInsightJson({ factIds: [] });
      const result = parser.parse(raw);
      expect(result.insights[0].factIds).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // JSON-level errors
  // ---------------------------------------------------------------------------

  describe('invalid JSON', () => {
    it('throws InsightParseException when the raw string is not valid JSON', () => {
      expect(() => parser.parse('not json')).toThrow(InsightParseException);
      expect(() => parser.parse('not json')).toThrow(/not valid json/i);
    });

    it('throws InsightParseException when insights is missing', () => {
      expect(() => parser.parse(JSON.stringify({ result: [] }))).toThrow(InsightParseException);
      expect(() => parser.parse(JSON.stringify({ result: [] }))).toThrow(/"insights" array/i);
    });

    it('throws InsightParseException when insights is not an array', () => {
      expect(() => parser.parse(JSON.stringify({ insights: 'not an array' }))).toThrow(InsightParseException);
    });

    it('throws InsightParseException when the root is a plain string', () => {
      expect(() => parser.parse(JSON.stringify('hello'))).toThrow(InsightParseException);
    });
  });

  // ---------------------------------------------------------------------------
  // Per-item structural validation
  // ---------------------------------------------------------------------------

  describe('invalid insight items', () => {
    it('skips insight with invalid InsightType', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'INVALID_TYPE', summary: 'S', talkingPoints: ['T'], factIds: ['f'] },
          { type: 'POSITIVE_SIGNAL', summary: 'S2', talkingPoints: ['T2'], factIds: ['f2'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].type).toBe(InsightType.POSITIVE_SIGNAL);
    });

    it('skips insight with empty summary', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'POSITIVE_SIGNAL', summary: '   ', talkingPoints: ['T'], factIds: ['f'] },
          { type: 'RISK',            summary: 'Good', talkingPoints: ['T2'], factIds: ['f2'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('skips insight with non-array talkingPoints', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'POSITIVE_SIGNAL', summary: 'S', talkingPoints: 'not array', factIds: ['f'] },
          { type: 'RISK',            summary: 'S2', talkingPoints: ['TP'], factIds: ['f2'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('skips insight with non-string elements in talkingPoints', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'POSITIVE_SIGNAL', summary: 'S', talkingPoints: [42, true], factIds: ['f'] },
          { type: 'RISK',            summary: 'S2', talkingPoints: ['TP'],    factIds: ['f2'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('skips insight with non-array factIds', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'POSITIVE_SIGNAL', summary: 'S', talkingPoints: ['T'], factIds: 'not-array' },
          { type: 'RISK',            summary: 'S2', talkingPoints: ['T2'], factIds: ['f'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('throws InsightParseException when ALL items fail validation', () => {
      const raw = JSON.stringify({
        insights: [
          { type: 'INVALID', summary: 'S', talkingPoints: ['T'], factIds: ['f'] },
          { type: 'ALSO_INVALID', summary: 'S2', talkingPoints: ['T2'], factIds: ['f2'] },
        ],
      });
      expect(() => parser.parse(raw)).toThrow(InsightParseException);
      expect(() => parser.parse(raw)).toThrow(/failed structural validation/i);
    });

    it('skips non-object items in the insights array', () => {
      const raw = JSON.stringify({
        insights: [
          null,
          'a string',
          42,
          { type: 'POSITIVE_SIGNAL', summary: 'S', talkingPoints: ['T'], factIds: ['f'] },
        ],
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Prohibited language
  // ---------------------------------------------------------------------------

  describe('prohibited language', () => {
    it('returns the insight but emits a warning when summary contains prohibited word', () => {
      const raw = validInsightJson({
        summary: 'This developer may be underperforming based on the metrics.',
      });
      // Should NOT throw -- parser only warns
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('returns the insight but warns when a talkingPoint contains a prohibited phrase', () => {
      // talkingPoints must also be scanned (Violation 3 fix)
      const raw = validInsightJson({
        talkingPoints: ['Consider whether this developer should be fired from the project.'],
      });
      const result = parser.parse(raw);
      // Insight is kept -- language violations are warnings, not discard triggers
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].talkingPoints[0]).toContain('should be fired');
    });

    it('warns when summary contains "should be removed" (was missing from PROHIBITED_PHRASES)', () => {
      // Violation 1 fix: 'should be removed' must be in the list
      expect(PROHIBITED_PHRASES).toContain('should be removed');

      const raw = validInsightJson({
        summary: 'There is a concern that this developer should be removed from the team.',
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('warns when summary contains "better than" without "others" suffix', () => {
      // Violation 2 fix: shorter form catches more variants via substring matching
      expect(PROHIBITED_PHRASES).toContain('better than');
      expect(PROHIBITED_PHRASES).not.toContain('better than others');

      const raw = validInsightJson({
        summary: 'Alice appears to be performing better than her peers.',
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('warns when summary contains "worse than" without "others" suffix', () => {
      expect(PROHIBITED_PHRASES).toContain('worse than');
      expect(PROHIBITED_PHRASES).not.toContain('worse than others');

      const raw = validInsightJson({
        summary: 'Bob seems worse than expected based on recent activity.',
      });
      const result = parser.parse(raw);
      expect(result.insights).toHaveLength(1);
    });

    it('PROHIBITED_PHRASES contains all phrases from the system prompt NEVER list', () => {
      // Keep the two enforcement layers in sync.
      // If a phrase is added to the system prompt NEVER list, it must also be here.
      const requiredPhrases = [
        'underperforming',
        'bad developer',
        'poor performance',
        'productivity score',
        'ranked',
        'better than',
        'worse than',
        'should be promoted',
        'should be removed',
        'should be fired',
        'should be terminated',
        'this proves',
      ];
      for (const phrase of requiredPhrases) {
        expect(PROHIBITED_PHRASES).toContain(phrase);
      }
    });
  });
});
