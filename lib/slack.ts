import { WebClient } from "@slack/web-api";

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

export interface SlackMessage {
  ts: string;
  user?: string;
  text: string;
  date: Date;
}

export async function fetchMessages(
  channelId: string,
  oldestTs?: string
): Promise<SlackMessage[]> {
  const messages: SlackMessage[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.conversations.history({
      channel: channelId,
      oldest: oldestTs,
      limit: 200,
      cursor,
    });

    for (const msg of response.messages ?? []) {
      if (!msg.ts || !msg.text || msg.subtype) continue;
      // Skip bot messages
      if (msg.bot_id) continue;

      messages.push({
        ts: msg.ts,
        user: msg.user,
        text: msg.text,
        date: new Date(parseFloat(msg.ts) * 1000),
      });
    }

    cursor = response.response_metadata?.next_cursor ?? undefined;
  } while (cursor);

  return messages;
}
