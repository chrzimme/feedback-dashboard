"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DataPoint {
  date: string;
  bugs: number;
  feature_requests: number;
  comments: number;
  total: number;
}

const COLORS = {
  bugs: "#ef4444",
  feature_requests: "#3b82f6",
  comments: "#10b981",
};

export default function FeedbackOverTime({ data }: { data: DataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Feedback Over Time
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formatted}>
          <defs>
            {Object.entries(COLORS).map(([key, color]) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="bugs"
            name="Bugs"
            stroke={COLORS.bugs}
            fill={`url(#gradient-bugs)`}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="feature_requests"
            name="Feature Requests"
            stroke={COLORS.feature_requests}
            fill={`url(#gradient-feature_requests)`}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="comments"
            name="Comments"
            stroke={COLORS.comments}
            fill={`url(#gradient-comments)`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
