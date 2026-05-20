'use client'
import { useState } from 'react'
import { useWriteContract, useAccount } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'
import { motion } from 'framer-motion'
import { SendIcon } from 'lucide-react'

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

export function BatchSend() {
  const { address } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [decimals, setDecimals] = useState('18')
  
  const { writeContractAsync, isPending } = useWriteContract()
  const [status, setStatus] = useState<string | null>(null)

  const handleSend = async () => {
    if (!address) return setStatus('Wallet not connected');
    setStatus(null);
    try {
      const amountInWei = parseUnits(amount, Number(decimals));
      await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountInWei],
      });
      setStatus('Transfer submitted!');
      setAmount('');
    } catch (e: unknown) {
      setStatus('Transfer failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="glass-card gradient-border p-6 hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <SendIcon className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[--text-primary] font-semibold">Send Assets</h2>
      </div>

      <div className="space-y-4">
        {status && <div className="text-xs text-[--brand-from] bg-indigo-950 p-2 rounded">{status}</div>}
        <input
          type="text"
          placeholder="Token Address (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-[--bg-surface] border border-[--bg-border] rounded-md px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--brand-from]"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Recipient (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="flex-1 bg-[--bg-surface] border border-[--bg-border] rounded-md px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--brand-from]"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-[--bg-surface] border border-[--bg-border] rounded-md px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--brand-from]"
          />
          <input
            type="number"
            placeholder="Decimals"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            className="w-20 bg-[--bg-surface] border border-[--bg-border] rounded-md px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--brand-from]"
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={isPending || !tokenAddress || !recipient || !amount}
          className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
        >
          {isPending ? 'Sending...' : 'Send Asset'}
        </button>
      </div>
    </motion.div>
  )
}
