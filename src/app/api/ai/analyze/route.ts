import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTradeAnalysisPrompt, SYSTEM_PROMPTS } from '@/lib/ai/prompt-builder';
import { evaluateMevRisk } from '@/lib/ai/mev-analyzer';

const BodySchema = z.object({
  quoteData: z.any(),
});

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google AI key not configured on server.' }, 
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { quoteData } = parsed.data;
  const google = createGoogleGenerativeAI({ apiKey });
  const mevRisk = evaluateMevRisk(quoteData);

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPTS.TREASURY_ANALYST,
      prompt: `${buildTradeAnalysisPrompt(quoteData)}\nMEV Risk Score: ${mevRisk.vulnerabilityScore}/100. ${mevRisk.recommendation}`,
    });

    return NextResponse.json({ insight: text, mevRisk });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
