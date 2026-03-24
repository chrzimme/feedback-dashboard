"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts";

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
  selectedType: string | null;
  onTypeSelect: (type: string | null) => void;
}

// Renders an enlarged active slice
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

export default function TypeBreakdown({ data, selectedType, onTypeSelect }: Props) {
  const formatted = data.map((d) => ({
    name: TYPE_LABELS[d.type] ?? d.type,
    value: d.count,
    color: TYPE_COLORS[d.type] ?? "#9ca3af",
    type: d.type,
  }));

  const activeIndex = selectedType
    ? formatted.findIndex((d) => d.type === selectedType)
    : undefined;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">By Type</h2>
        {selectedType && (
          <button
            onClick={() => onTypeSelect(null)}
            className="text-xs text-indigo-500 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      {selectedType && (
        <p className="mb-2 text-xs text-gray-400">
          Filtering: <span className="font-medium text-gray-600">{TYPE_LABELS[selectedType]}</span>
        </p>
      )}
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...(activeIndex !== undefined ? { activeIndex, activeShape: ActiveShape } as any : {})}
            onClick={(_entry, index) => {
              const type = formatted[index]?.type ?? null;
              if (type) onTypeSelect(selectedType === type ? null : type);
            }}
            style={{ cursor: "pointer" }}
          >
            {formatted.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.color}
                opacity={selectedType && selectedType !== entry.type ? 0.25 : 1}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} messages`, ""]} />
          <Legend
            onClick={(e) => {
              // Find matching type key from label
              const type = Object.entries(TYPE_LABELS).find(([, v]) => v === e.value)?.[0] ?? null;
              if (type) onTypeSelect(selectedType === type ? null : type);
            }}
            wrapperStyle={{ cursor: "pointer" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
