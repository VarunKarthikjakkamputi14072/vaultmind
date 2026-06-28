'use client'
import { FlaskConical, ArrowDownLeft, ArrowUpRight, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react'

export type SimAssetChange = {
  symbol: string; decimals: number; direction: 'in' | 'out';
  amount: string; rawAmount: string; usdValue: number | null;
  logo: string | null; contractAddress: string | null;
}

export type SimResponse = {
  simulation: {
    success: boolean; reverted: boolean; provider: string | null;
    assetChanges: SimAssetChange[]; gasUsed: number | null; revertReason: string | null;
  };
  risk: { score: number; level: 'Safe' | 'Caution' | 'Critical'; summary: string; slippagePct: number | null; factors: string[] };
  narrative: string;
  simTrace: { name: string; status: 'success' | 'failed' | 'skipped'; reason?: string }[];
}

const levelStyle: Record<string, { bar: string; bg: string; border: string; text: string; Icon: typeof ShieldCheck }> = {
  Safe:     { bar: 'bg-emerald-500', bg: 'bg-emerald-950/40', border: 'border-emerald-900/50', text: 'text-emerald-300', Icon: ShieldCheck },
  Caution:  { bar: 'bg-amber-500',   bg: 'bg-amber-950/40',   border: 'border-amber-900/50',   text: 'text-amber-300',   Icon: AlertTriangle },
  Critical: { bar: 'bg-red-500',     bg: 'bg-red-950/40',     border: 'border-red-900/50',     text: 'text-red-300',     Icon: ShieldAlert },
}

function fmt(amount: string): string {
  const n = Number(amount)
  if (!isFinite(n)) return amount
  return n.toLocaleString(undefined, { maximumFractionDigits: 5 })
}

export function SimulationPanel({ data, isLoading }: { data: SimResponse | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-[--bg-surface] border border-[--bg-border] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[--brand-from]" />
          <span className="text-sm font-medium text-[--text-primary]">Simulating on forked mainnet…</span>
        </div>
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-8 w-full rounded" />
      </div>
    )
  }

  if (!data) return null

  const { simulation, risk, narrative, simTrace } = data
  const s = levelStyle[risk.level]
  const outgoing = simulation.assetChanges.filter(c => c.direction === 'out')
  const incoming = simulation.assetChanges.filter(c => c.direction === 'in')

  return (
    <div className="bg-[--bg-surface] border border-[--bg-border] rounded-lg p-4 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[--brand-from]" />
          <h3 className="text-sm font-medium text-[--text-primary]">Dry-Run Simulation</h3>
        </div>
        {simulation.provider && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[--bg-elevated] border border-[--bg-border] text-[--text-muted]">
            via {simulation.provider}
          </span>
        )}
      </div>

      {/* Narrative verdict */}
      <div className={`p-3 rounded-md text-sm border flex items-start gap-2 ${s.bg} ${s.border} ${s.text}`}>
        <s.Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{narrative}</span>
      </div>

      {/* Asset changes */}
      {(outgoing.length > 0 || incoming.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs text-[--text-muted] uppercase tracking-wide">Simulated balance changes</p>
          <div className="rounded-md border border-[--bg-border] divide-y divide-[--bg-border]">
            {outgoing.map((c, i) => (
              <div key={`o${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-red-400">
                  <ArrowUpRight className="w-4 h-4" /> Sent
                </span>
                <span className="font-mono text-red-400">- {fmt(c.amount)} {c.symbol}</span>
              </div>
            ))}
            {incoming.map((c, i) => (
              <div key={`i${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-emerald-400">
                  <ArrowDownLeft className="w-4 h-4" /> Received
                </span>
                <span className="font-mono text-emerald-400">+ {fmt(c.amount)} {c.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk gauge */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[--text-secondary]">Simulation risk</span>
          <span className="font-semibold text-[--text-primary]">
            {risk.score}/100 — {risk.level}
            {risk.slippagePct != null && ` · ${risk.slippagePct.toFixed(2)}% slippage`}
          </span>
        </div>
        <div className="h-2 bg-[--bg-elevated] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${risk.score}%` }} />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-[--text-muted]">
        {simulation.gasUsed != null && <span>Gas: {simulation.gasUsed.toLocaleString()}</span>}
        {simTrace.map((t, i) => (
          <span key={i} title={t.reason ?? t.status} className="inline-flex items-center gap-1">
            <span className={t.status === 'success' ? 'text-emerald-400' : t.status === 'failed' ? 'text-red-400' : 'text-gray-500'}>
              {t.status === 'success' ? '✓' : t.status === 'failed' ? '✗' : '—'}
            </span>
            {t.name}
          </span>
        ))}
      </div>
    </div>
  )
}
