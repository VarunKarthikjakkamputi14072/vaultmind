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
      className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[3px] border-[--bg-border] pb-4">
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Send Assets</h2>
      </div>

      <div className="space-y-4">
        {status && <div className="text-xs text-white bg-indigo-950 border-[3px] border-black p-3 font-bold uppercase">{status}</div>}
        <input
          type="text"
          placeholder="Token Address (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-white border-[3px] border-[--bg-border] p-3 text-sm text-black focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Recipient (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="flex-1 bg-white border-[3px] border-[--bg-border] p-3 text-sm text-black focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-white border-[3px] border-[--bg-border] p-3 text-sm text-black focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold"
          />
          <input
            type="number"
            placeholder="Decimals"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            className="w-24 bg-white border-[3px] border-[--bg-border] p-3 text-sm text-black focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold"
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={isPending || !tokenAddress || !recipient || !amount}
          className="w-full bg-[#10B981] hover:bg-[#059669] text-black border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] disabled:opacity-50 transition-all text-sm font-black py-3 uppercase tracking-wider mt-2"
        >
          {isPending ? 'Sending...' : 'Send Asset'}
        </button>
      </div>
    </motion.div>
  )
}
