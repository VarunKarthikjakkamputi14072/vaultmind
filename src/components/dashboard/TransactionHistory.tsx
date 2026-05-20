'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

export function TransactionHistory({ activeAddress }: { activeAddress: string | null | undefined }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeAddress) return;
    
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/history?address=${activeAddress}`);
        const data = await res.json();
        if (isMounted && data.transactions) {
          setHistory(data.transactions);
        }
      } catch (e) {
        console.error("Failed to fetch history", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchHistory();
    // Poll every 10 seconds for new transactions
    const interval = setInterval(fetchHistory, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeAddress]);

  if (!activeAddress) return null;

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible"
      className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[3px] border-[--bg-border] pb-4">
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Transaction History</h2>
      </div>

      <div className="space-y-4">
        {loading && history.length === 0 ? (
           <div className="animate-pulse bg-gray-300 h-24 w-full border-[3px] border-black" />
        ) : history.length > 0 ? (
          <div className="space-y-3">
            {history.map((tx) => (
              <div key={tx.id} className="border-[3px] border-black bg-white p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-black">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-sm uppercase">{tx.type}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 ${tx.status === 'COMPLETED' ? 'bg-green-400 text-black' : tx.status === 'FAILED' ? 'bg-red-500 text-white' : 'bg-yellow-300 text-black'}`}>
                    {tx.status}
                  </span>
                </div>
                <div className="text-xs text-gray-700 flex justify-between">
                  <span>{tx.fromToken} → {tx.toToken}</span>
                  <span className="font-mono truncate w-24">{tx.txHash}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(tx.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-black leading-relaxed p-4 bg-white border-[3px] border-black text-center font-bold uppercase tracking-wider">
            No recent transactions
          </div>
        )}
      </div>
    </motion.div>
  );
}
