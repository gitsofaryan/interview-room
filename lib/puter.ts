import { InterviewConfig, ReportData, TranscriptItem } from "@/types";

export type InterviewSessionPayload = {
  config: InterviewConfig;
  transcript: TranscriptItem[];
  report?: ReportData;
  tabSwitchCount: number;
  pasteCount: number;
  notes: string;
  endedByIntegrity?: boolean;
};

const MAX_WAIT_MS = 15000;

export async function waitForPuter(timeoutMs = MAX_WAIT_MS): Promise<Puter> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (typeof window !== "undefined" && window.puter) {
      return window.puter;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Puter SDK did not initialize in time.");
}

export async function ensurePuterSignedIn(): Promise<Puter> {
  const client = await waitForPuter();
  const signedIn = await client.auth.isSignedIn();
  if (!signedIn) {
    await client.auth.signIn();
  }
  return client;
}

export function readChatText(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object") {
    const payload = result as {
      text?: unknown;
      message?: {
        content?: unknown;
      };
    };

    if (typeof payload.text === "string") {
      return payload.text;
    }

    const content = payload.message?.content;
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((entry) => {
          if (entry && typeof entry === "object" && "text" in entry) {
            const value = (entry as { text?: unknown }).text;
            return typeof value === "string" ? value : "";
          }
          return "";
        })
        .join("");
    }
  }

  return "";
}

export function readSpeechText(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object") {
    const payload = result as { text?: unknown; transcript?: unknown };
    if (typeof payload.text === "string") {
      return payload.text;
    }
    if (typeof payload.transcript === "string") {
      return payload.transcript;
    }
  }

  return "";
}

export function tryParseReport(raw: string): ReportData {
  const cleaned = raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonText =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  const parsed = JSON.parse(jsonText) as Partial<ReportData>;
  return {
    score: Number(parsed.score ?? 0),
    recommendation: parsed.recommendation,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    feedback:
      typeof parsed.feedback === "string"
        ? parsed.feedback
        : "No detailed feedback available.",
    roundScores:
      parsed.roundScores && typeof parsed.roundScores === "object"
        ? parsed.roundScores
        : {},
    improvementPlan: Array.isArray(parsed.improvementPlan)
      ? parsed.improvementPlan
      : [],
  };
}
