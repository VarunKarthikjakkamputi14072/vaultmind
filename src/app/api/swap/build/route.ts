import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { openOceanSwap } from '@/lib/web3/openocean';

const SwapSchema = z.object({
  src: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid source token address"),
  dst: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid destination token address"),
  amount: z.string().regex(/^\d+$/, "Amount must be a numeric string"),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid user address"),
  slippage: z.number().min(0.1).max(50),
  chainId: z.string().default('1'),
});

export async function GET(request: Request) {
  // 1. Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const isAllowed = await rateLimit(`rate_limit:swap:${ip}`, 5, 10);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 2. Validation
  const { searchParams } = new URL(request.url);
  const parsed = SwapSchema.safeParse({
    src: searchParams.get('src'),
    dst: searchParams.get('dst'),
    amount: searchParams.get('amount'),
    from: searchParams.get('from'),
    slippage: Number(searchParams.get('slippage')),
    chainId: searchParams.get('chainId') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { src, dst, amount, from, slippage, chainId } = parsed.data;

  // 3. Proxy to OpenOcean (keyless aggregator) → executable transaction.
  try {
    const { toAmount, tx } = await openOceanSwap({
      chainId, src, dst, amountWei: amount, account: from, slippage,
    });
    return NextResponse.json({ toAmount, tx });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
