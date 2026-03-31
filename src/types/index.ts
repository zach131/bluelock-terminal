// src/types/index.ts

export type SubjectID = "alg" | "csp" | "aphu" | "bio" | "eng" | "spa" | "band";

export type CourseLevel = "L1" | "L2" | "PF"; // L1=Advanced/AP, L2=OnLevel, PF=PassFail

// The Core Grade Unit
export interface GradeEntry {
  earned: number;
  possible: number;
  category: "SUMMATIVE" | "FORMATIVE" | "OVERRIDE"; // Added OVERRIDE
}

export type QuarterID = "q1" | "q2" | "q3" | "q4";

export interface ClassData {
  id: SubjectID;
  name: string;
  level: CourseLevel;
  grades: Record<QuarterID, GradeEntry[]>;
}

export interface GradesState {
  classes: ClassData[];
  rank: { current: number; total: number };
  activeQuarter: QuarterID; // NEW: Tracks which quarter is currently open
  lockedQuarters: QuarterID[]; // NEW: Archives immutable quarters
}

export interface Rival {
  id: string;
  rank: number;
  name: string;
  gpa: number;
  isConfirmed: boolean;
  type?: "REAL" | "SYNTHETIC";
  velocity?: number;
  volatility?: number;
  origin?: string;
  bio?: string;
  traits?: string[];
  avatar?: string;
}

export interface RivalsState {
  rivals: Rival[];
}

export type SaveStatus =
  | "idle"
  | "saved"
  | "saving"
  | "syncing"
  | "error"
  | "local";

export type LogType = "ok" | "err" | "info";

export interface LogEntry {
  type: LogType;
  msg: string;
}

export interface XpLogEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  userId: string;
}
