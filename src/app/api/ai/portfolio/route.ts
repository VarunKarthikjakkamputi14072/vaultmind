import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompt-builder';
import { evaluatePortfolioRisk } from '@/lib/ai/risk-engine';
import { rateLimit } from '@/lib/rate-limit';

const BodySchema = z.object({
  tokens: z.array(z.any()),
});

export async function POST(request: Request) {
  // Step 1: rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const isAllowed = await rateLimit(`rate_limit:ai_portfolio:${ip}`, 10, 60);
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
  
  // 1. Run local deterministic Risk Engine
  const riskProfile = evaluatePortfolioRisk(tokens);

  // 2. Generate LLM Insight
  const google = createGoogleGenerativeAI({ apiKey });
  
  const validTokens = tokens.filter(t => t.possible_spam !== true && Number(t.usd_value) > 0);
  const spamTokens = tokens.filter(t => t.possible_spam === true || !t.usd_value || Number(t.usd_value) === 0);
  
  const topTokens = validTokens
    .sort((a, b) => (Number(b.usd_value) || 0) - (Number(a.usd_value) || 0))
    .slice(0, 5)
    .map(t => `${t.symbol}: $${Number(t.usd_value).toFixed(2)}`);

  const spamStr = spamTokens.length > 0 ? ` Note: ${spamTokens.length} unpriced/spam tokens were detected and ignored.` : '';

  // Step 3: call Gemini inside try/catch
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPTS.TREASURY_ANALYST,
      prompt: `Analyze this treasury portfolio. Top verified assets: ${topTokens.join(', ') || 'None'}. Risk Score: ${riskProfile.score}/100 (${riskProfile.level}).${spamStr} Provide a 2-sentence strategic recommendation. If spam tokens exist, briefly warn the user.`,
    });

    return NextResponse.json({ 
      insight: text,
      risk: riskProfile
    });
  } catch (error: unknown) {
    console.error('[AI route error]', error); // server log only
    return NextResponse.json(
      { error: 'Analysis service temporarily unavailable.' },
      { status: 503 }
    );
  }
}
