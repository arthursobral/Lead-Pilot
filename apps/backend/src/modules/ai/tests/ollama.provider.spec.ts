import { OllamaProvider } from '../ollama.provider';
import { ConfigService } from '@nestjs/config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  return {
    get: jest.fn((key: string, fallback: unknown) => {
      const map: Record<string, unknown> = {
        OLLAMA_BASE_URL:   'http://localhost:11434',
        OLLAMA_MODEL:      'qwen2.5-coder:7b',
        OLLAMA_TIMEOUT_MS: 5000,
        ...overrides,
      };
      return map[key] ?? fallback;
    }),
  } as unknown as ConfigService;
}

function makeOkResponse(content: string): Response {
  return {
    ok:   true,
    json: jest.fn().mockResolvedValue({ model: 'qwen2.5-coder:7b', message: { role: 'assistant', content }, done: true }),
    text: jest.fn().mockResolvedValue(''),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body = 'Internal Server Error'): Response {
  return {
    ok:     false,
    status,
    json:   jest.fn(),
    text:   jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    provider = new OllamaProvider(makeConfig());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('reads model from ConfigService', () => {
      const p = new OllamaProvider(makeConfig({ OLLAMA_MODEL: 'llama3:8b' }));
      expect(p.model).toBe('llama3:8b');
    });

    it('uses default model when not configured', () => {
      // When nothing is configured, config.get returns its fallback parameter
      const cfg = { get: jest.fn((_key: string, fallback: unknown) => fallback) } as unknown as ConfigService;
      const p = new OllamaProvider(cfg);
      // fallback is provided inline in the constructor
      expect(p.model).toBe('qwen2.5-coder:7b');
    });
  });

  describe('chat()', () => {
    it('returns the message content on success', async () => {
      fetchMock.mockResolvedValue(makeOkResponse('{"insights":[]}'));

      const result = await provider.chat('sys', 'user');

      expect(result).toBe('{"insights":[]}');
    });

    it('POSTs to /api/chat with the correct body', async () => {
      fetchMock.mockResolvedValue(makeOkResponse('{}'));

      await provider.chat('system prompt', 'user prompt');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:11434/api/chat');
      expect(init.method).toBe('POST');

      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('qwen2.5-coder:7b');
      expect(body.stream).toBe(false);
      expect(body.format).toBe('json');
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0]).toEqual({ role: 'system', content: 'system prompt' });
      expect(body.messages[1]).toEqual({ role: 'user',   content: 'user prompt'   });
    });

    it('throws with timeout message on AbortError', async () => {
      const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
      fetchMock.mockRejectedValue(abortErr);

      await expect(provider.chat('s', 'u')).rejects.toThrow(/timed out/i);
    });

    it('throws with generic message on network error', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(provider.chat('s', 'u')).rejects.toThrow(/ECONNREFUSED/);
    });

    it('throws when Ollama returns HTTP 500', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500, 'model not found'));

      await expect(provider.chat('s', 'u')).rejects.toThrow(/HTTP 500/);
    });

    it('returns empty string when message.content is missing', async () => {
      const resp = {
        ok:   true,
        json: jest.fn().mockResolvedValue({ model: 'x', message: {}, done: true }),
        text: jest.fn(),
      } as unknown as Response;
      fetchMock.mockResolvedValue(resp);

      const result = await provider.chat('s', 'u');
      expect(result).toBe('');
    });
  });
});
