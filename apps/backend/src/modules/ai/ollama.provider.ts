import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ILlmProvider } from './interfaces/llm-provider.interface';
import type { OllamaChatRequest, OllamaChatResponse } from './types/ai.types';

/**
 * OllamaProvider -- concrete HTTP client for the Ollama inference API.
 *
 * Implements ILlmProvider so InsightsService depends on the abstraction,
 * not this concrete class. Registered in AiModule behind the LLM_PROVIDER
 * injection token -- no service outside AiModule should import this class.
 *
 * Wraps POST {OLLAMA_BASE_URL}/api/chat with:
 *   - AbortController-based timeout (OLLAMA_TIMEOUT_MS)
 *   - Structured logging (request start, response received, errors)
 *   - No retry -- retries are the caller's responsibility (Phase 5: BullMQ job)
 *
 * Configuration (env vars, all optional with defaults):
 *   OLLAMA_BASE_URL    -- default: http://localhost:11434
 *   OLLAMA_MODEL       -- default: qwen2.5-coder:7b
 *   OLLAMA_TIMEOUT_MS  -- default: 60000
 *
 * Reference: https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion
 */
@Injectable()
export class OllamaProvider implements ILlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl   = config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.model     = config.get<string>('OLLAMA_MODEL',    'qwen2.5-coder:7b');
    this.timeoutMs = config.get<number>('OLLAMA_TIMEOUT_MS', 60000);
  }

  /**
   * Send a chat request to Ollama and return the raw response content string.
   *
   * @param systemPrompt -- role definition and output format instructions
   * @param userPrompt   -- developer context (serialized ContextPack)
   * @returns Raw string from the model (expected to be valid JSON per the prompt)
   * @throws Error when Ollama is unreachable, times out, or returns non-2xx
   */
  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const body: OllamaChatRequest = {
      model:    this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      stream: false,
      format: 'json',
    };

    this.logger.log(
      `Sending chat request to Ollama model=${this.model} ` +
      `promptLength=${systemPrompt.length + userPrompt.length}`,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? `Ollama request timed out after ${this.timeoutMs}ms`
        : `Ollama request failed: ${String(err)}`;
      this.logger.error(msg);
      throw new Error(msg);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `Ollama returned HTTP ${response.status}: ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data?.message?.content ?? '';

    this.logger.log(
      `Ollama response received model=${this.model} contentLength=${content.length}`,
    );

    return content;
  }
}
