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

  try {
    const response = await fetch(
      `https://api.portals.fi/v2/account?owner=${walletAddress}&networks=ethereum&networks=arbitrum&networks=optimism&networks=polygon&networks=base&networks=avalanche&networks=bsc`,
      {
        headers: {
          'Authorization': `Bearer f4ed3bc4-2f78-4c2b-adfc-83e98aa169dd`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Portals API failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map Portals format to what the frontend expects
    const allTokens = (data.balances || []).map((token: any) => ({
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      balance: token.rawBalance || String(Math.floor(token.balance * (10 ** token.decimals))),
      usd_value: token.balanceUSD,
      chain: token.network
    }));

    return NextResponse.json({ result: allTokens });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
