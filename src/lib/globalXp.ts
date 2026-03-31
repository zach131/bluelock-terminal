// src/lib/globalXp.ts

import { calculateMultiplier, type StatType } from "@/lib/profile";

const XP_KEY = "blt_xp";
const LAST_LOGIN_KEY = "blt_last_login";
const MAINTENANCE_COST_PER_LEVEL = 5;

export function getGlobalXp(): number {
  if (typeof window === "undefined") return 0;
  const saved = localStorage.getItem(XP_KEY);
  return saved ? parseInt(saved) : 0;
}

export function addGlobalXp(amount: number): number {
  const current = getGlobalXp();
  const newTotal = Math.max(0, current + amount);
  localStorage.setItem(XP_KEY, newTotal.toString());
  window.dispatchEvent(
    new CustomEvent("blt-xp-update", {
      detail: { xp: newTotal },
    }),
  );
  return newTotal;
}

export function setGlobalXp(amount: number): void {
  localStorage.setItem(XP_KEY, amount.toString());
  window.dispatchEvent(
    new CustomEvent("blt-xp-update", {
      detail: { xp: amount },
    }),
  );
}

export function awardXp(baseAmount: number, statType: StatType): number {
  const multiplier = calculateMultiplier(statType);
  const finalAmount = Math.round(baseAmount * multiplier);
  return addGlobalXp(finalAmount);
}

export function getLastLogin(): Date | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(LAST_LOGIN_KEY);
  if (!saved) return null;
  const date = new Date(saved + "T00:00:00");
  return isNaN(date.getTime()) ? null : date;
}

export function setLastLogin(): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(LAST_LOGIN_KEY, today);
}

export function checkDailyPenalty(level: number): {
  applied: boolean;
  daysMissed: number;
  penalty: number;
} {
  const lastLogin = getLastLogin();

  if (!lastLogin) {
    setLastLogin();
    return {
      applied: false,
      daysMissed: 0,
      penalty: 0,
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(
    lastLogin.getFullYear(),
    lastLogin.getMonth(),
    lastLogin.getDate(),
  );

  const diffMs = today.getTime() - last.getTime();
  const daysMissed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysMissed <= 0) {
    return {
      applied: false,
      daysMissed: 0,
      penalty: 0,
    };
  }

  const penaltyAmount = daysMissed * level * MAINTENANCE_COST_PER_LEVEL;

  addGlobalXp(-penaltyAmount);
  setLastLogin();

  return {
    applied: true,
    daysMissed,
    penalty: penaltyAmount,
  };
}
