"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

// Consistent color palette for up to 19 feature categories
const PALETTE = [
  "#6366f1", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#06b6d4", "#84cc16", "#ef4444", "#3b82f6",
  "#10b981", "#a855f7", "#64748b", "#d97706", "#0ea5e9",
  "#78716c", "#22c55e", "#e11d48", "#7c3aed",
];

interface Props {
  data: Array<Record<string, string | number>>;
}

export default function FeaturesOverTime({ data }: Props) {
  // Derive all unique feature keys (everything except 'date')
  const allFeatures = useMemo(() => {
    const keys = new Set<string>();
    for (const row of data) {
      for (const k of Object.keys(row)) {
        if (k !== "date") keys.add(k);
      }
    }
    return Array.from(keys).sort();
  }, [data]);

  // Hidden features (toggled via legend click)
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Date range slider
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(Math.max(0, data.length - 1));

  const safeEnd = Math.min(endIdx, data.length - 1);
  const safeStart = Math.min(startIdx, safeEnd);

  const filtered = useMemo(
    () =>
      data.slice(safeStart, safeEnd + 1).map((d) => ({
        ...d,
        label: format(parseISO(String(d.date)), "MMM d"),
      })),
    [data, safeStart, safeEnd]
  );

  const dateLabel = (idx: number) =>
    data[idx] ? format(parseISO(String(data[idx].date)), "MMM d, yyyy") : "";

  function toggleFeature(feature: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(feature) ? next.delete(feature) : next.add(feature);
      return next;
    });
  }

  const visibleCount = allFeatures.length - hidden.size;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Features Over Time</h2>
        <div className="flex gap-2">
          {hidden.size > 0 && (
            <button
              onClick={() => setHidden(new Set())}
              className="text-xs text-indigo-500 hover:underline"
            >
              Show all ({hidden.size} hidden)
            </button>
          )}
          {visibleCount > 1 && (
            <button
              onClick={() => setHidden(new Set(allFeatures))}
              className="text-xs text-gray-400 hover:underline"
            >
              Hide all
            </button>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={filtered} margin={{ right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend
            onClick={(e) => toggleFeature(String(e.value))}
            wrapperStyle={{ cursor: "pointer", fontSize: 12 }}
            formatter={(value) => (
              <span style={{ opacity: hidden.has(String(value)) ? 0.35 : 1 }}>
                {value}
              </span>
            )}
          />
          {allFeatures.map((feature, idx) => (
            <Line
              key={feature}
              type="monotone"
              dataKey={feature}
              stroke={PALETTE[idx % PALETTE.length]}
              strokeWidth={hidden.has(feature) ? 0 : 2}
              dot={false}
              hide={hidden.has(feature)}
              activeDot={hidden.has(feature) ? false : { r: 4 }}
            />
          ))}
        </LineChart>
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
              onChange={(e) => setStartIdx(Math.min(Number(e.target.value), safeEnd - 1))}
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
              onChange={(e) => setEndIdx(Math.max(Number(e.target.value), safeStart + 1))}
              className="flex-1 accent-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-400 pt-1">
            Click feature names in the legend to show/hide individual lines.
          </p>
        </div>
      )}
    </div>
  );
}
