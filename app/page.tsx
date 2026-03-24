import { readFileSync } from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import type { InsightsData } from "@/app/api/insights/route";
import type { StaticFeedbackData } from "@/scripts/refresh";
import Dashboard from "@/components/Dashboard";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

function getInsightsFromDb(): InsightsData {
  try {
    const db = getDb();

    const totalCount = (
      db.prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number }
    ).count;

    const byType = db
      .prepare("SELECT type, COUNT(*) as count FROM feedback GROUP BY type ORDER BY count DESC")
      .all() as InsightsData["byType"];

    const byFeature = db
      .prepare(`
        SELECT
          feature_category,
          COUNT(*) as count,
          SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as bugs,
          SUM(CASE WHEN type = 'feature_request' THEN 1 ELSE 0 END) as feature_requests,
          SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) as comments
        FROM feedback
        GROUP BY feature_category
        ORDER BY count DESC
      `)
      .all() as InsightsData["byFeature"];

    const overTime = db
      .prepare(`
        SELECT
          date,
          SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as bugs,
          SUM(CASE WHEN type = 'feature_request' THEN 1 ELSE 0 END) as feature_requests,
          SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) as comments,
          COUNT(*) as total
        FROM feedback
        GROUP BY date
        ORDER BY date ASC
      `)
      .all() as InsightsData["overTime"];

    const recentFeedback = db
      .prepare(`
        SELECT id, date, type, feature_category, summary, text, slack_ts, channel_id
        FROM feedback
        ORDER BY slack_ts DESC
        LIMIT 50
      `)
      .all() as InsightsData["recentFeedback"];

    return { totalCount, byType, byFeature, overTime, recentFeedback };
  } catch {
    return { totalCount: 0, byType: [], byFeature: [], overTime: [], recentFeedback: [] };
  }
}

function getInsightsFromJson(): StaticFeedbackData {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "feedback.json");
    return JSON.parse(readFileSync(filePath, "utf-8")) as StaticFeedbackData;
  } catch {
    return {
      totalCount: 0, byType: [], byFeature: [], overTime: [],
      recentFeedback: [], lastUpdated: null,
    };
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
