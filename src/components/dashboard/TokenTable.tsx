'use client'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

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
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="glass-card gradient-border p-6 hover:border-blue-500/30 transition-all duration-300 mt-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[--text-primary] font-semibold">Portfolio Assets</h2>
      </div>
      
      <div>
        {!activeAddress ? (
          <div className="text-[--text-muted] text-sm py-10 text-center border border-dashed border-[--bg-border] rounded-lg">
            Connect your wallet or search an address above.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <div className="shimmer h-8 w-full rounded" />
            <div className="shimmer h-8 w-full rounded" />
            <div className="shimmer h-8 w-full rounded" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-[--text-muted] text-sm py-10 text-center">No tokens found for this address.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-[--text-secondary]">
              <thead className="text-xs text-[--text-muted] uppercase bg-[--bg-surface] border-b border-[--bg-border]">
                <tr>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Value (USD)</th>
                  <th className="px-4 py-3 font-medium">Network</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, i) => (
                  <tr key={i} className="border-b border-[--bg-border] hover:bg-[--bg-elevated] transition-colors">
                    <td className="px-4 py-4 font-medium text-[--text-primary]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                          {token.symbol ? token.symbol[0] : '?'}
                        </div>
                        {token.name} <span className="text-[--text-muted] ml-1">{token.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono">{token.balance}</td>
                    <td className="px-4 py-4">{token.usdValue}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-[--bg-surface] text-[--text-secondary] border border-[--bg-border]">
                        {token.chain}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
