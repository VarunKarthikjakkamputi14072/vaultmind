'use client'
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

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
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="glass-card gradient-border p-6 hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[--text-primary] font-semibold">Allowance Manager</h2>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Token Address (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-[--bg-surface] border border-[--bg-border] rounded-md px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--brand-from]"
        />
        <input
          type="text"
          placeholder="Spender Address (0x...)"
          value={spenderAddress}
          onChange={(e) => setSpenderAddress(e.target.value)}
          className="w-full bg-[--bg-surface] border border-[--bg-border] rounded-md px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--brand-from]"
        />
        
        <div className="flex justify-between items-center bg-[--bg-surface] p-3 rounded border border-[--bg-border]">
          <span className="text-sm text-[--text-secondary]">Current Allowance:</span>
          <span className="text-sm font-mono text-[--text-primary]">{allowanceDisplay}</span>
        </div>

        <button 
          onClick={handleRevoke}
          disabled={isPending || !allowanceData || allowanceData === BigInt(0)}
          className="w-full bg-red-900/50 hover:bg-red-900/80 disabled:opacity-50 text-red-200 font-medium py-2 rounded-lg transition-colors text-sm border border-red-800/50"
        >
          {isPending ? 'Revoking...' : 'Revoke Allowance'}
        </button>
      </div>
    </motion.div>
  )
}
