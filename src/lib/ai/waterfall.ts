import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';
import { cacheKey, getCachedText, setCachedText } from './cache';

// Provider waterfall: attempts inference in priority order.
// Groq (fastest, free) → Google Gemini (reliable) → Cohere (fallback)
// This ensures zero single-provider dependency — critical for production uptime.

const DEFAULT_TIMEOUT_MS = 8000;

/** Reject if the promise hasn't settled within ms — so a hung provider can't stall the chain. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Provider timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function generateTextWaterfall({
  system,
  prompt,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  system: string;
  prompt: string;
  timeoutMs?: number;
}) {
  // Serve identical prompts from cache instead of re-calling the LLM.
  const key = cacheKey(system, prompt);
  const cached = await getCachedText(key);
  if (cached) {
    console.log('[AI Waterfall] Cache hit.');
    return { success: true, content: cached, cached: true };
  }

  const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
    : null;

  const groq = process.env.GROQ_API_KEY
    ? createGroq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  const cohere = process.env.COHERE_API_KEY
    ? createCohere({ apiKey: process.env.COHERE_API_KEY })
    : null;

  const openrouter = process.env.OPENROUTER_API_KEY
    ? createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY })
    : null;

  const providers = [
    { name: 'Groq', model: groq?.('llama-3.3-70b-versatile') },
    { name: 'Gemini', model: google?.('gemini-2.5-flash') },
    { name: 'Cohere', model: cohere?.('command-r-plus-08-2024') },
    { name: 'OpenRouter', model: openrouter?.('meta-llama/llama-3.3-70b-instruct:free') }
  ];

  let lastError: unknown = null;

  for (const provider of providers) {
    if (!provider.model) {
      console.log(`[AI Waterfall] Skipping ${provider.name} (No API Key)`);
      continue;
    }

    try {
      console.log(`[AI Waterfall] Attempting generation with ${provider.name}...`);
      const { text } = await withTimeout(
        generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: provider.model as any,
          system: system,
          prompt: prompt,
          // Cancel the underlying request when we give up on this provider.
          abortSignal: AbortSignal.timeout(timeoutMs),
        }),
        timeoutMs,
      );
      console.log(`[AI Waterfall] Success with ${provider.name}!`);
      await setCachedText(key, text);
      return { success: true, content: text };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[AI Waterfall] ${provider.name} failed:`, msg);
      lastError = e;
    }
  }

  const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError || 'Unknown error');
  console.error(`[AI Waterfall] All AI providers failed. Last error: ${finalErrorMsg}`);
  return {
    success: false,
    content: "AI service temporarily unavailable",
  };
}
