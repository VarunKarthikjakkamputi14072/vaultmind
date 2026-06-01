import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { generateText } from 'ai';
import { generateTextWaterfall } from '@/lib/ai/waterfall';

vi.mock('ai', () => ({ generateText: vi.fn() }));

const mockGen = generateText as unknown as Mock;

beforeEach(() => {
  // Two providers configured (Groq first, then Gemini); no Redis.
  vi.stubEnv('GROQ_API_KEY', 'test-groq');
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-gemini');
  vi.stubEnv('COHERE_API_KEY', '');
  vi.stubEnv('OPENROUTER_API_KEY', '');
  mockGen.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('generateTextWaterfall', () => {
  it('falls over to the next provider when the first throws', async () => {
    mockGen
      .mockRejectedValueOnce(new Error('groq down'))
      .mockResolvedValueOnce({ text: 'gemini answer' });

    const result = await generateTextWaterfall({ system: 's', prompt: 'p' });

    expect(result.success).toBe(true);
    expect(result.content).toBe('gemini answer');
    expect(mockGen).toHaveBeenCalledTimes(2);
  });

  it('times out a hung provider and fails over', async () => {
    mockGen
      .mockImplementationOnce(() => new Promise(() => {})) // never resolves
      .mockResolvedValueOnce({ text: 'gemini answer' });

    const result = await generateTextWaterfall({ system: 's', prompt: 'p', timeoutMs: 30 });

    expect(result.success).toBe(true);
    expect(result.content).toBe('gemini answer');
  });

  it('returns a graceful failure when every provider fails', async () => {
    mockGen.mockRejectedValue(new Error('provider down'));

    const result = await generateTextWaterfall({ system: 's', prompt: 'p', timeoutMs: 30 });

    expect(result.success).toBe(false);
    expect(result.content).toMatch(/unavailable/i);
  });
});
