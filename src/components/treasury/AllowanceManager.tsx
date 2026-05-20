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
      className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[3px] border-[--bg-border] pb-4">
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Allowance Manager</h2>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Token Address (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-white border-[3px] border-black p-3 text-sm text-black focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold"
        />
        <input
          type="text"
          placeholder="Spender Address (0x...)"
          value={spenderAddress}
          onChange={(e) => setSpenderAddress(e.target.value)}
          className="w-full bg-white border-[3px] border-black p-3 text-sm text-black focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold"
        />
        
        <div className="flex justify-between items-center bg-white p-3 border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
          <span className="text-sm font-black uppercase text-black">Current Allowance:</span>
          <span className="text-sm font-mono font-bold text-black">{allowanceDisplay}</span>
        </div>

        <button 
          onClick={handleRevoke}
          disabled={isPending || !allowanceData || allowanceData === BigInt(0)}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all font-black py-3 uppercase tracking-wider text-sm mt-2"
        >
          {isPending ? 'Revoking...' : 'Revoke Allowance'}
        </button>
      </div>
    </motion.div>
  )
}
