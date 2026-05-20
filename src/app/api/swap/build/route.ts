import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

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

  // 3. Backend Proxy to SwapAPI (No API Key Required)
  try {
    const url = `https://api.swapapi.dev/v1/swap/${chainId}?tokenIn=${src}&tokenOut=${dst}&amount=${amount}&sender=${from}&slippage=${slippage}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SwapAPI Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json({
      toAmount: data.amountOut || "0",
      tx: data.tx || {}
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
