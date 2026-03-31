// src/lib/constants.ts

import type { SubjectID, CourseLevel } from "@/types";

export interface SubjectDef {
  name: string;
  id: SubjectID;
  key: string;
  level: CourseLevel;
}

export const SUBJECTS: SubjectDef[] = [
  { name: "Algebra II", id: "alg", key: "m", level: "L1" },
  { name: "AP CSP", id: "csp", key: "cs", level: "L1" },
  { name: "AP Human Geo", id: "aphu", key: "h", level: "L1" },
  { name: "Biology", id: "bio", key: "b", level: "L1" },
  { name: "English 1", id: "eng", key: "e", level: "L1" },
  { name: "Spanish 2", id: "spa", key: "s", level: "L1" },
  { name: "Varsity Band", id: "band", key: "vb", level: "L2" },
];

export const SUBJECT_BY_ID: Record<SubjectID, SubjectDef> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
) as Record<SubjectID, SubjectDef>;

export const SUBJECT_BY_KEY: Record<string, SubjectDef> = Object.fromEntries(
  SUBJECTS.map((s) => [s.key, s]),
);

export const BASE_GEO_CREDITS = 5.5;
export const BASE_GEO_CREDIT_COUNT = 1.0;

export const XP_VALUES = {
  GRADE_ENTRY: 10,
  QUARTER_COMPLETE: 50,
  SEMESTER_COMPLETE: 100,
  RIVAL_LOGGED: 15,
  GPA_IMPROVEMENT: 25,
  STREAK_DAY: 10,
  STREAK_7_BONUS: 200,
  STREAK_BROKEN: -50,
  NEURAL_OBSERVE: 15,
  NEURAL_COMPLETE: 50,
  FOCUS_MINUTE: 10,
  WORKOUT_LOGGED: 25,
  PROJECT_COMPLETE: 50,
  COMMIT_LOGGED: 5,
} as const;

export const GRADE_THRESHOLDS = [
  { min: 97, color: "var(--green-500)" },
  { min: 93, color: "var(--green-500)" },
  { min: 90, color: "var(--cyan-500)" },
  { min: 87, color: "var(--cyan-500)" },
  { min: 83, color: "var(--amber-500)" },
  { min: 80, color: "var(--amber-500)" },
  { min: 77, color: "var(--amber-500)" },
  { min: 73, color: "var(--red-500)" },
  { min: 70, color: "var(--red-500)" },
  { min: 0, color: "var(--red-500)" },
] as const;
