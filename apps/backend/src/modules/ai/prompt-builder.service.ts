import { Injectable } from '@nestjs/common';
import type { ContextPack } from '../knowledge/types/knowledge.types';

/**
 * PromptBuilderService -- pure transformation service.
 *
 * Converts a ContextPack into the system and user prompts sent to the LLM.
 * Contains no HTTP calls, no Prisma access, and no side effects -- fully
 * testable with plain fixture objects.
 *
 * Language rules embedded in the system prompt (AI_WORKFLOW.md):
 *   - Hedged language: "may suggest", "one possible interpretation", "worth discussing"
 *   - Prohibited: absolute verdicts, rankings, scores, productivity claims
 *   - Output must be valid JSON matching the prescribed schema
 *
 * The NEVER list in buildSystemPrompt() must stay in sync with PROHIBITED_PHRASES
 * in InsightParserService. Both layers defend against unsafe output.
 */
@Injectable()
export class PromptBuilderService {
  /**
   * Build the system prompt that defines the model role, language rules,
   * and exact JSON output schema.
   */
  buildSystemPrompt(): string {
    return `You are a coaching assistant for engineering team leads.
Your role is to help team leads prepare for 1:1 conversations with their developers.
You generate structured coaching insights based on evidence from the developer context provided.

LANGUAGE RULES (mandatory):
- Use hedged, careful language at all times.
- Preferred phrases: "may suggest", "one possible interpretation is", "worth discussing", "based on the available context", "there may be an opportunity to".
- Never use: "underperforming", "bad developer", "poor performance", "productivity score", "ranked", "better than", "worse than", "should be promoted", "should be removed", "should be fired", "should be terminated", "this proves".
- Present insights as hypotheses, not verdicts.
- Be supportive and specific. Avoid generic statements.

OUTPUT FORMAT:
Respond ONLY with valid JSON. No explanations outside the JSON.
Use this exact schema:

{
  "insights": [
    {
      "type": "<InsightType>",
      "summary": "<string, max 300 chars, hedged language>",
      "talkingPoints": ["<string>", "<string>"],
      "factIds": ["<factId from the context>"]
    }
  ]
}

Valid InsightType values:
POSITIVE_SIGNAL, COACHING_OPPORTUNITY, RISK, GROWTH_PATTERN, RECOGNITION,
WORKLOAD_SIGNAL, COMMUNICATION_SIGNAL, LEADERSHIP_SIGNAL

RULES:
- Generate between 2 and 5 insights.
- Every insight MUST reference at least one factId from the facts array in the context.
- Use only factIds that appear in the provided context. Do not invent factIds.
- Each insight should have 1 to 3 talking points.
- Talking points must be actionable and specific to the evidence.`;
  }

  /**
   * Build the user prompt containing the serialized ContextPack.
   * The ContextPack is the sole input to the LLM -- no raw DB entities.
   */
  buildUserPrompt(pack: ContextPack): string {
    const name        = pack.developer.name;
    const role        = pack.developer.role ?? 'Engineer';
    const periodStart = pack.period.start.slice(0, 10);
    const periodEnd   = pack.period.end.slice(0, 10);

    // Build a compact fact reference list so the model can use factIds correctly.
    // Uses f.id (the Fact database ID) so the model references real Fact IDs.
    const factSummary = pack.facts
      .map((f) => `  - id: ${f.id} | type: ${f.type} | "${f.statement}" (confidence: ${f.confidence})`)
      .join('\n');

    // Explicit list of valid factIds for the model to choose from.
    const factIdList = pack.facts.map((f) => f.id);

    return `Developer: ${name} (${role})
Period: ${periodStart} to ${periodEnd}

=== FULL CONTEXT PACK ===
${JSON.stringify(pack, null, 2)}

=== AVAILABLE FACT IDs (use these in your factIds field) ===
${factIdList.join(', ')}

=== FACT SUMMARIES ===
${factSummary}

Generate coaching insights for ${name} based on this context.
Reference only factIds from the list above.`;
  }
}
