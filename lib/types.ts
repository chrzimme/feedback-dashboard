/** Shared data types used by API routes, page.tsx, and the refresh script */

export interface InsightsData {
  totalCount: number;
  byType: { type: string; count: number }[];
  byFeature: {
    feature_category: string;
    count: number;
    bugs: number;
    feature_requests: number;
    comments: number;
  }[];
  overTime: {
    date: string;
    bugs: number;
    feature_requests: number;
    comments: number;
    total: number;
  }[];
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
  /** Pivoted: each row is { date, [featureCategory]: count, ... } */
  featureOverTime: Array<Record<string, string | number>>;
}

export interface StaticFeedbackData extends InsightsData {
  lastUpdated: string | null;
}
