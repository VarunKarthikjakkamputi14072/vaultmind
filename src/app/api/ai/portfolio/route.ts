import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompt-builder';
import { evaluatePortfolioRisk } from '@/lib/ai/risk-engine';
import { rateLimit } from '@/lib/rate-limit';

const BodySchema = z.object({
  tokens: z.array(z.any()),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const isAllowed = await rateLimit(`rate_limit:ai_portfolio:${ip}`, 5, 60);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured on server' }, { status: 500 });
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

  const { tokens } = parsed.data;
  
  // 1. Run local deterministic Risk Engine
  const riskProfile = evaluatePortfolioRisk(tokens);

  // 2. Generate LLM Insight
  const customOpenAI = createOpenAI({ apiKey });
  
  const topTokens = tokens
    .sort((a, b) => (Number(b.usd_value) || 0) - (Number(a.usd_value) || 0))
    .slice(0, 5)
    .map(t => `${t.symbol}: $${Number(t.usd_value).toFixed(2)}`);

  try {
    const { text } = await generateText({
      model: customOpenAI('gpt-4o-mini'),
      system: SYSTEM_PROMPTS.TREASURY_ANALYST,
      prompt: `Analyze this treasury portfolio. Top assets: ${topTokens.join(', ')}. Risk Score: ${riskProfile.score}/100 (${riskProfile.level}). Provide a 2-sentence strategic recommendation.`,
    });

    return NextResponse.json({ 
      insight: text,
      risk: riskProfile
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
