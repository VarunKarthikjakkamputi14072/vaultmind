import { NextResponse } from 'next/server';
import { z } from 'zod';

const QuerySchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const parsed = QuerySchema.safeParse({
    walletAddress: searchParams.get('walletAddress'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { walletAddress } = parsed.data;

  // Top EVM Chains (Hex IDs for Moralis)
  const chains = [
    { id: '0x1', name: 'Ethereum' },
    { id: '0xa4b1', name: 'Arbitrum' },
    { id: '0x2105', name: 'Base' },
    { id: '0x89', name: 'Polygon' },
    { id: '0xa', name: 'Optimism' },
    { id: '0xe708', name: 'Linea' }
  ];

  try {
    // Fetch all chains in parallel for speed
    const fetchPromises = chains.map(async (chain) => {
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${chain.id}`,
        { headers: { 'accept': 'application/json', 'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY || '' } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      
      // Inject the network name into the token data so the UI knows where it lives
      return (data.result || []).map((token: Record<string, unknown>) => ({ ...token, chain: chain.name }));
    });

    const results = await Promise.all(fetchPromises);
    
    // Flatten the array of arrays into one massive token list
    const allTokens = results.flat();

    return NextResponse.json({ result: allTokens });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
