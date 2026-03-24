import { getDb } from "@/lib/db";
import { classifyMessages } from "@/lib/classify";
import type { SlackMessage } from "@/lib/slack";

export async function POST() {
  try {
    const db = getDb();

    // Fetch all stored messages
    const rows = db
      .prepare("SELECT id, text, slack_ts, user_id FROM feedback ORDER BY slack_ts ASC")
      .all() as { id: string; text: string; slack_ts: string; user_id: string | null }[];

    if (rows.length === 0) {
      return Response.json({ reclassified: 0 });
    }

    // Re-use the same classifier (Claude or keyword fallback)
    const messages: SlackMessage[] = rows.map((r) => ({
      ts: r.slack_ts,
      user: r.user_id ?? undefined,
      text: r.text,
      date: new Date(parseFloat(r.slack_ts) * 1000),
    }));

    const classified = await classifyMessages(messages);

    // Bulk-update all rows in a single transaction
    const update = db.prepare(
      "UPDATE feedback SET type = ?, feature_category = ?, summary = ? WHERE id = ?"
    );

    const updateAll = db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        update.run(
          classified[i].type,
          classified[i].feature_category,
          classified[i].summary,
          rows[i].id
        );
      }
    });

    updateAll();

    return Response.json({ reclassified: rows.length });
  } catch (error) {
    console.error("Reclassify error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
