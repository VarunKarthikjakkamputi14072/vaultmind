'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot } from 'lucide-react'

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
    <Card className="bg-slate-900 border-slate-800 mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Bot className="w-5 h-5 text-teal-400" />
          Smart Treasury Automation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{error}</div>}
        
        {!suggestions && !loading && (
          <button 
            onClick={handleGenerate}
            disabled={tokens.length === 0}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50"
          >
            Discover Capital Efficiency Strategies
          </button>
        )}

        {loading && (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3 py-1">
              <div className="h-2 bg-slate-800 rounded"></div>
              <div className="h-2 bg-slate-800 rounded w-5/6"></div>
            </div>
          </div>
        )}

        {suggestions && (
          <div className="text-sm text-slate-300 leading-relaxed p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg whitespace-pre-wrap animate-in fade-in zoom-in duration-300">
            {suggestions}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
