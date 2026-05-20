'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWriteContract, useAccount } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'

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
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200">Send Assets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && <div className="text-xs text-indigo-400 bg-indigo-950 p-2 rounded">{status}</div>}
        <input
          type="text"
          placeholder="Token Address (0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Recipient (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            placeholder="Decimals"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            className="w-20 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={isPending || !tokenAddress || !recipient || !amount}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors text-sm"
        >
          {isPending ? 'Sending...' : 'Send Asset'}
        </button>
      </CardContent>
    </Card>
  )
}
