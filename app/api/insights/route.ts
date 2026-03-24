import { getDb } from "@/lib/db";

export interface InsightsData {
  totalCount: number;
  byType: { type: string; count: number }[];
  byFeature: { feature_category: string; count: number; bugs: number; feature_requests: number; comments: number }[];
  overTime: { date: string; bugs: number; feature_requests: number; comments: number; total: number }[];
  recentFeedback: {
    id: string;
    date: string;
    type: string;
    feature_category: string;
    summary: string;
    text: string;
    slack_ts: string;
    channel_id: string;
  }[];
}

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
