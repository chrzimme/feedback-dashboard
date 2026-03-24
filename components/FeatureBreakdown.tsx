"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface FeatureRow {
  feature_category: string;
  count: number;
  bugs: number;
  feature_requests: number;
  comments: number;
}

// Dynamic height: 44px per row + room for legend/axes
const ROW_HEIGHT = 44;
const CHART_PADDING = 80;

export default function FeatureBreakdown({ data }: { data: FeatureRow[] }) {
  const chartHeight = data.length * ROW_HEIGHT + CHART_PADDING;

  // Longest label → dynamic Y axis width
  const maxLabelLen = Math.max(...data.map((d) => d.feature_category.length), 10);
  const yAxisWidth = Math.min(Math.max(maxLabelLen * 7, 100), 200);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Feedback by Feature Category
      </h2>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="feature_category"
            width={yAxisWidth}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="bugs" name="Bugs" stackId="a" fill="#ef4444" />
          <Bar dataKey="feature_requests" name="Feature Requests" stackId="a" fill="#3b82f6" />
          <Bar dataKey="comments" name="Comments" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
