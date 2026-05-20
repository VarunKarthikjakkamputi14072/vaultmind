'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const CHART_COLOURS = ['#3B82F6','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444'];

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

export function AllocationChart({ tokens, totalUSD }: { tokens: Record<string, unknown>[], totalUSD: number }) {
  // Extract numeric USD value from the token objects
  const chartData = tokens.map(t => ({
    name: t.symbol,
    usdValue: parseFloat(String(t.usdValue).replace(/[$,]/g, '')) || 0
  })).filter(t => t.usdValue > 0);

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible" 
      className="glass-card gradient-border p-6 hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <h2 className="text-[--text-primary] font-semibold">Asset Allocation</h2>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              dataKey="usdValue"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', border: 'none', borderRadius: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-[--text-muted]">Total Value</p>
          <p className="text-xl font-bold text-[--text-primary]">
            ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
