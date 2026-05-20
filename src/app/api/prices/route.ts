import { NextResponse } from 'next/server';
import { z } from 'zod';

const QuerySchema = z.object({
  address: z.string().min(1, 'Token address is required'),
  chainId: z.string().default('0x1'),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const parsed = QuerySchema.safeParse({
    address: searchParams.get('address'),
    chainId: searchParams.get('chainId') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { address, chainId } = parsed.data;

  try {
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/${address}/price?chain=${chainId}`,
      {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY || ''
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch price from Moralis');
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
