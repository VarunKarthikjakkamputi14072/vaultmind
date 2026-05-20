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
  // Step 1: rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const isAllowed = await rateLimit(`rate_limit:ai_automation:${ip}`, 10, 60);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before retrying.' }, { status: 429 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google AI key not configured on server' }, { status: 500 });
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

  const { tokens } = parsed.data;
  
  const google = createGoogleGenerativeAI({ apiKey });
  
  const validTokens = tokens.filter(t => t.possible_spam !== true && Number(t.usd_value) > 0);
  const spamTokens = tokens.filter(t => t.possible_spam === true || !t.usd_value || Number(t.usd_value) === 0);

  const idleAssets = validTokens
    .filter(t => (Number(t.usd_value) || 0) > 10) // Lowered threshold to $10 for verified assets
    .map(t => `${t.symbol} ($${Number(t.usd_value).toFixed(2)})`);

  const assetStr = idleAssets.length > 0 ? idleAssets.join(', ') : 'No verified high-value assets';
  const spamSymbols = spamTokens.map(t => t.symbol).slice(0, 3).join(', ');
  const spamStr = spamTokens.length > 0 ? ` Note: The system ignored ${spamTokens.length} unpriced or suspected spam tokens (e.g., ${spamSymbols}).` : '';

  // Step 3: call Gemini inside try/catch
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPTS.AUTOMATION_ENGINEER,
      prompt: `The treasury currently holds these verified assets: ${assetStr}.${spamStr} Suggest 3 highly specific smart contract automation strategies (e.g. yield farming, auto-rebalancing) to optimize capital efficiency based ONLY on the verified assets. If spam tokens were ignored, explicitly warn the user in one sentence not to interact with them.`,
    });

    return NextResponse.json({ 
      suggestions: text
    });
  } catch (error: unknown) {
    console.error('[AI route error]', error); // server log only
    return NextResponse.json(
      { error: 'Analysis service temporarily unavailable.' },
      { status: 503 }
    );
  }
}
