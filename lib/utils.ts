import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { InterviewConfig } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function makeId() {
  return Math.random().toString(36).substring(2, 11);
}

export function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function fallbackQuestion(config: InterviewConfig) {
  return `Hello ${config.name}, thanks for joining. To start, could you tell me about your background as a ${config.role} and some of the key projects you've worked on?`;
}
