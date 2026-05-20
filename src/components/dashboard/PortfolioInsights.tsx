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

  let parsedInsight: any = null;
  if (insight) {
    if (typeof insight === 'object') {
      parsedInsight = insight;
    } else if (typeof insight === 'string') {
      try {
        const cleaned = insight.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedInsight = JSON.parse(cleaned);
      } catch (e) {
        // fallback to raw text
      }
    }
  }

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[3px] border-[--bg-border] pb-4">
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Portfolio Risk Analysis</h2>
      </div>

      <div className="space-y-4">
        {error && <div className="text-white text-sm bg-red-600 border-[3px] border-black p-3 font-bold">{error}</div>}
        
        {!insight && !loading && (
          <div>
            <button 
              onClick={handleAnalyze}
              disabled={tokens.length === 0}
              className="w-full bg-[#eecb46] hover:bg-yellow-400 text-black border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all text-sm font-black py-3 uppercase tracking-wider"
            >
              Run Analysis
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-300 h-8 w-full border-[3px] border-black" />
            <div className="animate-pulse bg-gray-300 h-24 w-full border-[3px] border-black" />
          </div>
        )}

        {insight && risk && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              <span className="text-sm font-black uppercase">Risk Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black ${risk.score > 50 ? 'text-red-600' : 'text-green-600'}`}>
                  {risk.score}/100 ({risk.level})
                </span>
                {risk.score > 50 && <ShieldAlert className="w-5 h-5 text-red-600" />}
              </div>
            </div>
            
            {parsedInsight && (parsedInsight.analysis || parsedInsight.portfolio) ? (
              <div className="space-y-3">
                <div className="border-[3px] border-black bg-white p-3">
                  <span className="font-black uppercase text-xs block mb-1">Analysis</span>
                  <p className="text-sm">{parsedInsight.analysis || parsedInsight.portfolio}</p>
                </div>
                <div className="border-[3px] border-black bg-[#eecb46] p-3">
                  <span className="font-black uppercase text-xs block mb-1">Recommendation</span>
                  <p className="text-sm">{parsedInsight.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-black leading-relaxed p-4 bg-white border-[3px] border-black whitespace-pre-wrap">
                {typeof insight === 'string' ? insight : JSON.stringify(insight, null, 2)}
              </div>
            )}

            {risk.factors.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-black font-black uppercase tracking-wider">Risk Factors</p>
                <ul className="text-sm text-black list-disc list-inside space-y-1">
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
