'use client'
import { Sparkles, ShieldAlert, ShieldCheck } from 'lucide-react'
import { MevRiskProfile } from '@/lib/ai/mev-analyzer'

function RiskGauge({ score }: { score: number }) {
  const colour =
    score <= 30 ? 'bg-emerald-500' :
    score <= 60 ? 'bg-amber-500'   : 'bg-red-500';

  const label =
    score <= 30 ? 'Low Risk'    :
    score <= 60 ? 'Medium Risk' : 'High Risk';

  // Normalize score from 0-100 to 0-10 scale for UI text, or use percentage for width
  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-sm">
        <span className="text-[--text-secondary]">Risk Score</span>
        <span className="font-semibold text-[--text-primary]">{score/10}/10 — {label}</span>
      </div>
      <div className="h-2 bg-[--bg-elevated] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function TradeInsight({ insightText, mevRisk, isLoading }: { insightText: string | null, mevRisk?: MevRiskProfile | null, isLoading: boolean }) {
  if (!insightText && !isLoading && !mevRisk) return null;

  return (
    <div className="bg-[--bg-surface] border border-[--bg-border] rounded-lg p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[--brand-from]" />
        <h3 className="text-sm font-medium text-[--text-primary]">LLM-augmented trade analysis</h3>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-4/5 rounded" />
        </div>
      ) : (
        <div className="space-y-4 mt-3">
          <p className="text-sm text-[--text-secondary] leading-relaxed">
            {insightText}
          </p>
          
          {mevRisk && (
            <>
              <div className={`p-3 rounded-md text-sm border flex items-start gap-2 ${mevRisk.vulnerabilityScore > 50 ? 'bg-red-950/40 border-red-900/50 text-red-300' : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'}`}>
                {mevRisk.vulnerabilityScore > 50 ? <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /> : <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />}
                <div>
                  <span>{mevRisk.recommendation}</span>
                </div>
              </div>
              <RiskGauge score={mevRisk.vulnerabilityScore} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
