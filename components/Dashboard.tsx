"use client";

import { useState, useCallback } from "react";
import { RefreshCw, Tags } from "lucide-react";
import type { InsightsData } from "@/lib/types";
import StatCard from "./StatCard";
import FeedbackOverTime from "./FeedbackOverTime";
import TypeBreakdown from "./TypeBreakdown";
import FeatureBreakdown from "./FeatureBreakdown";
import FeedbackTable from "./FeedbackTable";

interface Props {
  initial: InsightsData;
  readOnly?: boolean;
  lastUpdated?: string | null;
}

export default function Dashboard({ initial, readOnly = false, lastUpdated }: Props) {
  const [data, setData] = useState<InsightsData>(initial);
  const [syncing, setSyncing] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const refreshInsights = useCallback(async () => {
    const insights = await fetch("/api/insights");
    setData(await insights.json());
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setSyncMsg(json.synced > 0 ? `Synced ${json.synced} new messages.` : "Already up to date.");
      await refreshInsights();
    } catch (err) {
      setSyncMsg(`Error: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  }, [refreshInsights]);

  const reclassify = useCallback(async () => {
    if (!confirm("This will re-classify all existing feedback with the updated categories. Continue?")) return;
    setReclassifying(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/reclassify", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reclassify failed");
      setSyncMsg(`Re-classified ${json.reclassified} messages.`);
      await refreshInsights();
    } catch (err) {
      setSyncMsg(`Error: ${String(err)}`);
    } finally {
      setReclassifying(false);
    }
  }, [refreshInsights]);

  const totalBugs = data.byType.find((t) => t.type === "bug")?.count ?? 0;
  const totalFeatureRequests = data.byType.find((t) => t.type === "feature_request")?.count ?? 0;
  const totalComments = data.byType.find((t) => t.type === "comment")?.count ?? 0;

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Feedback Dashboard</h1>
            <p className="text-sm text-gray-500">
              Video Editor · Slack feedback insights
              {formattedLastUpdated && (
                <span className="ml-2 text-gray-400">· Last updated {formattedLastUpdated}</span>
              )}
            </p>
          </div>

          {/* Only show sync/reclassify controls in local dev mode */}
          {!readOnly && (
            <div className="flex items-center gap-3">
              {syncMsg && <span className="text-sm text-gray-600">{syncMsg}</span>}
              <button
                onClick={reclassify}
                disabled={reclassifying || syncing}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <Tags size={16} className={reclassifying ? "animate-pulse" : ""} />
                {reclassifying ? "Re-classifying…" : "Re-classify All"}
              </button>
              <button
                onClick={sync}
                disabled={syncing || reclassifying}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync Slack"}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Feedback" value={data.totalCount} color="border-gray-200" />
          <StatCard label="Bugs" value={totalBugs} color="border-red-200" />
          <StatCard label="Feature Requests" value={totalFeatureRequests} color="border-blue-200" />
          <StatCard label="Comments" value={totalComments} color="border-green-200" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeedbackOverTime data={data.overTime} />
          </div>
          <TypeBreakdown data={data.byType} />
        </div>

        <FeatureBreakdown data={data.byFeature} />
        <FeedbackTable data={data.recentFeedback} readOnly={readOnly} />
      </main>
    </div>
  );
}
