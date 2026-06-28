import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { simulateTransaction } from '@/lib/web3/simulate';
import { evaluateSimulationRisk } from '@/lib/web3/sim-risk';
import { generateTextWaterfall } from '@/lib/ai/waterfall';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompt-builder';

const BodySchema = z.object({
  tx: z.object({
    from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid from address'),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid to address'),
    data: z.string().optional(),
    value: z.string().optional(),
  }),
  chainId: z.string().default('1'),
  expectedOut: z.string().optional(),
  expectedSymbol: z.string().optional(),
});

export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const isAllowed = await rateLimit(`rate_limit:simulate:${ip}`, 10, 60);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before retrying.' }, { status: 429 });
  }

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

  const { tx, chainId, expectedOut, expectedSymbol } = parsed.data;

  // 1. Run the simulation waterfall (Tenderly → Alchemy).
  const sim = await simulateTransaction(tx, chainId);

  // 2. Deterministic risk verdict — always available, no LLM needed.
  const risk = evaluateSimulationRisk(sim, expectedOut, expectedSymbol);

  // 3. Best-effort LLM narrative on top. If every provider is exhausted we fall
  //    back to the deterministic summary so the UI always has a sentence.
  let narrative = risk.summary;
  let providerTrace: unknown[] = [];
  if (sim.provider) {
    try {
      const prompt = [
        `Risk verdict: ${risk.level} (score ${risk.score}/100).`,
        `Asset changes: ${sim.assetChanges.map(c => `${c.direction === 'out' ? '-' : '+'}${c.amount} ${c.symbol}`).join(', ') || 'none'}.`,
        sim.reverted ? `Reverted: ${sim.revertReason}.` : '',
        risk.slippagePct != null ? `Measured slippage: ${risk.slippagePct.toFixed(2)}%.` : '',
        `Gas used: ${sim.gasUsed ?? 'unknown'}.`,
      ].filter(Boolean).join(' ');

      const ai = await generateTextWaterfall({
        system: SYSTEM_PROMPTS.SIMULATION_NARRATOR,
        prompt,
        timeoutMs: 6000,
      });
      providerTrace = ai.providerTrace ?? [];
      if (ai.success && ai.content?.trim()) {
        narrative = ai.content.trim();
      }
    } catch {
      // keep the deterministic summary
    }
  }

  return NextResponse.json({
    simulation: {
      success: sim.success,
      reverted: sim.reverted,
      provider: sim.provider,
      assetChanges: sim.assetChanges,
      gasUsed: sim.gasUsed,
      revertReason: sim.revertReason,
    },
    risk,
    narrative,
    simTrace: sim.simTrace,
    providerTrace,
  });
}
