'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'

export function AllowanceManager() {
  const { address } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [spenderAddress, setSpenderAddress] = useState('')

  const { data: allowanceData, refetch } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!tokenAddress && !!spenderAddress && tokenAddress.length === 42 && spenderAddress.length === 42
    }
  })

  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && tokenAddress.length === 42 }
  })

  const { writeContractAsync, isPending } = useWriteContract()

  const handleRevoke = async () => {
    try {
      await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, BigInt(0)],
      })
      refetch()
    } catch (e) {
      console.error(e)
    }
  }

  const allowanceDisplay = allowanceData !== undefined && decimals !== undefined 
    ? formatUnits(allowanceData, decimals) 
    : '---';

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200">Allowance Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="text"
          placeholder="Token Address (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder="Spender Address (0x...)"
          value={spenderAddress}
          onChange={(e) => setSpenderAddress(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        
        <div className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
          <span className="text-sm text-slate-400">Current Allowance:</span>
          <span className="text-sm font-mono text-slate-200">{allowanceDisplay}</span>
        </div>

        <button 
          onClick={handleRevoke}
          disabled={isPending || !allowanceData || allowanceData === BigInt(0)}
          className="w-full bg-red-900/50 hover:bg-red-900/80 disabled:opacity-50 text-red-200 font-medium py-2 rounded-lg transition-colors text-sm border border-red-800/50"
        >
          {isPending ? 'Revoking...' : 'Revoke Allowance'}
        </button>
      </CardContent>
    </Card>
  )
}
