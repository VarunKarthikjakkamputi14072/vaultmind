import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google AI key not configured on server' }, { status: 500 });
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
  
  const google = createGoogleGenerativeAI({ apiKey });
  
  let idleAssets = tokens
    .filter(t => (Number(t.usd_value) || 0) > 100) // Lowered to $100
    .map(t => `${t.symbol} ($${Number(t.usd_value).toFixed(2)})`);

  if (idleAssets.length === 0) {
    idleAssets = tokens.map(t => `${t.symbol} (Balance: ${Number(t.balance) / 10**Number(t.decimals)})`);
  }

  const assetStr = idleAssets.length > 0 ? idleAssets.join(', ') : 'No specific tokens';

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPTS.AUTOMATION_ENGINEER,
      prompt: `The treasury currently holds these assets: ${assetStr}. Suggest 3 highly specific smart contract automation strategies (e.g. yield farming, auto-rebalancing) to optimize capital efficiency based on these exact assets.`,
    });

    return NextResponse.json({ 
      suggestions: text
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
