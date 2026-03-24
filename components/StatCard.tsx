"use client";

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-6 shadow-sm ${color}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
