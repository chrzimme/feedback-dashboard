import { getDb } from "@/lib/db";
import { fetchMessages } from "@/lib/slack";
import { classifyMessages } from "@/lib/classify";

const CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

export async function POST() {
  try {
    const db = getDb();

    // Get last synced timestamp for incremental sync
    const syncState = db
      .prepare("SELECT last_ts FROM sync_state WHERE channel_id = ?")
      .get(CHANNEL_ID) as { last_ts: string } | undefined;

    const oldestTs = syncState?.last_ts;

    // Fetch new messages from Slack
    const messages = await fetchMessages(CHANNEL_ID, oldestTs);

    if (messages.length === 0) {
      return Response.json({ synced: 0, message: "No new messages" });
    }

    // Classify with Claude
    const classified = await classifyMessages(messages);

    // Persist to SQLite
    const insert = db.prepare(`
      INSERT OR REPLACE INTO feedback
        (id, channel_id, user_id, text, slack_ts, date, type, feature_category, summary, synced_at)
      VALUES
        (@id, @channel_id, @user_id, @text, @slack_ts, @date, @type, @feature_category, @summary, @synced_at)
    `);

    const insertMany = db.transaction((items: typeof classified) => {
      for (const item of items) {
        insert.run({
          id: item.ts,
          channel_id: CHANNEL_ID,
          user_id: item.user ?? null,
          text: item.text,
          slack_ts: item.ts,
          date: item.date.toISOString().split("T")[0],
          type: item.type,
          feature_category: item.feature_category,
          summary: item.summary,
          synced_at: new Date().toISOString(),
        });
      }
    });

    insertMany(classified);

    // Update sync state to the latest message ts
    const latestTs = messages.reduce(
      (max, m) => (m.ts > max ? m.ts : max),
      oldestTs ?? "0"
    );

    db.prepare(
      "INSERT OR REPLACE INTO sync_state (channel_id, last_ts) VALUES (?, ?)"
    ).run(CHANNEL_ID, latestTs);

    return Response.json({ synced: classified.length });
  } catch (error) {
    console.error("Sync error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
