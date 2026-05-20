import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompt-builder';
import { rateLimit } from '@/lib/rate-limit';

const BodySchema = z.object({
  tokens: z.array(z.any()),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const isAllowed = await rateLimit(`rate_limit:ai_automation:${ip}`, 5, 60);
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
  
  const customOpenAI = createOpenAI({ apiKey });
  
  const idleAssets = tokens
    .filter(t => (Number(t.usd_value) || 0) > 1000) // focus on assets > $1000
    .map(t => `${t.symbol} ($${Number(t.usd_value).toFixed(2)})`);

  try {
    const { text } = await generateText({
      model: customOpenAI('gpt-4o-mini'),
      system: SYSTEM_PROMPTS.AUTOMATION_ENGINEER,
      prompt: `The treasury currently holds these idle assets: ${idleAssets.join(', ')}. Suggest 3 highly specific smart contract automation strategies (e.g. yield framing, auto-rebalancing) to optimize capital efficiency.`,
    });

    return NextResponse.json({ 
      suggestions: text
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
