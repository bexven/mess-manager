"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/constants";

const COLORS = ["#16a350", "#4ade87", "#f59e0b", "#38bdf8", "#f472b6", "#a78bfa", "#fb7185", "#94a3b8"];

export function CategoryChart({ data }: { data: { category: string; amount: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No expenses recorded yet this month.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
