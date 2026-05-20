import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTradeAnalysisPrompt, SYSTEM_PROMPTS } from '@/lib/ai/prompt-builder';
import { evaluateMevRisk } from '@/lib/ai/mev-analyzer';
import { rateLimit } from '@/lib/rate-limit';

const BodySchema = z.object({
  quoteData: z.any(),
});

export async function POST(request: Request) {
  // Step 1: rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const isAllowed = await rateLimit(`rate_limit:ai_analyze:${ip}`, 10, 60); // 10 requests per 60 seconds
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before retrying.' }, { status: 429 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google AI key not configured on server.' }, 
      { status: 500 }
    );
  }

  // Step 2: validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { quoteData } = parsed.data;
  const google = createGoogleGenerativeAI({ apiKey });
  const mevRisk = evaluateMevRisk(quoteData);

  // Step 3: call Gemini inside try/catch
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPTS.TREASURY_ANALYST,
      prompt: `${buildTradeAnalysisPrompt(quoteData)}\nMEV Risk Score: ${mevRisk.vulnerabilityScore}/100. ${mevRisk.recommendation}`,
    });

    return NextResponse.json({ insight: text, mevRisk });
  } catch (error: unknown) {
    console.error('[AI route error]', error); // server log only
    return NextResponse.json(
      { error: 'Analysis service temporarily unavailable.' },
      { status: 503 }
    );
  }
}
