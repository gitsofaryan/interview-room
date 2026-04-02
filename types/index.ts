export type InterviewPersona = "CEO" | "CTO" | "HR" | "Engineering Manager";
export type InterviewDifficulty = "Easy" | "Medium" | "Hard" | "Practice";

export interface InterviewConfig {
  name: string;
  role: string;
  jd: string;
  persona: InterviewPersona;
  rounds: string[];
  difficulty: InterviewDifficulty;
  resumePath?: string;
}

export interface TranscriptItem {
  id: string;
  role: "interviewer" | "candidate";
  text: string;
}

export interface ReportData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  recommendation?: "Strong Hire" | "Hire" | "No Hire";
  roundScores: Record<string, number>;
  improvementPlan: string[];
}
