import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';
import { cacheKey, getCachedText, setCachedText } from './cache';

// Provider waterfall — tries free-tier providers in priority order.
// Priority: Groq → Cerebras → Gemini → Sambanova → Cohere → Together → Mistral → HuggingFace → OpenRouter
// Any provider whose env key is absent is skipped; the trace always records what happened.

const DEFAULT_TIMEOUT_MS = 8000;

export type ProviderStatus = 'success' | 'failed' | 'skipped';
export type ProviderTraceEntry = { name: string; status: ProviderStatus; reason?: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error)  => { clearTimeout(timer); reject(error);  },
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
  const key = cacheKey(system, prompt);
  const cached = await getCachedText(key);
  if (cached) {
    console.log('[AI Waterfall] Cache hit.');
    return { success: true, content: cached, cached: true, providerTrace: [] as ProviderTraceEntry[] };
  }

  // ── Initialise clients (null when the env key is absent) ──────────────────
  const groq = process.env.GROQ_API_KEY
    ? createGroq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  const cerebras = process.env.CEREBRAS_API_KEY
    ? createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY })
    : null;

  const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
    : null;

  const sambanova = process.env.SAMBANOVA_API_KEY
    ? createOpenAI({ baseURL: 'https://api.sambanova.ai/v1', apiKey: process.env.SAMBANOVA_API_KEY })
    : null;

  const cohere = process.env.COHERE_API_KEY
    ? createCohere({ apiKey: process.env.COHERE_API_KEY })
    : null;

  const together = process.env.TOGETHER_API_KEY
    ? createOpenAI({ baseURL: 'https://api.together.xyz/v1', apiKey: process.env.TOGETHER_API_KEY })
    : null;

  const mistral = process.env.MISTRAL_API_KEY
    ? createOpenAI({ baseURL: 'https://api.mistral.ai/v1', apiKey: process.env.MISTRAL_API_KEY })
    : null;

  const huggingface = process.env.HUGGINGFACE_API_KEY
    ? createOpenAI({ baseURL: 'https://api-inference.huggingface.co/v1', apiKey: process.env.HUGGINGFACE_API_KEY })
    : null;

  const openrouter = process.env.OPENROUTER_API_KEY
    ? createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY })
    : null;

  // ── Provider list (in priority order) ────────────────────────────────────
  const providers = [
    { name: 'Groq',         tier: 'Free',  model: groq?.('llama-3.3-70b-versatile') },
    { name: 'Cerebras',     tier: 'Free',  model: cerebras?.('llama-3.3-70b') },
    { name: 'Gemini Flash', tier: 'Free',  model: google?.('gemini-2.5-flash') },
    { name: 'Sambanova',    tier: 'Free',  model: sambanova?.('Meta-Llama-3.3-70B-Instruct') },
    { name: 'Cohere',       tier: 'Free',  model: cohere?.('command-r-plus-08-2024') },
    { name: 'Together AI',  tier: 'Free',  model: together?.('meta-llama/Llama-3.3-70B-Instruct-Turbo-Free') },
    { name: 'Mistral',      tier: 'Free',  model: mistral?.('mistral-small-latest') },
    { name: 'HuggingFace',  tier: 'Free',  model: huggingface?.('meta-llama/Llama-3.1-8B-Instruct') },
    { name: 'OpenRouter',   tier: 'Free',  model: openrouter?.('meta-llama/llama-3.3-70b-instruct:free') },
  ];

  const trace: ProviderTraceEntry[] = [];
  let lastError: unknown = null;

  for (const provider of providers) {
    if (!provider.model) {
      console.log(`[AI Waterfall] Skipping ${provider.name} — no API key`);
      trace.push({ name: provider.name, status: 'skipped', reason: 'No API key configured' });
      continue;
    }

    try {
      console.log(`[AI Waterfall] Trying ${provider.name}...`);
      const { text } = await withTimeout(
        generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: provider.model as any,
          system,
          prompt,
          abortSignal: AbortSignal.timeout(timeoutMs),
        }),
        timeoutMs,
      );
      console.log(`[AI Waterfall] Success with ${provider.name}`);
      trace.push({ name: provider.name, status: 'success' });
      await setCachedText(key, text);
      return { success: true, content: text, providerTrace: trace };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[AI Waterfall] ${provider.name} failed:`, msg);
      trace.push({ name: provider.name, status: 'failed', reason: msg });
      lastError = e;
    }
  }

  const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError || 'Unknown error');
  console.error('[AI Waterfall] All providers exhausted. Last error:', finalErrorMsg);
  return {
    success: false,
    content: 'AI service temporarily unavailable',
    providerTrace: trace,
  };
}
