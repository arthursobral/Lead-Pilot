/**
 * Generic LLM message types -- provider-agnostic.
 *
 * These types represent the minimal shared vocabulary for LLM communication.
 * They are intentionally decoupled from any provider-specific API schema
 * (e.g. Ollama's OllamaChatRequest) so that test doubles and future providers
 * can be built without importing Ollama internals.
 *
 * Used by:
 *   - OllamaProvider (internally for building request payloads)
 *   - ILlmProvider interface (via the chat() signature string parameters)
 */

/** The role a message participant plays in a chat turn. */
export type LlmRole = 'system' | 'user' | 'assistant';

/** A single chat message passed to or received from the LLM. */
export interface LlmMessage {
  role: LlmRole;
  content: string;
}
