/** Pivot raw (date, feature_category, count) rows into recharts-friendly format */
export function pivotFeatureOverTime(
  rows: { date: string; feature_category: string; count: number }[]
): Array<Record<string, string | number>> {
  const dateMap = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    if (!dateMap.has(row.date)) dateMap.set(row.date, { date: row.date });
    dateMap.get(row.date)![row.feature_category] = row.count;
  }
  return Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}
