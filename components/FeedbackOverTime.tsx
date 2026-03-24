"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
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

const TYPE_KEYS = ["bugs", "feature_requests", "comments"] as const;
const TYPE_LABELS: Record<string, string> = {
  bugs: "Bugs",
  feature_requests: "Feature Requests",
  comments: "Comments",
};

// Map pie-chart type keys → over-time data keys
const TYPE_TO_KEY: Record<string, string> = {
  bug: "bugs",
  feature_request: "feature_requests",
  comment: "comments",
};

interface Props {
  data: DataPoint[];
  selectedType: string | null;
}

export default function FeedbackOverTime({ data, selectedType }: Props) {
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(Math.max(0, data.length - 1));

  // Keep slider bounds sane when data changes
  const safeEnd = Math.min(endIdx, data.length - 1);
  const safeStart = Math.min(startIdx, safeEnd);

  const filtered = useMemo(
    () => data.slice(safeStart, safeEnd + 1).map((d) => ({
      ...d,
      label: format(parseISO(d.date), "MMM d"),
    })),
    [data, safeStart, safeEnd]
  );

  const activeKey = selectedType ? TYPE_TO_KEY[selectedType] : null;

  const dateLabel = (idx: number) =>
    data[idx] ? format(parseISO(data[idx].date), "MMM d, yyyy") : "";

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Feedback Over Time
        {selectedType && (
          <span className="ml-2 text-sm font-normal text-gray-400">
            — {TYPE_LABELS[TYPE_TO_KEY[selectedType] ?? ""] ?? selectedType} only
          </span>
        )}
      </h2>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={filtered}>
          <defs>
            {TYPE_KEYS.map((key) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[key]} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLORS[key]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {TYPE_KEYS.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={TYPE_LABELS[key]}
              stroke={COLORS[key]}
              fill={`url(#grad-${key})`}
              strokeWidth={activeKey && activeKey !== key ? 1 : 2}
              opacity={activeKey && activeKey !== key ? 0.15 : 1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Date range slider */}
      {data.length > 1 && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Date range</span>
            <span className="font-medium text-gray-700">
              {dateLabel(safeStart)} → {dateLabel(safeEnd)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-right text-xs text-gray-400">From</span>
            <input
              type="range"
              min={0}
              max={data.length - 1}
              value={safeStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStartIdx(Math.min(v, safeEnd - 1));
              }}
              className="flex-1 accent-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-right text-xs text-gray-400">To</span>
            <input
              type="range"
              min={0}
              max={data.length - 1}
              value={safeEnd}
              onChange={(e) => {
                const v = Number(e.target.value);
                setEndIdx(Math.max(v, safeStart + 1));
              }}
              className="flex-1 accent-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
