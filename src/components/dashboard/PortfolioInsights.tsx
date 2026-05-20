'use client'
import { useState } from 'react'
import { Sparkles, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

type RiskProfile = {
  score: number;
  level: string;
  factors: string[];
}

export function PortfolioInsights({ tokens, activeAddress }: { tokens: Record<string, unknown>[], activeAddress: string | null | undefined }) {
  const [insight, setInsight] = useState<string | null>(null)
  const [risk, setRisk] = useState<RiskProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!tokens || tokens.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze portfolio");
      setInsight(data.insight);
      setRisk(data.risk);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!activeAddress) return null;

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="glass-card gradient-border p-6 hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[--text-primary] font-semibold">Portfolio Risk Analysis</h2>
      </div>

      <div className="space-y-4">
        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{error}</div>}
        
        {!insight && !loading && (
          <div>
            <p className="text-sm text-[--text-secondary] mb-4">Inference engine assessment:</p>
            <button 
              onClick={handleAnalyze}
              disabled={tokens.length === 0}
              className="w-full bg-[--bg-elevated] hover:bg-slate-700 text-slate-200 text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 border border-[--bg-border]"
            >
              Run Analysis
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="shimmer h-5 w-32 rounded" />
            <div className="shimmer h-4 w-24 rounded" />
            <div className="shimmer h-24 w-full rounded" />
          </div>
        )}

        {insight && risk && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[--bg-surface] rounded-lg border border-[--bg-border]">
              <span className="text-sm text-[--text-secondary]">Risk Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${risk.score > 50 ? 'text-[--status-danger]' : 'text-[--status-safe]'}`}>
                  {risk.score}/100 ({risk.level})
                </span>
                {risk.score > 50 && <ShieldAlert className="w-4 h-4 text-[--status-danger]" />}
              </div>
            </div>
            
            <div className="text-sm text-[--text-primary] leading-relaxed p-4 bg-[--bg-elevated] border border-[--brand-from] rounded-lg">
              <p>{insight}</p>
            </div>

            {risk.factors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">Risk Factors</p>
                <ul className="text-sm text-[--text-secondary] list-disc list-inside space-y-1">
                  {risk.factors.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
