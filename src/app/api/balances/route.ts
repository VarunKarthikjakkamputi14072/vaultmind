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

  const PORTALS_KEY = process.env.PORTALS_API_KEY || "Bearer f4ed3bc4-2f78-4c2b-adfc-83e98aa169dd"; // Allowed by GH
  const MORALIS_KEY = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY || "";
  const BITQUERY_KEY = process.env.BITQUERY_API_KEY || "1823ea54-1a9e-41e9-a7ff-b7048f0d0cb7";
  const BLOCKDAEMON_KEY = process.env.BLOCKDAEMON_API_KEY || "";
  const NODE_RPC_KEY = process.env.NODE_RPC_KEY || "6PP5v4uBHcUx9ndQvtBC2";
  const INFURA_KEY = process.env.INFURA_API_KEY || "2f03HVfU+JjvDd9eyA79ASM2GRXXOlT0rwwZtSsAEao0IymMF9FZoA";

  const fetchPortals = async (wallet: string) => {
    const res = await fetch(`https://api.portals.fi/v2/account?owner=${wallet}&networks=ethereum&networks=arbitrum&networks=optimism&networks=polygon&networks=base&networks=avalanche&networks=bsc`, {
      headers: { 'Authorization': PORTALS_KEY }
    });
    if (!res.ok) throw new Error(`Portals failed: ${res.statusText}`);
    const data = await res.json();
    return (data.balances || []).map((t: any) => ({
      name: t.name, symbol: t.symbol, decimals: t.decimals, balance: t.rawBalance || String(Math.floor(t.balance * (10 ** t.decimals))), usd_value: t.balanceUSD, chain: t.network
    }));
  };

  const fetchMoralis = async (wallet: string) => {
    if (!MORALIS_KEY) throw new Error("No Moralis Key");
    const chains = [{ id: '0x1', name: 'Ethereum' }, { id: '0x89', name: 'Polygon' }, { id: '0xa4b1', name: 'Arbitrum' }];
    const promises = chains.map(async (c) => {
      const res = await fetch(`https://deep-index.moralis.io/api/v2.2/wallets/${wallet}/tokens?chain=${c.id}`, {
        headers: { 'accept': 'application/json', 'X-API-Key': MORALIS_KEY }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.result || []).map((t: any) => ({ ...t, chain: c.name }));
    });
    const results = await Promise.all(promises);
    return results.flat();
  };

  const fetchBitquery = async (wallet: string) => {
    const res = await fetch('https://graphql.bitquery.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': BITQUERY_KEY },
      body: JSON.stringify({
        query: `query { ethereum { address(address: {is: "${wallet}"}) { balances { currency { symbol name decimals } value } } } }`
      })
    });
    if (!res.ok) throw new Error("Bitquery failed");
    const data = await res.json();
    const balances = data.data?.ethereum?.address?.[0]?.balances || [];
    return balances.map((b: any) => ({
      name: b.currency.name, symbol: b.currency.symbol, decimals: b.currency.decimals, balance: String(Math.floor(b.value * (10 ** b.currency.decimals))), usd_value: 0, chain: 'Ethereum'
    }));
  };

  const fetchBlockdaemon = async (wallet: string) => {
    const res = await fetch(`https://svc.blockdaemon.com/universal/v1/ethereum/mainnet/account/${wallet}`, {
      headers: { 'Authorization': `Bearer ${BLOCKDAEMON_KEY}` }
    });
    if (!res.ok) throw new Error("Blockdaemon failed");
    const data = await res.json();
    if (!data.confirmed_balance) throw new Error("No balance in Blockdaemon");
    return [{ name: 'Ethereum', symbol: 'ETH', decimals: 18, balance: data.confirmed_balance, usd_value: 0, chain: 'Ethereum' }];
  };

  const fetchInfuraRPC = async (wallet: string) => {
    const res = await fetch(`https://mainnet.infura.io/v3/${INFURA_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [wallet, "latest"], id: 1 })
    });
    if (!res.ok) throw new Error("Infura failed");
    const data = await res.json();
    if (!data.result) throw new Error("No result from Infura");
    const balInt = parseInt(data.result, 16);
    return [{ name: 'Ethereum', symbol: 'ETH', decimals: 18, balance: String(balInt), usd_value: 0, chain: 'Ethereum' }];
  };

  const providers = [
    { name: 'Portals.fi', fn: fetchPortals },
    { name: 'Moralis', fn: fetchMoralis },
    { name: 'Bitquery', fn: fetchBitquery },
    { name: 'Blockdaemon', fn: fetchBlockdaemon },
    { name: 'Infura', fn: fetchInfuraRPC }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting to fetch balances with ${provider.name}...`);
      const tokens = await provider.fn(walletAddress);
      console.log(`${provider.name} succeeded!`);
      return NextResponse.json({ result: tokens });
    } catch (error: any) {
      console.warn(`${provider.name} failed: ${error.message}. Falling back...`);
    }
  }

  // Final fallback if absolutely everything fails
  return NextResponse.json({
    result: [{ name: 'Ethereum (Fallback)', symbol: 'ETH', decimals: 18, balance: '0', usd_value: 0, chain: 'Ethereum' }]
  });
}
