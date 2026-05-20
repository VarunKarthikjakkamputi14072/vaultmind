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

  let parsedStrategies: any[] = [];
  if (suggestions) {
    try {
      const cleaned = suggestions.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedStrategies = JSON.parse(cleaned).strategies || [];
    } catch (e) {
      // fallback
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
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Heuristic treasury automation</h2>
      </div>

      <div className="space-y-4">
        {error && <div className="text-white text-sm bg-red-600 border-[3px] border-black p-3 font-bold">{error}</div>}
        
        {!suggestions && !loading && (
          <button 
            onClick={handleGenerate}
            disabled={tokens.length === 0}
            className="w-full bg-[#eecb46] hover:bg-yellow-400 text-black border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all text-sm font-black py-3 uppercase tracking-wider"
          >
            Run Analysis
          </button>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-300 h-8 w-full border-[3px] border-black" />
            <div className="animate-pulse bg-gray-300 h-24 w-full border-[3px] border-black" />
          </div>
        )}

        {suggestions && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            {parsedStrategies.length > 0 ? (
              parsedStrategies.map((s, i) => (
                <div key={i} className="border-[3px] border-black bg-white p-4 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b-[3px] border-black pb-2 mb-2">
                    <h3 className="font-black text-black uppercase">{s.name}</h3>
                    <span className="text-xs bg-black text-white px-2 py-1 font-bold">{s.platform || 'DeFi'}</span>
                  </div>
                  <p className="text-sm text-black mb-3">{s.description}</p>
                  <div className="bg-[#eecb46] border-[3px] border-black p-2 text-xs font-mono font-bold text-black">
                    {'>'} {s.action}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-black leading-relaxed p-4 bg-white border-[3px] border-black whitespace-pre-wrap">
                {suggestions}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
