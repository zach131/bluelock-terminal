// src/lib/dailyDirectives.ts

import { getGlobalXp, addGlobalXp } from "@/lib/globalXp";
import { levelFromXp } from "@/lib/xp";

export type DirectiveType = "ACADEMICS" | "FOCUS" | "BODY" | "MIND";

export interface Directive {
  id: string;
  type: DirectiveType;
  title: string;
  description: string;
  reward: number;
  penaltyMultiplier: number;
  completed: boolean;
  expiresAt: string;
}

const DIRECTIVE_KEY = "blt_daily_directive";

function getNormalizedScore(
  type: DirectiveType,
  userData: {
    gpa: number;
    weeklyFocusHours: number;
    flowStreak: number;
    neuralCount: number;
  },
): number {
  switch (type) {
    case "ACADEMICS":
      return Math.min(userData.gpa / 6.0, 1);
    case "FOCUS":
      return Math.min(userData.weeklyFocusHours / 20, 1);
    case "BODY":
      return Math.min(userData.flowStreak / 7, 1);
    case "MIND":
      return Math.min(userData.neuralCount / 5, 1);
  }
}

function getWeakestStat(userData: {
  gpa: number;
  weeklyFocusHours: number;
  flowStreak: number;
  neuralCount: number;
}): DirectiveType {
  const types: DirectiveType[] = ["ACADEMICS", "FOCUS", "BODY", "MIND"];
  let weakest = types[0];
  let lowest = Infinity;

  for (const type of types) {
    const score = getNormalizedScore(type, userData);
    if (score < lowest) {
      lowest = score;
      weakest = type;
    }
  }

  return weakest;
}

function getExpiresAt(): string {
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 1);
  expires.setHours(3, 0, 0, 0);
  return expires.toISOString();
}

export function generateDirective(userData: {
  gpa: number;
  weeklyFocusHours: number;
  flowStreak: number;
  neuralCount: number;
}): Directive {
  const weakest = getWeakestStat(userData);

  const templates: Record<
    DirectiveType,
    { title: string; description: string }
  > = {
    ACADEMICS: {
      title: "THREAT ENGINE PROTOCOL",
      description: "Log 3 grades in any subject.",
    },
    FOCUS: {
      title: "OVERCLOCK PROTOCOL",
      description: "Complete 1 hour of Deep Work.",
    },
    BODY: {
      title: "BIOLOGICAL LEDGER",
      description: "Log a workout session.",
    },
    MIND: {
      title: "NEURAL LINK PROTOCOL",
      description: "Extract 1 quality from a character.",
    },
  };

  const template = templates[weakest];

  const directive: Directive = {
    id: `dir_${Date.now()}`,
    type: weakest,
    title: template.title,
    description: template.description,
    reward: 50,
    penaltyMultiplier: 2.0,
    completed: false,
    expiresAt: getExpiresAt(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(DIRECTIVE_KEY, JSON.stringify(directive));
  }

  return directive;
}

export function getActiveDirective(): Directive | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(DIRECTIVE_KEY);
  if (!raw) return null;

  try {
    const directive: Directive = JSON.parse(raw);
    return directive;
  } catch {
    return null;
  }
}

export function isDirectiveExpired(directive: Directive): boolean {
  return new Date() > new Date(directive.expiresAt);
}

export function isDirectiveCompleted(directive: Directive): boolean {
  return directive.completed;
}

export function completeDirective(id: string): void {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(DIRECTIVE_KEY);
  if (!raw) return;

  try {
    const directive: Directive = JSON.parse(raw);
    if (directive.id === id) {
      directive.completed = true;
      localStorage.setItem(DIRECTIVE_KEY, JSON.stringify(directive));
    }
  } catch {
    // corrupted data, ignore
  }
}

export function getOrCreateDirective(userData: {
  gpa: number;
  weeklyFocusHours: number;
  flowStreak: number;
  neuralCount: number;
}): Directive {
  const active = getActiveDirective();

  if (!active) {
    return generateDirective(userData);
  }

  if (isDirectiveExpired(active)) {
    if (!active.completed) {
      const level = levelFromXp(getGlobalXp());
      const penalty = level * 5 * active.penaltyMultiplier;
      addGlobalXp(-penalty);
    }
    return generateDirective(userData);
  }

  return active;
}
