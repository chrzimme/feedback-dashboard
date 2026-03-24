import { readFileSync } from "fs";
import path from "path";
import type { InsightsData, StaticFeedbackData } from "@/lib/types";
import { pivotFeatureOverTime } from "@/lib/featurePivot";
import Dashboard from "@/components/Dashboard";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

function getInsightsFromJson(): StaticFeedbackData {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "feedback.json");
    return JSON.parse(readFileSync(filePath, "utf-8")) as StaticFeedbackData;
  } catch {
    return {
      totalCount: 0, byType: [], byFeature: [], overTime: [],
      recentFeedback: [], featureOverTime: [], lastUpdated: null,
    };
  }
}

function getInsightsFromDb(): InsightsData {
  try {
    // Dynamic require so better-sqlite3 is only loaded in server/dev mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require("@/lib/db");
    const db = getDb();

    const totalCount = (
      db.prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number }
    ).count;

    const byType = db
      .prepare("SELECT type, COUNT(*) as count FROM feedback GROUP BY type ORDER BY count DESC")
      .all() as InsightsData["byType"];

    const byFeature = db
      .prepare(`
        SELECT feature_category, COUNT(*) as count,
          SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as bugs,
          SUM(CASE WHEN type = 'feature_request' THEN 1 ELSE 0 END) as feature_requests,
          SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) as comments
        FROM feedback GROUP BY feature_category ORDER BY count DESC
      `)
      .all() as InsightsData["byFeature"];

    const overTime = db
      .prepare(`
        SELECT date,
          SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as bugs,
          SUM(CASE WHEN type = 'feature_request' THEN 1 ELSE 0 END) as feature_requests,
          SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) as comments,
          COUNT(*) as total
        FROM feedback GROUP BY date ORDER BY date ASC
      `)
      .all() as InsightsData["overTime"];

    const recentFeedback = db
      .prepare(`
        SELECT id, date, type, feature_category, summary, text, slack_ts, channel_id
        FROM feedback ORDER BY slack_ts DESC LIMIT 50
      `)
      .all() as InsightsData["recentFeedback"];

    const rawFeatureOverTime = db.prepare(`
      SELECT date, feature_category, COUNT(*) as count
      FROM feedback GROUP BY date, feature_category ORDER BY date ASC
    `).all() as { date: string; feature_category: string; count: number }[];

    const featureOverTime = pivotFeatureOverTime(rawFeatureOverTime);

    return { totalCount, byType, byFeature, overTime, recentFeedback, featureOverTime };
  } catch {
    return { totalCount: 0, byType: [], byFeature: [], overTime: [], recentFeedback: [], featureOverTime: [] };
  }
}

export default function Home() {
  if (isStaticExport) {
    const data = getInsightsFromJson();
    return <Dashboard initial={data} readOnly lastUpdated={data.lastUpdated} />;
  }

  const data = getInsightsFromDb();
  return <Dashboard initial={data} />;
}
