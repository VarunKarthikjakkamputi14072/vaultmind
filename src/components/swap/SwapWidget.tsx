'use client'
import { useState } from 'react'
import { TradeInsight } from './TradeInsight'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseUnits } from 'viem'
import { MevRiskProfile } from '@/lib/ai/mev-analyzer'
import { motion } from 'framer-motion'
import { ArrowLeftRight, LockIcon, AlertTriangleIcon, ShieldAlertIcon } from 'lucide-react'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const USDC_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

type QuoteResponse = { toAmount: string; [key: string]: unknown };

export function SwapWidget() {
  const { address } = useAccount()
  const { sendTransaction } = useSendTransaction()
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [insight, setInsight] = useState<string | null>(null)
  const [mevRisk, setMevRisk] = useState<MevRiskProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetQuoteAndAnalyze = async () => {
    if (!amount) return;
    setLoading(true)
    setError(null)
    setInsight(null)
    setMevRisk(null)
    setQuote(null)

    try {
      const amountInWei = parseUnits(amount, 18).toString()
      const quoteRes = await fetch(`/api/swap/quote?src=${ETH_ADDRESS}&dst=${USDC_ADDRESS}&amount=${amountInWei}&chainId=1`);
      const quoteData = await quoteRes.json();
      
      if (!quoteRes.ok) throw new Error(quoteData.error || "Failed to fetch quote");
      setQuote(quoteData);

      const aiRes = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteData })
      });
      const aiData = await aiRes.json();
      if (aiData.insight) setInsight(aiData.insight);
      if (aiData.mevRisk) setMevRisk(aiData.mevRisk);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const executeSwap = async () => {
    if (!address || !quote) return;
    setLoading(true)
    setError(null)
    try {
      const amountInWei = parseUnits(amount, 18).toString()
      const buildRes = await fetch(`/api/swap/build?src=${ETH_ADDRESS}&dst=${USDC_ADDRESS}&amount=${amountInWei}&from=${address}&slippage=1&chainId=1`);
      const buildData = await buildRes.json();
      
      if (!buildRes.ok) throw new Error(buildData.error || "Failed to build transaction");

      sendTransaction({
        to: buildData.tx.to,
        data: buildData.tx.data as `0x${string}`,
        value: BigInt(buildData.tx.value),
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const riskLevel = mevRisk ? (mevRisk.vulnerabilityScore <= 30 ? 'safe' : mevRisk.vulnerabilityScore <= 60 ? 'caution' : 'danger') : 'safe';

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="glass-card gradient-border p-6 hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[--text-primary] font-semibold">LLM-augmented trade analysis</h2>
      </div>

      <div className="space-y-4">
        {error && <div className="p-3 bg-red-900/50 border border-red-800 text-red-200 text-sm rounded-md">{error}</div>}
        
        <div className="bg-[--bg-surface] p-4 rounded-lg border border-[--bg-border]">
          <label className="text-xs text-[--text-muted] font-medium">Pay (ETH)</label>
          <div className="flex justify-between items-center mt-1">
            <input 
              type="number" 
              placeholder="0.0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-2xl text-[--text-primary] focus:outline-none w-full" 
            />
          </div>
        </div>

        <div className="bg-[--bg-surface] p-4 rounded-lg border border-[--bg-border]">
          <label className="text-xs text-[--text-muted] font-medium">Receive (USDC)</label>
          <div className="flex justify-between items-center mt-1">
            <input 
              type="text" 
              placeholder="0.0" 
              value={quote ? (Number(quote.toAmount) / 1e6).toFixed(4) : ''} 
              disabled 
              className="bg-transparent text-2xl text-[--text-secondary] focus:outline-none w-full" 
            />
          </div>
        </div>

        <TradeInsight insightText={insight} mevRisk={mevRisk} isLoading={loading} />

        <div className="flex flex-col gap-2 mt-4">
          <button 
            onClick={handleGetQuoteAndAnalyze}
            disabled={loading || !amount}
            className="w-full bg-[--bg-elevated] border border-[--bg-border] hover:bg-slate-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Analyse Trade Risk
          </button>
          
          {quote && (
            riskLevel === 'safe' ? (
              <button 
                onClick={executeSwap}
                disabled={loading || !address}
                className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LockIcon className="w-4 h-4" />
                Execute Swap
              </button>
            ) : riskLevel === 'caution' ? (
              <button 
                onClick={executeSwap}
                disabled={loading || !address}
                className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <AlertTriangleIcon className="w-4 h-4" />
                Execute Swap — Elevated Risk
              </button>
            ) : (
              <button 
                onClick={executeSwap}
                disabled={loading || !address}
                className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-rose-700 animate-pulse ring-2 ring-red-500/50 flex items-center justify-center gap-2"
              >
                <ShieldAlertIcon className="w-4 h-4" />
                Proceed with Caution
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}
