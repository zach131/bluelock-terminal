// src/lib/grades.ts

import type { ClassData, GradeEntry, CourseLevel, QuarterID } from "@/types";
import { BASE_GEO_CREDITS, BASE_GEO_CREDIT_COUNT } from "./constants";

// ─── PART 1: THE WEIGHTED GRADE ENGINE ──────────────────────────────

/**
 * Calculates the numerical class grade (0-100) using the Weighted Category logic.
 * L1 (Advanced): 70% Summative / 30% Formative
 * L2 (On Level): 60% Summative / 40% Formative
 * OVERRIDE: Uses the grade directly.
 */
export function calculateClassGrade(
  entries: GradeEntry[],
  level: CourseLevel,
): number {
  if (entries.length === 0) return -1;
  if (level === "PF") return -1;

  // 1. CHECK FOR OVERRIDE (Quick Log)
  const override = entries.find((e) => e.category === "OVERRIDE");
  if (override) {
    return (override.earned / override.possible) * 100;
  }

  // 2. Separate Buckets
  const summatives = entries.filter((e) => e.category === "SUMMATIVE");
  const formatives = entries.filter((e) => e.category === "FORMATIVE");

  // 3. Average Buckets
  const sumAvg = averageBucket(summatives);
  const formAvg = averageBucket(formatives);

  // 4. Determine Weights
  let sumWeight = 0.7; // L1 Default
  let formWeight = 0.3; // L1 Default

  if (level === "L2") {
    sumWeight = 0.6;
    formWeight = 0.4;
  }

  // 5. Handle Empty Buckets (Safety)
  if (sumAvg === -1 && formAvg === -1) return -1;

  if (sumAvg === -1) {
    // No summatives, count formatives as 100%
    formWeight = 1.0;
    sumWeight = 0.0;
  }
  if (formAvg === -1) {
    // No formatives, count summatives as 100%
    sumWeight = 1.0;
    formWeight = 0.0;
  }

  // 6. Final Weighted Average
  return sumAvg * sumWeight + formAvg * formWeight;
}

function averageBucket(entries: GradeEntry[]): number {
  if (entries.length === 0) return -1;
  const totalEarned = entries.reduce((sum, e) => sum + e.earned, 0);
  const totalPossible = entries.reduce((sum, e) => sum + e.possible, 0);
  if (totalPossible === 0) return -1;
  return (totalEarned / totalPossible) * 100;
}

// ─── PART 2: THE POINTS GENERATOR ────────────────────────────────

export function calculatePoints(grade: number, level: CourseLevel): number {
  if (grade < 0) return -1;
  if (level === "L1") return grade * 0.1 - 4;
  return grade * 0.1 - 5;
}

// ─── PART 3: THE CALCULATION HIERARCHY ────────────────────────────

export function getClassQuarterGpa(
  entries: GradeEntry[],
  level: CourseLevel,
): number {
  const numericGrade = calculateClassGrade(entries, level);
  if (numericGrade < 0) return -1;
  return calculatePoints(numericGrade, level);
}

export function getQuarterGpa(
  classes: ClassData[],
  quarter: QuarterID,
): number {
  let totalPoints = 0;
  let validClassCount = 0;

  for (const cls of classes) {
    const entries = cls.grades?.[quarter] || [];
    const gpa = getClassQuarterGpa(entries, cls.level);

    if (gpa >= 0) {
      totalPoints += gpa;
      validClassCount++;
    }
  }

  return validClassCount > 0 ? totalPoints / validClassCount : -1;
}

export function getSemesterGpa(q1Gpa: number, q2Gpa: number): number {
  if (q1Gpa < 0 && q2Gpa < 0) return -1;
  if (q1Gpa < 0) return q2Gpa;
  if (q2Gpa < 0) return q1Gpa;
  return (q1Gpa + q2Gpa) / 2;
}

export function getYearGpa(sem1Gpa: number, sem2Gpa: number): number {
  if (sem1Gpa < 0 && sem2Gpa < 0) return -1;
  if (sem1Gpa < 0) return sem2Gpa;
  if (sem2Gpa < 0) return sem1Gpa;
  return (sem1Gpa + sem2Gpa) / 2;
}

// ─── PART 4: THE CUMULATIVE GPA ──────────────────────────────────

export function calculateCumulativeGpa(classes: ClassData[]): number {
  const q1 = getQuarterGpa(classes, "q1");
  const q2 = getQuarterGpa(classes, "q2");
  const q3 = getQuarterGpa(classes, "q3");
  const q4 = getQuarterGpa(classes, "q4");

  const sem1 = getSemesterGpa(q1, q2);
  const sem2 = getSemesterGpa(q3, q4);

  const yearGpa = getYearGpa(sem1, sem2);

  if (yearGpa < 0) {
    return BASE_GEO_CREDITS / BASE_GEO_CREDIT_COUNT;
  }

  const totalPoints = BASE_GEO_CREDITS + yearGpa;
  const totalCredits = BASE_GEO_CREDIT_COUNT + 1;

  return totalPoints / totalCredits;
}

// ─── HELPERS ─────────────────────────────────────────────────────

export function getCurrentAvg(cls: ClassData): number {
  const q3 = getQuarterGpa([cls], "q3");
  const q4 = getQuarterGpa([cls], "q4");
  const s2 = getSemesterGpa(q3, q4);
  if (s2 >= 0) return s2;

  const q1 = getQuarterGpa([cls], "q1");
  const q2 = getQuarterGpa([cls], "q2");
  return getSemesterGpa(q1, q2);
}

export function formatAvg(avg: number): string {
  return avg !== -1 ? avg.toFixed(2) : "--";
}

export function gradeColor(avg: number): string {
  if (avg < 0) return "var(--text-muted)";
  if (avg >= 5.5) return "var(--green-500)";
  if (avg >= 5.0) return "var(--cyan-500)";
  if (avg >= 4.0) return "var(--amber-500)";
  if (avg >= 3.0) return "var(--text-primary)";
  return "var(--red-500)";
}

export function classGpa(grade: number, level: CourseLevel): number {
  return calculatePoints(grade, level);
}

// ─── CALCULATOR HELPERS ──────────────────────────────────────────

export function cumulativeGpa(
  banked: number,
  bankedCr: number,
  cgpa: number,
  count: number,
): number {
  if (bankedCr + count === 0) return 0;
  return (banked * bankedCr + cgpa * count) / (bankedCr + count);
}

export function requiredForTarget(
  target: number,
  banked: number,
  bankedCr: number,
  count: number,
): number {
  if (count === 0) return 0;
  return (target * (bankedCr + count) - banked * bankedCr) / count;
}
