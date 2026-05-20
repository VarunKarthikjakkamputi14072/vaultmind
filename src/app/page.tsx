'use client'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TokenTable } from "@/components/dashboard/TokenTable"
import { SwapWidget } from "@/components/swap/SwapWidget"
import { AllocationChart } from "@/components/dashboard/AllocationChart"
import { AllowanceManager } from "@/components/treasury/AllowanceManager"
import { BatchSend } from "@/components/treasury/BatchSend"
import { PortfolioInsights } from "@/components/dashboard/PortfolioInsights"
import { AutomationWidget } from "@/components/treasury/AutomationWidget"

export default function DashboardPage() {
  const { address: connectedAddress, isConnected } = useAccount()
  const [manualInput, setManualInput] = useState('')
  const [watchedAddress, setWatchedAddress] = useState('')
  const [netWorth, setNetWorth] = useState(0)
  const [tokens, setTokens] = useState<Record<string, unknown>[]>([])

  const activeAddress = watchedAddress || (isConnected ? connectedAddress : null)

  return (
    <main className="max-w-[1400px] mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Treasury Dashboard</h2>
        
        {/* The Search Bar lives here now */}
        <form onSubmit={(e) => { e.preventDefault(); setWatchedAddress(manualInput); }} className="flex gap-2">
          <input
            type="text"
            placeholder="Paste 0x address..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-slate-200 w-64 focus:border-indigo-500 outline-none"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md text-sm font-medium">View</button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AllocationChart totalUsd={netWorth} />
          <TokenTable 
            activeAddress={activeAddress} 
            onTotalCalculated={(val) => setNetWorth(val)} 
            onTokensLoaded={(t) => setTokens(t)} 
          />
        </div>
        <div className="space-y-6">
          <PortfolioInsights tokens={tokens} activeAddress={activeAddress} />
          <SwapWidget />
          <AllowanceManager />
          <BatchSend />
          <AutomationWidget tokens={tokens} activeAddress={activeAddress} />
        </div>
      </div>
    </main>
  )
}
