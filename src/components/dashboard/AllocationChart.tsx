'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const CHART_COLOURS = ['#eecb46','#2563EB','#7C3AED','#10B981','#F59E0B','#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'];

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomBarLabel = (props: any, symbol: string) => {
  const { x, y, width, height, value } = props;
  if (!value || width < 50) return null; // hide label if the box is too narrow
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#000" textAnchor="middle" dy={4} fontWeight="900" fontSize={13} className="uppercase">
      {symbol}
    </text>
  );
};

export function AllocationChart({ tokens }: { tokens: Record<string, unknown>[], totalUSD?: number }) {
  
  const { chartData, allSymbols } = useMemo(() => {
    // 1. Group by network (chain)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const networks: Record<string, Record<string, any>> = {};
    const symbols = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokens.forEach((t: Record<string, any>) => {
      const chain = (t.chain || 'Unknown').toUpperCase();
      const symbol = t.symbol || 'UNK';
      const value = parseFloat(t.usd_value) || 0;
      
      if (value > 0.01) {
        if (!networks[chain]) networks[chain] = { network: chain, total: 0 };
        networks[chain][symbol] = (networks[chain][symbol] || 0) + value;
        networks[chain].total += value;
        symbols.add(symbol);
      }
    });

    const data = Object.values(networks).sort((a, b) => b.total - a.total);
    return { chartData: data, allSymbols: Array.from(symbols) };
  }, [tokens]);

  return (
    <motion.div 
      variants={cardVariants} 
      initial="hidden" 
      animate="visible" 
      className="bg-[--bg-elevated] border-[3px] border-[--bg-border] p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[3px] border-[--bg-border] pb-4">
        <h2 className="text-xl font-black text-[--text-primary] uppercase tracking-wide">Network Allocation</h2>
      </div>

      <div className="relative w-full h-[280px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="network" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                width={85} 
                tick={{ fill: 'var(--text-primary)', fontWeight: 'bold', fontSize: 13 }} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                contentStyle={{ background: 'var(--bg-elevated)', border: '3px solid var(--bg-border)', borderRadius: 0, boxShadow: '4px 4px 0 0 rgba(0,0,0,1)', fontWeight: 'bold' }}
              />
              {allSymbols.map((symbol, idx) => (
                <Bar key={symbol} dataKey={symbol} stackId="a" fill={CHART_COLOURS[idx % CHART_COLOURS.length]} barSize={38} stroke="var(--bg-border)" strokeWidth={2}>
                  <LabelList dataKey={symbol} content={(props) => renderCustomBarLabel(props, symbol)} />
                </Bar>
              ))}
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
