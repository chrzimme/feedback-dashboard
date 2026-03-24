import Anthropic from "@anthropic-ai/sdk";
import { SlackMessage } from "./slack";

export interface ClassifiedFeedback {
  ts: string;
  user?: string;
  text: string;
  date: Date;
  type: "bug" | "feature_request" | "comment";
  feature_category: string;
  summary: string;
}

interface Classification {
  type: "bug" | "feature_request" | "comment";
  feature_category: string;
  summary: string;
}

const BATCH_SIZE = 20;

// --- Keyword-based fallback ---

const BUG_KEYWORDS = [
  "bug", "crash", "broken", "error", "issue", "fix", "freeze", "freezing",
  "stuck", "glitch", "fail", "failed", "failing", "not working", "doesn't work",
  "won't", "can't", "cannot", "corrupted", "corrupt", "laggy", "lag",
  "missing", "disappeared", "lost", "wrong", "incorrect", "unexpected",
];

const FEATURE_KEYWORDS = [
  "feature", "request", "suggest", "suggestion", "would be great", "wish",
  "add", "please add", "could you add", "would love", "would be nice",
  "option to", "ability to", "allow", "support for", "need", "needs",
  "when will", "roadmap", "planned", "future", "enhancement", "improvement",
];

const FEATURE_CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: "Timeline",            keywords: ["timeline", "clip", "track", "playhead", "trim", "cut", "split", "sequence", "layer", "edit point", "ripple", "roll"] },
  { category: "Export",              keywords: ["export", "render", "output", "mp4", "mov", "file format", "codec", "encoding", "bitrate", "resolution", "download", "publish"] },
  { category: "Audio",               keywords: ["audio", "sound", "music", "volume", "mute", "waveform", "mixer", "voiceover", "narration", "separate audio", "ducking", "noise"] },
  { category: "Color",               keywords: ["color", "colour", "grade", "grading", "lut", "saturation", "brightness", "contrast", "hue", "exposure", "white balance", "tone"] },
  { category: "Effects",             keywords: ["effect", "filter", "blur", "glow", "vignette", "overlay", "blend mode"] },
  { category: "Transitions",         keywords: ["transition", "dissolve", "wipe", "crossfade", "cross dissolve", "fade to black"] },
  { category: "Animation",           keywords: ["keyframe", "animation", "animate", "motion path", "easing", "bezier"] },
  { category: "Import / Media",      keywords: ["import", "upload", "media", "footage", "asset", "drag and drop", "library", "media panel", "stock", "ingest", "proxy"] },
  { category: "Performance",         keywords: ["slow", "performance", "speed", "memory", "cpu", "gpu", "loading", "lag", "laggy", "freeze", "freezing", "crash", "hang", "stutter", "buffer"] },
  { category: "Playback",            keywords: ["playback", "play", "preview", "scrub", "watch", "buffer", "frame rate", "stuttering", "real-time"] },
  { category: "Titles & Graphics",   keywords: ["title", "text", "lower third", "graphic", "font", "typography", "caption bar", "credits"] },
  { category: "Captions",            keywords: ["caption", "subtitle", "closed caption", "subtitles", "srt", "vtt"] },
  { category: "Text-based Editing",  keywords: ["transcript", "text-based", "text based editing", "text edit"] },
  { category: "Templates",           keywords: ["template", "preset", "project template", "starter"] },
  { category: "Share & Commenting",  keywords: ["share", "comment", "collaborate", "team", "review", "permission", "invite", "link", "feedback", "approval"] },
  { category: "Settings",            keywords: ["setting", "preference", "shortcut", "hotkey", "keyboard shortcut", "preferences"] },
  { category: "Quick Cut",           keywords: ["quick cut", "auto edit", "automatic edit", "auto-edit"] },
  { category: "User Interface",      keywords: ["ui", "interface", "design", "layout", "button", "menu", "toolbar", "panel", "dark mode", "theme", "ux", "accessibility"] },
  { category: "Firefly",             keywords: ["firefly", "generative", "ai", "generate", "gen video", "gen audio", "gen extend"] },
];

function keywordClassify(text: string): Classification {
  const lower = text.toLowerCase();

  // Determine type
  const isBug = BUG_KEYWORDS.some((kw) => lower.includes(kw));
  const isFeature = FEATURE_KEYWORDS.some((kw) => lower.includes(kw));

  let type: Classification["type"] = "comment";
  if (isBug && !isFeature) type = "bug";
  else if (isFeature && !isBug) type = "feature_request";
  else if (isBug && isFeature) type = "bug"; // bugs take priority when ambiguous

  // Determine feature category
  let feature_category = "General";
  let bestScore = 0;
  for (const rule of FEATURE_CATEGORY_RULES) {
    const score = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      feature_category = rule.category;
    }
  }

  // Summary: first sentence or first 120 chars
  const firstSentence = text.split(/[.!?]/)[0].trim();
  const summary =
    firstSentence.length > 20 ? firstSentence.slice(0, 120) : text.slice(0, 120);

  return { type, feature_category, summary };
}

// --- Claude-based classification ---

async function classifyBatchWithClaude(
  messages: SlackMessage[]
): Promise<ClassifiedFeedback[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are analyzing customer feedback messages for a video editor app.
For each message below, classify it and extract key information.

Messages:
${messages.map((m, idx) => `[${idx}] ${m.text}`).join("\n\n")}

For each message, respond with a JSON array (one object per message, in order) with:
- "type": one of "bug" (something is broken), "feature_request" (asking for new functionality), or "comment" (general feedback, praise, questions)
- "feature_category": the video editor feature area this relates to. Must be one of: "Timeline", "Export", "Audio", "Color", "Effects", "Transitions", "Animation", "Import / Media", "Performance", "Playback", "Titles & Graphics", "Captions", "Text-based Editing", "Templates", "Share & Commenting", "Settings", "Quick Cut", "User Interface", "Firefly", "General"
- "summary": a concise 1-sentence summary of the feedback

Respond ONLY with the JSON array, no other text.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  let classifications: Classification[];
  try {
    const jsonText = content.text.trim().replace(/^```json\n?|```$/g, "");
    classifications = JSON.parse(jsonText);
  } catch {
    throw new Error(`Failed to parse classification response: ${content.text}`);
  }

  return messages.map((msg, idx) => ({
    ...msg,
    type: classifications[idx]?.type ?? "comment",
    feature_category: classifications[idx]?.feature_category ?? "General",
    summary: classifications[idx]?.summary ?? msg.text.slice(0, 120),
  }));
}

// --- Public entry point ---

export async function classifyMessages(
  messages: SlackMessage[]
): Promise<ClassifiedFeedback[]> {
  const useAI = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!useAI) {
    console.log("No ANTHROPIC_API_KEY found — using keyword-based classification.");
    return messages.map((msg) => ({ ...msg, ...keywordClassify(msg.text) }));
  }

  const results: ClassifiedFeedback[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const classified = await classifyBatchWithClaude(batch);
    results.push(...classified);
  }
  return results;
}
