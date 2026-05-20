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
    <>
      <div className="mesh-bg" />
      <main className="relative z-0 max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-[--text-primary]">Treasury Dashboard</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); setWatchedAddress(manualInput); }} className="flex gap-2">
            <input
              type="text"
              placeholder="Paste 0x address..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="bg-[--bg-elevated] border-[3px] border-[--bg-border] rounded-none px-3 py-1.5 text-sm text-[--text-primary] w-64 outline-none"
            />
            <button type="submit" className="px-4 py-1.5 text-sm">View</button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <p className="text-sm text-[--text-secondary] mb-2 uppercase font-bold tracking-wider">Total Net Worth</p>
              <p className="text-4xl font-black text-[--text-primary]">
                ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <AllowanceManager />
            <BatchSend />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <AllocationChart tokens={tokens} totalUSD={netWorth} />
            <TokenTable 
              activeAddress={activeAddress} 
              onTotalCalculated={(val) => setNetWorth(val)} 
              onTokensLoaded={(t) => setTokens(t)} 
            />
          </div>

          {/* Right Sidebar (AI & Actions) */}
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <PortfolioInsights tokens={tokens} activeAddress={activeAddress} />
              <AutomationWidget tokens={tokens} activeAddress={activeAddress} />
            </div>
            <SwapWidget />
          </div>
        </div>
      </main>
    </>
  )
}
