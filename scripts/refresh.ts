/**
 * Data refresh script — run this weekly to pull the latest Slack feedback,
 * classify it, and write public/data/feedback.json for the static dashboard.
 *
 * Usage:
 *   npm run refresh
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load .env.local before importing any lib that reads env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { fetchMessages } from "../lib/slack";
import { classifyMessages } from "../lib/classify";
import { getDb } from "../lib/db";
import type { InsightsData } from "../app/api/insights/route";

export interface StaticFeedbackData extends InsightsData {
  lastUpdated: string | null;
}

async function main() {
  console.log("🔄 Starting Slack feedback refresh...\n");

  const channelId = process.env.SLACK_CHANNEL_ID;
  if (!channelId) throw new Error("SLACK_CHANNEL_ID not set in .env.local");

  const db = getDb();

  // --- 1. Incremental Slack fetch ---
  const syncState = db
    .prepare("SELECT last_ts FROM sync_state WHERE channel_id = ?")
    .get(channelId) as { last_ts: string } | undefined;

  const oldestTs = syncState?.last_ts ?? undefined;
  console.log(`📥 Fetching messages${oldestTs ? ` since ${new Date(parseFloat(oldestTs) * 1000).toLocaleDateString()}` : " (full history)"}...`);

  const messages = await fetchMessages(channelId, oldestTs);
  console.log(`   Found ${messages.length} new messages.`);

  if (messages.length > 0) {
    // --- 2. Classify ---
    console.log("🤖 Classifying messages...");
    const classified = await classifyMessages(messages);

    // --- 3. Store in SQLite ---
    const insert = db.prepare(`
      INSERT OR REPLACE INTO feedback
        (id, channel_id, user_id, text, slack_ts, date, type, feature_category, summary, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction(() => {
      for (const msg of classified) {
        insert.run(
          `${channelId}-${msg.ts}`,
          channelId,
          msg.user ?? null,
          msg.text,
          msg.ts,
          msg.date.toISOString().split("T")[0],
          msg.type,
          msg.feature_category,
          msg.summary,
          new Date().toISOString()
        );
      }
    });
    insertAll();

    // Update sync state
    const latestTs = messages[messages.length - 1].ts;
    db.prepare(
      "INSERT OR REPLACE INTO sync_state (channel_id, last_ts) VALUES (?, ?)"
    ).run(channelId, latestTs);

    console.log(`   ✅ Stored ${classified.length} classified messages.\n`);
  }

  // --- 4. Compute aggregations ---
  console.log("📊 Computing aggregations...");

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

  // --- 5. Write static JSON ---
  const output: StaticFeedbackData = {
    totalCount,
    byType,
    byFeature,
    overTime,
    recentFeedback,
    lastUpdated: new Date().toISOString(),
  };

  const outPath = path.resolve(process.cwd(), "public/data/feedback.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`   ✅ Wrote ${outPath}`);
  console.log(`\n✨ Done! ${totalCount} total feedback items.`);
  console.log(`   Run "npm run deploy" to publish the updated dashboard.\n`);
}

main().catch((err) => {
  console.error("❌ Refresh failed:", err);
  process.exit(1);
});
