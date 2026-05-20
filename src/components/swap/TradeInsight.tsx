'use client'
import { Sparkles, ShieldAlert, ShieldCheck } from 'lucide-react'
import { MevRiskProfile } from '@/lib/ai/mev-analyzer'

export function TradeInsight({ insightText, mevRisk, isLoading }: { insightText: string | null, mevRisk?: MevRiskProfile | null, isLoading: boolean }) {
  if (!insightText && !isLoading && !mevRisk) return null;

  return (
    <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-medium text-indigo-300">AI Execution Insight</h3>
      </div>
      
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-indigo-900/50 rounded w-full"></div>
          <div className="h-3 bg-indigo-900/50 rounded w-4/5"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {insightText}
          </p>
          
          {mevRisk && (
            <div className={`p-3 rounded-md text-sm border flex items-start gap-2 ${mevRisk.vulnerabilityScore > 50 ? 'bg-red-950/40 border-red-900/50 text-red-300' : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'}`}>
              {mevRisk.vulnerabilityScore > 50 ? <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /> : <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>
                <span className="font-semibold block mb-0.5">MEV Risk: {mevRisk.vulnerabilityScore}/100</span>
                <span>{mevRisk.recommendation}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
