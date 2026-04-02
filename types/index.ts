export interface InterviewConfig {
  name: string;
  role: string;
  jd: string;
  persona: string;
  rounds: string[];
  difficulty: string;
  resumePath?: string;
}

export interface TranscriptItem {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
}

export interface ReportData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  roundScores: Record<string, number>;
  improvementPlan: string[];
}
