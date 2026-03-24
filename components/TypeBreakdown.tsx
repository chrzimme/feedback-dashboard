"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
  bug: "#ef4444",
  feature_request: "#3b82f6",
  comment: "#10b981",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  comment: "Comment",
};

interface Props {
  data: { type: string; count: number }[];
}

export default function TypeBreakdown({ data }: Props) {
  const formatted = data.map((d) => ({
    name: TYPE_LABELS[d.type] ?? d.type,
    value: d.count,
    color: TYPE_COLORS[d.type] ?? "#9ca3af",
  }));

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">By Type</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {formatted.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} messages`, ""]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
