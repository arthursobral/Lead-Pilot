/**
 * Injection token for the LLM provider.
 *
 * Register in AiModule as: { provide: LLM_PROVIDER, useClass: OllamaProvider }
 * Inject in services as:   @Inject(LLM_PROVIDER) llmProvider: ILlmProvider
 *
 * This indirection ensures no service outside AiModule ever imports
 * OllamaProvider directly, keeping the concrete HTTP client swappable.
 */
export const LLM_PROVIDER = Symbol('ILlmProvider');

/**
 * Provider-agnostic interface for local or remote LLM communication.
 *
 * Contract:
 *   chat(systemPrompt, userPrompt) -- sends a two-turn structured chat request
 *     and returns the raw response content string.
 *     Throws on timeout, network error, or non-2xx HTTP status.
 *
 *   model -- the model identifier used for this provider instance.
 *     Stored on Insight.model so every persisted insight is traceable
 *     to the exact model that generated it.
 */
export interface ILlmProvider {
  readonly model: string;
  chat(systemPrompt: string, userPrompt: string): Promise<string>;
}
