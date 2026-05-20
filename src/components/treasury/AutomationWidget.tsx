'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Strategy = {
  title: string
  tag: string
  tagColor: string
  description: string
  apy: string
  risk: 'Low' | 'Medium' | 'High'
  protocol: string
  protocolIcon: string
  action: string
  link: string
}

function parseStrategies(raw: string): Strategy[] {
  // Best-effort parser: splits on numbered lines, extracts what it can
  // Falls back to showing raw text if structure is unexpected
  const lines = raw.split('\n').filter(l => l.trim())
  const strategies: Strategy[] = []
  
  let current: Partial<Strategy> | null = null
  
  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+\*?\*?(.+?)\*?\*?$/)
    if (numbered) {
      if (current?.title) strategies.push(current as Strategy)
      current = {
        title: numbered[2].replace(/\*/g, '').trim(),
        tag: 'DeFi',
        tagColor: '#2563EB',
        description: '',
        apy: '—',
        risk: 'Medium',
        protocol: 'On-chain',
        protocolIcon: '⬡',
        action: 'Learn more',
        link: '#',
      }
      continue
    }
    if (current && line.toLowerCase().includes('apy')) {
      const apyMatch = line.match(/(\d+(?:\.\d+)?)\s*%/)
      if (apyMatch) current.apy = `${apyMatch[1]}%`
    }
    if (current && line.toLowerCase().includes('aave')) {
      current.protocol = 'Aave'; current.protocolIcon = '👻'; current.link = 'https://aave.com'
    }
    if (current && line.toLowerCase().includes('lido')) {
      current.protocol = 'Lido'; current.protocolIcon = '🌊'; current.link = 'https://lido.fi'
    }
    if (current && line.toLowerCase().includes('uniswap')) {
      current.protocol = 'Uniswap'; current.protocolIcon = '🦄'; current.link = 'https://app.uniswap.org'
    }
    if (current && line.toLowerCase().includes('compound')) {
      current.protocol = 'Compound'; current.protocolIcon = '🏦'; current.link = 'https://compound.finance'
    }
    if (current && line.toLowerCase().includes('curve')) {
      current.protocol = 'Curve'; current.protocolIcon = '〰️'; current.link = 'https://curve.fi'
    }
    if (current && line.toLowerCase().includes('yearn')) {
      current.protocol = 'Yearn'; current.protocolIcon = '🔵'; current.link = 'https://yearn.fi'
    }
    if (current && !current.description && line.length > 20 && !line.startsWith('#')) {
      current.description = line.replace(/\*/g, '').trim()
    }
    if (current && line.toLowerCase().includes('low risk'))    current.risk = 'Low'
    if (current && line.toLowerCase().includes('medium risk')) current.risk = 'Medium'
    if (current && line.toLowerCase().includes('high risk'))   current.risk = 'High'
  }
  if (current?.title) strategies.push(current as Strategy)
  
  // If parser couldn't extract structured data, return 3 smart defaults
  if (strategies.length === 0) {
    return [
      { title: 'Yield Optimisation', tag: 'DeFi', tagColor: '#2563EB', description: raw.slice(0, 120) + '...', apy: '—', risk: 'Medium', protocol: 'Multi-protocol', protocolIcon: '⚡', action: 'View strategies', link: '#' }
    ]
  }
  
  return strategies.slice(0, 3)
}

const riskColors = {
  Low:    { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.25)' },
  Medium: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  High:   { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444', border: 'rgba(239,68,68,0.25)'  },
}

export function AutomationWidget({ tokens, activeAddress }: {
  tokens: Record<string, unknown>[]
  activeAddress?: string | null
}) {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [rawText, setRawText]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [expanded, setExpanded]     = useState<number | null>(null)

  const runAnalysis = async () => {
    if (!tokens.length && !activeAddress) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/ai/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Analysis failed'); return }
      const parsed = parseStrategies(data.suggestions || '')
      setStrategies(parsed)
      setRawText(data.suggestions || '')
    } catch {
      setError('Network error — please retry')
    } finally {
      setLoading(false)
    }
  }

  const hasData = tokens.length > 0 || !!activeAddress

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))',
            border: '1px solid rgba(124,58,237,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>⚙️</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Heuristic Treasury Automation
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
              LLM-generated capital efficiency strategies
            </p>
          </div>
        </div>
        {strategies.length > 0 && (
          <button onClick={runAnalysis} style={{
            fontSize: 11, color: 'var(--text-muted)', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
          }}>Refresh</button>
        )}
      </div>

      {/* Empty state */}
      {!hasData && !loading && strategies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
          <p style={{ fontSize: 13, margin: 0 }}>Connect a wallet to generate strategies</p>
        </div>
      )}

      {/* Run button */}
      {hasData && strategies.length === 0 && !loading && (
        <button onClick={runAnalysis} className="gradient-btn" style={{ width: '100%' }}>
          Generate Capital Efficiency Strategies
        </button>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} style={{
              background: 'var(--bg-elevated)', borderRadius: 12, padding: 16,
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div className="shimmer" style={{ height: 14, width: '60%', marginBottom: 8 }} />
              <div className="shimmer" style={{ height: 11, width: '90%', marginBottom: 6 }} />
              <div className="shimmer" style={{ height: 11, width: '70%' }} />
            </div>
          ))}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Analysing portfolio composition...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444',
        }}>{error}</div>
      )}

      {/* Strategy cards */}
      <AnimatePresence>
        {strategies.map((s, i) => {
          const rc = riskColors[s.risk]
          const isOpen = expanded === i
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              {/* Card top row */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{s.protocolIcon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.title}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                        via {s.protocol}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Risk badge */}
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`,
                    }}>{s.risk} Risk</span>
                    {/* Expand chevron */}
                    <span style={{
                      fontSize: 12, color: 'var(--text-muted)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s', display: 'inline-block',
                    }}>▾</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {s.description}
                </p>

                {/* APY row */}
                {s.apy !== '—' && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Est. APY</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{s.apy}</span>
                  </div>
                )}
              </div>

              {/* Expanded action row */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(37,99,235,0.04)',
                      padding: '12px 16px',
                      display: 'flex', gap: 8,
                    }}
                  >
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="gradient-btn"
                      style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none' }}
                    >
                      Open {s.protocol} →
                    </a>
                    <button
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(s.description) }}
                      style={{
                        fontSize: 12, padding: '8px 14px', borderRadius: 10,
                        background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                      }}
                    >
                      Copy Strategy
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Raw text fallback toggle */}
      {rawText && strategies.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>
            View raw inference output
          </summary>
          <pre style={{
            marginTop: 8, fontSize: 11, color: 'var(--text-muted)',
            background: 'var(--bg-elevated)', borderRadius: 8,
            padding: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5,
          }}>{rawText}</pre>
        </details>
      )}
    </div>
  )
}
