'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatUnits } from 'viem'

type Token = { name: string; symbol: string; balance: string; usdValue: string; chain: string; }

export function TokenTable({ activeAddress, onTotalCalculated, onTokensLoaded }: { activeAddress: string | null | undefined, onTotalCalculated: (val: number) => void, onTokensLoaded?: (tokens: Record<string, unknown>[]) => void }) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeAddress) {
      setTimeout(() => {
        setTokens([]);
        onTotalCalculated(0);
        if (onTokensLoaded) onTokensLoaded([]);
      }, 0);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/balances?walletAddress=${activeAddress}`)
      .then(res => res.json())
      .then(data => {
        const tokenArray = data.result || []
        
        if (tokenArray.length > 0) {
          let sum = 0;
          const formattedTokens = tokenArray.map((t: Record<string, unknown>) => {
            const usd = typeof t.usd_value === 'number' ? t.usd_value : 0;
            sum += usd;
            return {
              name: String(t.name || 'Unknown'),
              symbol: String(t.symbol || '???'),
              balance: t.decimals ? Number(formatUnits(BigInt(t.balance as string), Number(t.decimals))).toFixed(4) : String(t.balance),
              usdValue: usd > 0 ? `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
              chain: String(t.chain || 'Ethereum')
            }
          })
          
          // Sort by highest USD value first
          formattedTokens.sort((a: Token, b: Token) => {
            const valA = parseFloat(a.usdValue.replace(/[$,]/g, '')) || 0;
            const valB = parseFloat(b.usdValue.replace(/[$,]/g, '')) || 0;
            return valB - valA;
          });

          setTokens(formattedTokens)
          onTotalCalculated(sum)
          if (onTokensLoaded) onTokensLoaded(tokenArray)
        } else {
          setTokens([]) 
          onTotalCalculated(0)
          if (onTokensLoaded) onTokensLoaded([])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress])

  return (
    <Card className="bg-slate-900 border-slate-800 mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200">Portfolio Assets</CardTitle>
      </CardHeader>
      <CardContent>
        {!activeAddress ? (
          <div className="text-slate-500 text-sm py-10 text-center border border-dashed border-slate-800 rounded-lg">
            Connect your wallet or search an address above.
          </div>
        ) : loading ? (
          <div className="text-slate-500 text-sm py-10 text-center">Scanning EVM networks...</div>
        ) : tokens.length === 0 ? (
          <div className="text-slate-500 text-sm py-10 text-center">No tokens found for this address.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Value (USD)</th>
                  <th className="px-4 py-3 font-medium">Network</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                          {token.symbol ? token.symbol[0] : '?'}
                        </div>
                        {token.name} <span className="text-slate-500 ml-1">{token.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono">{token.balance}</td>
                    <td className="px-4 py-4">{token.usdValue}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                        {token.chain}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
