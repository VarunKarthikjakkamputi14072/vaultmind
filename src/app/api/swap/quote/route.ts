import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const QuoteSchema = z.object({
  src: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid source token address"),
  dst: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid destination token address"),
  amount: z.string().regex(/^\d+$/, "Amount must be a numeric string"),
  chainId: z.string().default('1'),
});

export async function GET(request: Request) {
  // 1. Rate Limiting (Max 10 requests per 10 seconds per IP)
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const isAllowed = await rateLimit(`rate_limit:quote:${ip}`, 10, 10);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 2. Validation
  const { searchParams } = new URL(request.url);
  const parsed = QuoteSchema.safeParse({
    src: searchParams.get('src'),
    dst: searchParams.get('dst'),
    amount: searchParams.get('amount'),
    chainId: searchParams.get('chainId') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { src, dst, amount, chainId } = parsed.data;

  // 3. Backend Proxy to SwapAPI (No API Key Required)
  try {
    const dummySender = "0x0000000000000000000000000000000000000000";
    const url = `https://api.swapapi.dev/v1/swap/${chainId}?tokenIn=${src}&tokenOut=${dst}&amount=${amount}&sender=${dummySender}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SwapAPI Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return NextResponse.json({
      toAmount: result.data?.expectedAmountOut || "0",
      tx: result.data?.tx || {}
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
