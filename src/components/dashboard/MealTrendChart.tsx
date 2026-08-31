"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export function MealTrendChart({ data }: { data: { date: string; meals: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No meals logged yet this month.</p>;
  }

  const chartData = data.map((d) => ({ ...d, day: d.date.slice(-2) }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          formatter={(value: number) => [value, "Meals"]}
        />
        <Bar dataKey="meals" fill="#16a350" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
