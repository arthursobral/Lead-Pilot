import type { InsightType } from '@prisma/client';
import type { LlmMessage } from './llm.types';

// ---------------------------------------------------------------------------
// Ollama HTTP API types
// ---------------------------------------------------------------------------
// These types model the Ollama /api/chat request and response shapes.
// They are intentionally Ollama-specific and live here (not in llm.types.ts).
// The generic LlmMessage type is imported from llm.types.ts so that the
// chat message shape is defined in one place.

export interface OllamaChatRequest {
  model: string;
  messages: LlmMessage[];
  stream: false;
  format: 'json';
}

export interface OllamaChatResponse {
  model: string;
  message: LlmMessage;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Parsed LLM output -- after JSON parsing, before factId validation
// ---------------------------------------------------------------------------

/**
 * A single insight item as returned by the LLM and parsed by InsightParserService.
 * factIds have not yet been validated against the ContextPack at this stage.
 */
export interface ParsedInsight {
  type: InsightType;
  summary: string;
  talkingPoints: string[];
  factIds: string[];
}

/**
 * Full parsed output from a single LLM call.
 */
export interface ParsedInsightSet {
  insights: ParsedInsight[];
}

// ---------------------------------------------------------------------------
// Validated insight -- after factId validation in InsightsService
// ---------------------------------------------------------------------------

/**
 * An insight that has passed factId validation.
 * validFactIds: subset of the original factIds that exist in the ContextPack.
 * unknownFactIds: original factIds that were not found (logged, never persisted).
 *
 * Invariant: validFactIds.length >= 1 (insights with 0 valid factIds are discarded).
 */
export interface ValidatedInsight {
  type: InsightType;
  summary: string;
  talkingPoints: string[];
  validFactIds: string[];
  unknownFactIds: string[];
}
