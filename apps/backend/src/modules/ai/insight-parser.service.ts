import { Injectable, Logger } from '@nestjs/common';
import { InsightType } from '@prisma/client';
import type { ParsedInsight, ParsedInsightSet } from './types/ai.types';

// All valid InsightType values -- used for runtime validation of LLM output.
const VALID_INSIGHT_TYPES = new Set<string>(Object.values(InsightType));

/**
 * Phrases that must never appear in AI-generated summaries or talking points.
 * Source of truth: AI_WORKFLOW.md + PRODUCT_BOUNDARIES.md.
 *
 * Violations are logged as warnings; the insight is NOT discarded solely for
 * language violations (zero valid factIds is the only discard trigger).
 * Logging gives operators visibility without over-censoring.
 *
 * Rules for this list:
 *   - Use the shortest form that catches the intent ('better than', not
 *     'better than others') so substring matching is more conservative.
 *   - This list and the system prompt NEVER list must stay in sync.
 *     If you add a phrase here, also add it to PromptBuilderService.buildSystemPrompt().
 */
const PROHIBITED_PHRASES = [
  // Absolute performance judgments
  'underperforming',
  'bad developer',
  'poor performance',

  // Productivity and ranking
  'productivity score',
  'ranked',
  'better than',
  'worse than',

  // Employment outcome suggestions
  'should be promoted',
  'should be removed',
  'should be fired',
  'should be terminated',

  // Verdict language
  'this proves',
];

/**
 * InsightParserService -- pure validation and parsing service.
 *
 * Responsibilities:
 *   1. Parse the raw JSON string returned by the LLM provider.
 *   2. Validate the top-level structure (insights array, required fields).
 *   3. Validate each InsightType against the Prisma enum.
 *   4. Warn (not throw) if prohibited language is detected in summaries
 *      OR in any talking point (ADR-005, AI_WORKFLOW.md, PRODUCT_BOUNDARIES.md).
 *   5. Return a ParsedInsightSet with structurally valid insights.
 *
 * This service does NOT validate factIds -- that is done in InsightsService,
 * which has access to the ContextPack. The parser only validates structure.
 *
 * Throws InsightParseException if:
 *   - The string is not valid JSON
 *   - The top-level structure is missing the insights array
 *   - Every insight item fails structural validation (nothing to return)
 */
@Injectable()
export class InsightParserService {
  private readonly logger = new Logger(InsightParserService.name);

  parse(raw: string): ParsedInsightSet {
    // Step 1: JSON parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InsightParseException(
        `LLM response is not valid JSON. Raw (first 200 chars): ${raw.slice(0, 200)}`,
      );
    }

    // Step 2: top-level structure
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('insights' in parsed) ||
      !Array.isArray((parsed as Record<string, unknown>)['insights'])
    ) {
      throw new InsightParseException(
        'LLM response missing required "insights" array.',
      );
    }

    const rawInsights = (parsed as { insights: unknown[] }).insights;

    // Step 3: validate each item, collect the valid ones
    const validInsights: ParsedInsight[] = [];

    for (let i = 0; i < rawInsights.length; i++) {
      const item = rawInsights[i];
      const result = validateInsightItem(item, i, this.logger);
      if (result !== null) {
        validInsights.push(result);
      }
    }

    if (validInsights.length === 0) {
      throw new InsightParseException(
        `All ${rawInsights.length} insight item(s) failed structural validation.`,
      );
    }

    // Step 4: warn on prohibited language in BOTH summary and talkingPoints.
    // Violations are logged but do not cause discard -- the factId check is
    // the only discard trigger (InsightsService). This gives operators
    // visibility without silently dropping insights that may still be useful.
    for (const insight of validInsights) {
      warnOnProhibitedPhrases(insight.summary, 'summary', this.logger);
      for (const tp of insight.talkingPoints) {
        warnOnProhibitedPhrases(tp, 'talkingPoint', this.logger);
      }
    }

    this.logger.log(`Parsed ${validInsights.length} valid insight(s) from LLM response.`);

    return { insights: validInsights };
  }
}

// ---------------------------------------------------------------------------
// Structural validation helpers
// ---------------------------------------------------------------------------

function validateInsightItem(
  item: unknown,
  index: number,
  logger: Logger,
): ParsedInsight | null {
  if (typeof item !== 'object' || item === null) {
    logger.warn(`Insight[${index}] is not an object -- skipping.`);
    return null;
  }

  const obj = item as Record<string, unknown>;

  // type
  if (typeof obj['type'] !== 'string' || !VALID_INSIGHT_TYPES.has(obj['type'])) {
    logger.warn(
      `Insight[${index}] has invalid type "${String(obj['type'])}" -- skipping. ` +
      `Valid types: ${[...VALID_INSIGHT_TYPES].join(', ')}`,
    );
    return null;
  }

  // summary
  if (typeof obj['summary'] !== 'string' || obj['summary'].trim().length === 0) {
    logger.warn(`Insight[${index}] missing or empty summary -- skipping.`);
    return null;
  }

  // talkingPoints
  const talkingPoints = obj['talkingPoints'];
  if (
    !Array.isArray(talkingPoints) ||
    talkingPoints.some((tp) => typeof tp !== 'string' || tp.trim().length === 0)
  ) {
    logger.warn(`Insight[${index}] has invalid talkingPoints -- skipping.`);
    return null;
  }

  // factIds
  const factIds = obj['factIds'];
  if (!Array.isArray(factIds) || factIds.some((id) => typeof id !== 'string')) {
    logger.warn(`Insight[${index}] has invalid factIds -- skipping.`);
    return null;
  }

  return {
    type: obj['type'] as InsightType,
    summary: obj['summary'].trim(),
    talkingPoints: (talkingPoints as string[]).map((tp) => tp.trim()),
    factIds: factIds as string[],
  };
}

// ---------------------------------------------------------------------------
// Prohibited language helpers
// ---------------------------------------------------------------------------

/**
 * Warn when a text field contains a prohibited phrase.
 * Exported for testing without instantiating the full service.
 */
function warnOnProhibitedPhrases(text: string, field: string, logger: Logger): void {
  const lower = text.toLowerCase();
  const found = PROHIBITED_PHRASES.filter((p) => lower.includes(p));
  if (found.length > 0) {
    logger.warn(
      `Insight ${field} contains potentially prohibited language: [${found.join(', ')}]. ` +
      `Text: "${text.slice(0, 120)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Domain exception
// ---------------------------------------------------------------------------

export class InsightParseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsightParseException';
  }
}

// Export for testing
export { PROHIBITED_PHRASES };
