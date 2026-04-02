import { InterviewConfig, ReportData, TranscriptItem } from "@/types";

const STORAGE_KEY = "interview-room-state-v2";

type SessionState = {
  config: InterviewConfig | null;
  transcript: TranscriptItem[];
  report: ReportData | null;
  notes: string;
  tabSwitchCount: number;
  pasteCount: number;
  endedByIntegrity: boolean;
};

const initialState: SessionState = {
  config: null,
  transcript: [],
  report: null,
  notes: "",
  tabSwitchCount: 0,
  pasteCount: 0,
  endedByIntegrity: false,
};

const isBrowser = () => typeof window !== "undefined";

export function getSessionState(): SessionState {
  if (!isBrowser()) return initialState;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      config: parsed.config ?? null,
      transcript: Array.isArray(parsed.transcript) ? parsed.transcript : [],
      report: parsed.report ?? null,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      tabSwitchCount: Number(parsed.tabSwitchCount ?? 0),
      pasteCount: Number(parsed.pasteCount ?? 0),
      endedByIntegrity: Boolean(parsed.endedByIntegrity),
    };
  } catch {
    return initialState;
  }
}

export function setSessionState(next: Partial<SessionState>) {
  if (!isBrowser()) return;

  const current = getSessionState();
  const merged: SessionState = {
    ...current,
    ...next,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function clearSessionState() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
