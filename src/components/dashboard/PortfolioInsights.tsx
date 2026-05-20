'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, ShieldAlert } from 'lucide-react'

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
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          AI Treasury Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{error}</div>}
        
        {!insight && !loading && (
          <button 
            onClick={handleAnalyze}
            disabled={tokens.length === 0}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50"
          >
            Generate Treasury Report
          </button>
        )}

        {loading && (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3 py-1">
              <div className="h-2 bg-slate-800 rounded"></div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                <div className="h-2 bg-slate-800 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        )}

        {insight && risk && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-sm text-slate-400">Risk Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${risk.score > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {risk.score}/100 ({risk.level})
                </span>
                {risk.score > 50 && <ShieldAlert className="w-4 h-4 text-red-400" />}
              </div>
            </div>
            
            <div className="text-sm text-slate-300 leading-relaxed p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <p>{insight}</p>
            </div>

            {risk.factors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Risk Factors</p>
                <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                  {risk.factors.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
