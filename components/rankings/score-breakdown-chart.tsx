"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useTheme } from "@/lib/use-theme";

export interface BreakdownDatum {
  name: string;
  avg: number;
  blocked: boolean;
}

/** Horizontal bars of overall average per project. Blocked projects render in the danger tone. */
export function ScoreBreakdownChart({ data }: { data: BreakdownDatum[] }) {
  const { theme } = useTheme();
  // Recharts renders SVG (can't read CSS vars for tick fill), so pick per theme.
  const tickFill = theme === "dark" ? "#A7A7A2" : "#5A5A5A";
  const barFill = theme === "dark" ? "#6D98FF" : "#2563EB";
  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
        Score breakdown
      </div>
      <div className="mb-3 text-[13px] text-dim">Average judge score across all submissions.</div>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 8 }} barCategoryGap={14}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: tickFill, fontFamily: "var(--font-sans)" }}
          />
          <Bar dataKey="avg" radius={[0, 5, 5, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.blocked ? "#C0584E" : barFill} />
            ))}
            <LabelList
              dataKey="avg"
              position="right"
              className="fill-ink"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
