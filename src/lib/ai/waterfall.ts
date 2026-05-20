import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';

export async function generateTextWaterfall({ system, prompt }: { system: string, prompt: string }) {
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
    { name: 'Cohere', model: cohere?.('command-r-plus') },
    { name: 'OpenRouter', model: openrouter?.('mistralai/mistral-7b-instruct:free') }
  ];

  let lastError: any = null;
  let attemptCount = 0;

  for (const provider of providers) {
    if (!provider.model) {
      console.log(`[AI Waterfall] Skipping ${provider.name} (No API Key)`);
      continue;
    }

    try {
      console.log(`[AI Waterfall] Attempting generation with ${provider.name}...`);
      const { text } = await generateText({
        model: provider.model as any,
        system: system,
        prompt: prompt,
      });
      console.log(`[AI Waterfall] Success with ${provider.name}!`);
      return { success: true, content: text };
    } catch (e: any) {
      console.error(`[AI Waterfall] ${provider.name} failed:`, e?.message || e);
      lastError = e;
      attemptCount++;
    }
  }

  console.error(`[AI Waterfall] All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  return {
    success: false,
    content: "AI service temporarily unavailable",
  };
}
