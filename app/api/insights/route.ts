import { getDb } from "@/lib/db";
import type { InsightsData } from "@/lib/types";

export type { InsightsData };

export async function GET() {
  try {
    const db = getDb();

    const totalCount = (
      db.prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number }
    ).count;

    const byType = db
      .prepare(
        "SELECT type, COUNT(*) as count FROM feedback GROUP BY type ORDER BY count DESC"
      )
      .all() as { type: string; count: number }[];

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

    return Response.json({
      totalCount,
      byType,
      byFeature,
      overTime,
      recentFeedback,
    } satisfies InsightsData);
  } catch (error) {
    console.error("Insights error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
