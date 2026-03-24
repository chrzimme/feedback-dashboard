import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "feedback.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT,
      text TEXT NOT NULL,
      slack_ts TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bug', 'feature_request', 'comment')),
      feature_category TEXT NOT NULL,
      summary TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      channel_id TEXT PRIMARY KEY,
      last_ts TEXT
    );
  `);
}

export interface FeedbackRow {
  id: string;
  channel_id: string;
  user_id: string | null;
  text: string;
  slack_ts: string;
  date: string;
  type: "bug" | "feature_request" | "comment";
  feature_category: string;
  summary: string;
  synced_at: string;
}
