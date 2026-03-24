import { exec } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const JIRA_SCRIPTS_DIR = "/Users/chrzimme/.claude/skills/jira/scripts";
const JIRA_PROJECT = "DVAWV";
const JIRA_BASE_URL = "https://jira.corp.adobe.com/browse";

const TYPE_TO_JIRA: Record<string, string> = {
  bug: "Bug",
  feature_request: "Story",
  comment: "Task",
};

/** Maps dashboard feature categories → exact DVAWV Jira component names */
const FEATURE_TO_COMPONENT: Record<string, string> = {
  "Timeline":            "Timeline (web)",
  "Export":              "Export (web)",
  "Audio":               "Audio (web)",
  "Color":               "Color (web)",
  "Effects":             "Effects (web)",
  "Transitions":         "Transitions (web)",
  "Animation":           "Animation / Keyframes (web)",
  "Import / Media":      "Import (web)",
  "Performance":         "Performance (web)",
  "Playback":            "Playback (web)",
  "Titles & Graphics":   "Titles (Text) / Graphics (web)",
  "Captions":            "Captions (web)",
  "Text-based Editing":  "Text-based Editing / Transcript (web)",
  "Templates":           "Templates (web)",
  "Share & Commenting":  "Share / Commenting (web)",
  "Settings":            "Settings / Preferences (web)",
  "Quick Cut":           "Quick cut (web)",
  "User Interface":      "User Interface / Experience (web)",
  "Firefly":             "Firefly – Gen video (web)",
  "General":             "User Interface / Experience (web)",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  comment: "Comment",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, feature_category, summary, text, date, slack_url } = body as {
      type: string;
      feature_category: string;
      summary: string;
      text: string;
      date: string;
      slack_url?: string;
    };

    const issueType = TYPE_TO_JIRA[type] ?? "Task";
    const typeLabel = TYPE_LABELS[type] ?? type;

    // Build Wiki-syntax description
    const descLines = [
      "h3. Summary",
      summary,
      "",
      "h3. Feedback Details",
      `*Type:* ${typeLabel}`,
      `*Feature Area:* ${feature_category}`,
      `*Date Received:* ${date}`,
      "",
      "h3. Original Customer Message",
      "{quote}",
      text,
      "{quote}",
    ];

    if (slack_url) {
      descLines.push("", "h3. Source", `[View original message in Slack|${slack_url}]`);
    }

    const description = descLines.join("\n");

    // Write description to a temp file (avoids shell escaping issues with long text)
    const tmpFile = join(tmpdir(), `jira_desc_${Date.now()}.txt`);
    await writeFile(tmpFile, description, "utf-8");

    try {
      // Safely escape the summary for the shell arg
      const safeSummary = summary.replace(/"/g, '\\"').replace(/`/g, "\\`");

      // Map feature category to the exact DVAWV component name
      const component = FEATURE_TO_COMPONENT[feature_category] ?? "User Interface / Experience (web)";

      const args = [
        `python3 "${JIRA_SCRIPTS_DIR}/jira_create.py"`,
        `--project ${JIRA_PROJECT}`,
        `--summary "${safeSummary}"`,
        `--description-file "${tmpFile}"`,
        `--type ${issueType}`,
        `--components "${component}"`,
        `--labels customer-feedback`,
        `--team-dropdown-id 160440`,        // Unassigned (update once team is confirmed)
        `--product-solution-id 156130`,     // Squirrel
        ...(type === "bug" ? [`--method-found "33628"`, `--priority Major`] : []),  // 33628 = Customer Report
      ].join(" ");

      const { stdout, stderr } = await execAsync(args, {
        cwd: JIRA_SCRIPTS_DIR,
        env: { ...process.env },
        timeout: 30000,
      });

      // Parse ticket key from script output: "✅ Created Bug: DVAWV-12345"
      const keyMatch = stdout.match(/Created \w+: ([A-Z]+-\d+)/);
      if (!keyMatch) {
        console.error("JIRA stdout:", stdout);
        console.error("JIRA stderr:", stderr);
        return Response.json(
          { error: "Could not parse JIRA ticket key", stdout, stderr },
          { status: 500 }
        );
      }

      const key = keyMatch[1];
      const url = `${JIRA_BASE_URL}/${key}`;

      return Response.json({ key, url });
    } finally {
      // Clean up temp file
      await unlink(tmpFile).catch(() => {});
    }
  } catch (error) {
    console.error("JIRA create error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
