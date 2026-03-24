"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

const TYPE_STYLES: Record<string, string> = {
  bug: "bg-red-100 text-red-700",
  feature_request: "bg-blue-100 text-blue-700",
  comment: "bg-green-100 text-green-700",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  comment: "Comment",
};

/** Build a deep-link URL to the original Slack message */
function buildSlackUrl(channelId: string, slackTs: string): string | null {
  if (!channelId || !slackTs) return null;
  // Slack URL format: https://app.slack.com/archives/{channelId}/p{ts_no_dot}
  const tsNoDot = slackTs.replace(".", "");
  return `https://app.slack.com/archives/${channelId}/p${tsNoDot}`;
}

interface Row {
  id: string;
  date: string;
  type: string;
  feature_category: string;
  summary: string;
  text: string;
  slack_ts: string;
  channel_id: string;
}

interface JiraTicketState {
  loading: boolean;
  key?: string;
  url?: string;
  error?: string;
}

interface Props {
  data: Row[];
  readOnly?: boolean;
}

export default function FeedbackTable({ data, readOnly = false }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [featureFilter, setFeatureFilter] = useState("all");
  const [jiraState, setJiraState] = useState<Record<string, JiraTicketState>>({});

  const features = Array.from(new Set(data.map((d) => d.feature_category))).sort();

  const filtered = data.filter((row) => {
    if (typeFilter !== "all" && row.type !== typeFilter) return false;
    if (featureFilter !== "all" && row.feature_category !== featureFilter) return false;
    return true;
  });

  async function createJiraTicket(row: Row) {
    setJiraState((prev) => ({ ...prev, [row.id]: { loading: true } }));

    const slackUrl = buildSlackUrl(row.channel_id, row.slack_ts);

    try {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: row.type,
          feature_category: row.feature_category,
          summary: row.summary,
          text: row.text,
          date: row.date,
          slack_url: slackUrl ?? undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setJiraState((prev) => ({
          ...prev,
          [row.id]: { loading: false, error: data.error ?? "Unknown error" },
        }));
        return;
      }

      setJiraState((prev) => ({
        ...prev,
        [row.id]: { loading: false, key: data.key, url: data.url },
      }));
    } catch (err) {
      setJiraState((prev) => ({
        ...prev,
        [row.id]: { loading: false, error: String(err) },
      }));
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Recent Feedback</h2>
        <div className="flex gap-2">
          <select
            className="rounded-lg border px-3 py-1.5 text-sm text-gray-700"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="bug">Bugs</option>
            <option value="feature_request">Feature Requests</option>
            <option value="comment">Comments</option>
          </select>
          <select
            className="rounded-lg border px-3 py-1.5 text-sm text-gray-700"
            value={featureFilter}
            onChange={(e) => setFeatureFilter(e.target.value)}
          >
            <option value="all">All features</option>
            {features.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Feature</th>
              <th className="pb-2 font-medium">Summary</th>
              <th className="pb-2 pl-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const slack = buildSlackUrl(row.channel_id, row.slack_ts);
              const jira = jiraState[row.id];

              return (
                <>
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  >
                    <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          TYPE_STYLES[row.type] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {TYPE_LABELS[row.type] ?? row.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.feature_category}</td>
                    <td className="py-3 text-gray-700">{row.summary}</td>

                    {/* Actions column */}
                    <td
                      className="py-3 pl-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {/* Slack deep-link */}
                        {slack && (
                          <a
                            href={slack}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View in Slack"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          >
                            <ExternalLink size={12} />
                            Slack
                          </a>
                        )}

                        {/* JIRA button / ticket badge — only in local dev mode */}
                        {!readOnly && jira?.key ? (
                          <a
                            href={jira.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            <ExternalLink size={12} />
                            {jira.key}
                          </a>
                        ) : !readOnly && jira?.error ? (
                          <span
                            title={jira.error}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 cursor-help"
                          >
                            Error
                          </span>
                        ) : !readOnly ? (
                          <button
                            onClick={() => createJiraTicket(row)}
                            disabled={jira?.loading}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {jira?.loading ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                                Creating…
                              </>
                            ) : (
                              "＋ JIRA"
                            )}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>

                  {expanded === row.id && (
                    <tr key={`${row.id}-expanded`} className="border-b bg-gray-50">
                      <td colSpan={5} className="px-2 py-3 text-gray-600 text-xs">
                        <strong>Original message:</strong> {row.text}
                        {jira?.error && (
                          <p className="mt-1 text-red-600">
                            <strong>JIRA error:</strong> {jira.error}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No feedback matches the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
