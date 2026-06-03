'use client'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { Layers, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

type Token = { name: string; symbol: string; balance: string; usdValue: string; chain: string; isSpam: boolean; }

const SPAM_URL_PATTERNS = /\.com|\.io|\.net|\.fi|\.xyz|http|:\/\//i
const SPAM_BAIT_WORDS   = /\b(claim|airdrop|voucher|visit|invite)\b/i
const SPAM_PREFIX       = /^[!@$]/

function detectSpam(raw: Record<string, unknown>, name: string, symbol: string): boolean {
  if (raw.possible_spam === true) return true
  const haystack = `${name} ${symbol}`
  if (SPAM_URL_PATTERNS.test(haystack)) return true
  if (SPAM_BAIT_WORDS.test(haystack))   return true
  if (SPAM_PREFIX.test(name.trim()) || SPAM_PREFIX.test(symbol.trim())) return true
  return false
}

function TokenRow({ token, dim }: { token: Token; dim?: boolean }) {
  return (
    <tr
      className="border-b border-[--bg-border] hover:bg-[--bg-elevated] transition-colors"
      style={dim ? { opacity: 0.5 } : undefined}
    >
      <td className="px-4 py-3 font-medium text-[--text-primary]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase flex-shrink-0">
            {token.symbol ? token.symbol[0] : '?'}
          </div>
          <span style={dim ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : undefined}>
            {token.name}
          </span>
          <span className="text-[--text-muted] text-xs">{token.symbol}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-sm">{token.balance}</td>
      <td className="px-4 py-3 text-sm">{dim ? <span className="text-[--text-muted]">—</span> : token.usdValue}</td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-[--bg-surface] text-[--text-secondary] border border-[--bg-border]">
          {token.chain}
        </span>
      </td>
    </tr>
  )
}

export function TokenTable({ activeAddress, onTotalCalculated, onTokensLoaded }: {
  activeAddress: string | null | undefined
  onTotalCalculated: (val: number) => void
  onTokensLoaded?: (tokens: Record<string, unknown>[]) => void
}) {
  const [tokens, setTokens]         = useState<Token[]>([])
  const [loading, setLoading]       = useState(false)
  const [spamOpen, setSpamOpen]     = useState(false)

  useEffect(() => {
    if (!activeAddress) {
      setTimeout(() => {
        setTokens([]);
        onTotalCalculated(0);
        if (onTokensLoaded) onTokensLoaded([]);
      }, 0);
      return;
    }

    setLoading(true)
    fetch(`/api/balances?walletAddress=${activeAddress}`)
      .then(res => res.json())
      .then(data => {
        const tokenArray = data.result || []

        if (tokenArray.length > 0) {
          let sum = 0;
          const formattedTokens = tokenArray.map((t: Record<string, unknown>) => {
            const usd    = typeof t.usd_value === 'number' ? t.usd_value : 0;
            const name   = String(t.name   || 'Unknown')
            const symbol = String(t.symbol || '???')
            const spam   = detectSpam(t, name, symbol)
            if (!spam) sum += usd;
            return {
              name,
              symbol,
              balance:  t.decimals
                ? Number(formatUnits(BigInt(t.balance as string), Number(t.decimals))).toFixed(4)
                : String(t.balance),
              usdValue: usd > 0
                ? `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—',
              chain:   String(t.chain || 'Ethereum'),
              isSpam:  spam,
            }
          })

          // Real tokens sorted by USD value desc; spam stays unsorted at the bottom
          const real = formattedTokens
            .filter((t: Token) => !t.isSpam)
            .sort((a: Token, b: Token) => {
              const valA = parseFloat(a.usdValue.replace(/[$,]/g, '')) || 0;
              const valB = parseFloat(b.usdValue.replace(/[$,]/g, '')) || 0;
              return valB - valA;
            });
          const spam = formattedTokens.filter((t: Token) => t.isSpam)

          setTokens([...real, ...spam])
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

  const realTokens = tokens.filter(t => !t.isSpam)
  const spamTokens = tokens.filter(t => t.isSpam)

  const tableHead = (
    <thead className="text-xs text-[--text-muted] uppercase bg-[--bg-surface] border-b border-[--bg-border]">
      <tr>
        <th className="px-4 py-3 font-medium">Asset</th>
        <th className="px-4 py-3 font-medium">Balance</th>
        <th className="px-4 py-3 font-medium">Value (USD)</th>
        <th className="px-4 py-3 font-medium">Network</th>
      </tr>
    </thead>
  )

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
        {realTokens.length > 0 && (
          <span className="ml-auto text-xs text-[--text-muted]">{realTokens.length} verified</span>
        )}
      </div>

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
        <div className="space-y-4">
          {/* ── Real assets ─────────────────────────────────────────── */}
          {realTokens.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-[--bg-border]">
              <table className="w-full text-sm text-left text-[--text-secondary]">
                {tableHead}
                <tbody>
                  {realTokens.map((token, i) => <TokenRow key={i} token={token} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-[--text-muted] text-sm py-6 text-center">No verified assets found.</div>
          )}

          {/* ── Spam / airdrop section ──────────────────────────────── */}
          {spamTokens.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 overflow-hidden">
              {/* Collapsible header */}
              <button
                onClick={() => setSpamOpen(o => !o)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-amber-500/5"
                style={{ background: 'rgba(245,158,11,0.06)' }}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  {spamTokens.length} suspected spam / airdrop token{spamTokens.length > 1 ? 's' : ''} — do not interact
                </span>
                <span className="ml-auto text-amber-400/60">
                  {spamOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {/* Collapsed warning blurb */}
              {!spamOpen && (
                <div className="px-4 py-2 text-xs text-[--text-muted]" style={{ background: 'rgba(245,158,11,0.03)' }}>
                  These tokens contain URLs or bait phrases. Visiting linked sites can drain your wallet.
                  <button onClick={() => setSpamOpen(true)} className="ml-1 text-amber-400/70 underline underline-offset-2">Show anyway</button>
                </div>
              )}

              {/* Expanded spam table */}
              {spamOpen && (
                <div className="overflow-x-auto" style={{ background: 'rgba(245,158,11,0.02)' }}>
                  <table className="w-full text-sm text-left text-[--text-secondary]">
                    {tableHead}
                    <tbody>
                      {spamTokens.map((token, i) => <TokenRow key={i} token={token} dim />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
