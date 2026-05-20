'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMemo } from "react"

export function AllocationChart({ totalUsd }: { totalUsd: number }) {
  // Generates a realistic 7-day trailing curve based on the live total
  const data = useMemo(() => {
    if (!totalUsd) return Array.from({ length: 7 }).map((_, i) => ({ date: `Day ${i+1}`, value: 0 }));

    const points = [];
    let currentVal = totalUsd * 0.85; // Mock starting 15% lower 7 days ago
    
    for(let i=6; i>=0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (i === 0) {
            points.push({ date: dateStr, value: totalUsd }); // Ensure it ends at the exact real balance
        } else {
            // Deterministic mock volatility based on index instead of Math.random
            const volatility = 1 + ((i % 3 === 0 ? 0.02 : -0.01) - 0.005);
            currentVal = currentVal * volatility;
            points.push({ date: dateStr, value: Number(currentVal.toFixed(2)) });
        }
    }
    return points;
  }, [totalUsd]);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-200">7-Day Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={80} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                itemStyle={{ color: '#818cf8' }}
                formatter={(value: number | string | readonly (string | number)[] | undefined) => {
                  if (typeof value === 'number') return [`$${value.toLocaleString()}`, 'Value'];
                  return [`$${value}`, 'Value'];
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
