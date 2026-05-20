'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TradeInsight } from './TradeInsight'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseUnits } from 'viem'
import { MevRiskProfile } from '@/lib/ai/mev-analyzer'

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
      // 1. Get real quote from our secure proxy
      const amountInWei = parseUnits(amount, 18).toString()
      const quoteRes = await fetch(`/api/swap/quote?src=${ETH_ADDRESS}&dst=${USDC_ADDRESS}&amount=${amountInWei}&chainId=1`);
      const quoteData = await quoteRes.json();
      
      if (!quoteRes.ok) throw new Error(quoteData.error || "Failed to fetch quote");
      setQuote(quoteData);

      // 2. Fetch AI trade insight automatically based on the quote parameters
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

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200">AI-Powered Swap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 bg-red-900/50 border border-red-800 text-red-200 text-sm rounded-md">{error}</div>}
        
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <label className="text-xs text-slate-500 font-medium">Pay (ETH)</label>
          <div className="flex justify-between items-center mt-1">
            <input 
              type="number" 
              placeholder="0.0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-2xl text-white focus:outline-none w-full" 
            />
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <label className="text-xs text-slate-500 font-medium">Receive (USDC)</label>
          <div className="flex justify-between items-center mt-1">
            <input 
              type="text" 
              placeholder="0.0" 
              value={quote ? (Number(quote.toAmount) / 1e6).toFixed(4) : ''} 
              disabled 
              className="bg-transparent text-2xl text-slate-500 focus:outline-none w-full" 
            />
          </div>
        </div>

        <TradeInsight insightText={insight} mevRisk={mevRisk} isLoading={loading} />

        <div className="flex gap-2 mt-4">
          <button 
            onClick={handleGetQuoteAndAnalyze}
            disabled={loading || !amount}
            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Get Quote
          </button>
          
          <button 
            onClick={executeSwap}
            disabled={loading || !quote || !address}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Execute Swap
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
