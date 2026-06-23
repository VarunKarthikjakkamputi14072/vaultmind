'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Strategy, protocolMeta } from '@/lib/ai/strategy-schema'

type ProviderTraceEntry = { name: string; status: 'success' | 'failed' | 'skipped'; reason?: string }

const traceStatusStyle: Record<string, { color: string; icon: string }> = {
  success: { color: '#10B981', icon: '✓' },
  failed:  { color: '#EF4444', icon: '✗' },
  skipped: { color: '#6B7280', icon: '—' },
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
  const [strategies, setStrategies]       = useState<Strategy[]>([])
  const [rawText, setRawText]             = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [expanded, setExpanded]           = useState<number | null>(null)
  const [providerTrace, setProviderTrace] = useState<ProviderTraceEntry[]>([])

  const runAnalysis = async () => {
    if (!tokens.length && !activeAddress) return
    setLoading(true)
    setError('')
    setProviderTrace([])
    try {
      const res  = await fetch('/api/ai/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Analysis failed')
        if (data.providerTrace) setProviderTrace(data.providerTrace)
        return
      }
      if (data.providerTrace) setProviderTrace(data.providerTrace)
      // Server returns validated, typed strategies (or null when the model's
      // output couldn't be parsed — in that case we surface the raw text).
      const parsed: Strategy[] = Array.isArray(data.strategies) ? data.strategies : []
      setStrategies(parsed)
      setRawText(data.suggestions || '')
      if (parsed.length === 0) {
        setError('The model returned an unexpected format — see raw output below.')
      }
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
      {hasData && strategies.length === 0 && !loading && !error && (
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

      {/* Error + provider trace */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>{error}</p>
          {providerTrace.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Providers attempted
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {providerTrace.map((entry, i) => {
                  const s = traceStatusStyle[entry.status]
                  return (
                    <span
                      key={i}
                      title={entry.reason ?? entry.status}
                      style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 6,
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${entry.status === 'failed' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
                        color: s.color, display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span>{s.icon}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          <button onClick={runAnalysis} style={{
            marginTop: 12, fontSize: 12, padding: '6px 14px', borderRadius: 8,
            background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Retry</button>
        </div>
      )}

      {/* Strategy cards */}
      <AnimatePresence>
        {strategies.map((s, i) => {
          const rc = riskColors[s.risk]
          const meta = protocolMeta(s.protocol)
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
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
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
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`,
                    }}>{s.risk} Risk</span>
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
                    {meta.link && (
                      <a
                        href={meta.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="gradient-btn"
                        style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none' }}
                      >
                        Open {s.protocol} →
                      </a>
                    )}
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
      {rawText && (
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
