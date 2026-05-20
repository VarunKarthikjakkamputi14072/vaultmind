'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

const CHART_COLOURS = ['#eecb46','#2563EB','#7C3AED','#10B981','#F59E0B','#EF4444'];

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

export function AllocationChart({ tokens, totalUSD }: { tokens: Record<string, unknown>[], totalUSD: number }) {
  // Sort tokens by value descending and take top 5 for the chart
  const chartData = tokens
    .map((t: any) => ({
      name: t.symbol,
      usdValue: parseFloat(t.usd_value) || 0
    }))
    .filter(t => t.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 6);

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible" 
      className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[3px] border-[--bg-border] pb-4">
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Top Asset Allocation</h2>
      </div>

      <div className="relative w-full h-[240px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                width={70} 
                tick={{ fill: 'var(--text-primary)', fontWeight: 'bold', fontSize: 14 }} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Value']}
                contentStyle={{ background: 'var(--bg-elevated)', border: '3px solid var(--bg-border)', borderRadius: 0, boxShadow: '4px 4px 0 0 rgba(0,0,0,1)', fontWeight: 'bold' }}
              />
              <Bar dataKey="usdValue" barSize={32}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} stroke="var(--bg-border)" strokeWidth={3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-[--text-secondary] font-bold uppercase tracking-wider">
            No Assets to Display
          </div>
        )}
      </div>
    </motion.div>
  );
}
