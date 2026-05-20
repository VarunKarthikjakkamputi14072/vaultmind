'use client'
import { useState } from 'react'
import { Bot } from 'lucide-react'
import { motion } from 'framer-motion'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

export function AutomationWidget({ tokens, activeAddress }: { tokens: Record<string, unknown>[], activeAddress: string | null | undefined }) {
  const [suggestions, setSuggestions] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!tokens || tokens.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate automation strategies");
      setSuggestions(data.suggestions);
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
          <Bot className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[--text-primary] font-semibold">Heuristic treasury automation</h2>
      </div>

      <div className="space-y-4">
        {error && <div className="text-[--status-danger] text-sm bg-red-400/10 p-3 rounded">{error}</div>}
        
        {!suggestions && !loading && (
          <button 
            onClick={handleGenerate}
            disabled={tokens.length === 0}
            className="w-full bg-[--bg-elevated] hover:bg-slate-700 text-slate-200 text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 border border-[--bg-border]"
          >
            Run Analysis
          </button>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="shimmer h-8 w-full rounded" />
            <div className="shimmer h-24 w-full rounded" />
          </div>
        )}

        {suggestions && (
          <div className="text-sm text-[--text-primary] leading-relaxed p-4 bg-[--bg-elevated] border border-[--brand-from] rounded-lg whitespace-pre-wrap animate-in fade-in zoom-in duration-300">
            {suggestions}
          </div>
        )}
      </div>
    </motion.div>
  )
}
