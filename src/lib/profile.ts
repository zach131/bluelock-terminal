// src/lib/profile.ts

export type StatType = "ACADEMICS" | "FOCUS" | "BODY" | "MIND" | "BUILD";

export interface UserProfile {
  primaryStat: StatType | null;
  secondaryStat: StatType | null;
  lastSwitchDate: string;
}

const PROFILE_KEY = "blt_user_profile";
export const SWITCH_COST_XP = 500;

export function getProfile(): UserProfile {
  const DEFAULT: UserProfile = {
    primaryStat: null,
    secondaryStat: null,
    lastSwitchDate: "",
  };

  if (typeof window === "undefined") return DEFAULT;

  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return DEFAULT;

  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT;
  }
}

export function setProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function switchWeapon(
  primary: StatType,
  secondary: StatType,
  currentXp: number,
): { success: boolean; newXp: number } {
  const profile = getProfile();
  const hasExistingWeapon = profile.primaryStat !== null;

  let newXp = currentXp;

  if (hasExistingWeapon) {
    newXp = Math.max(0, currentXp - SWITCH_COST_XP);
  }

  const updated: UserProfile = {
    primaryStat: primary,
    secondaryStat: secondary,
    lastSwitchDate: new Date().toISOString(),
  };

  setProfile(updated);

  if (hasExistingWeapon) {
    window.dispatchEvent(
      new CustomEvent("blt-xp-update", {
        detail: { xp: newXp },
      }),
    );
  }

  return {
    success: true,
    newXp,
  };
}

export function calculateMultiplier(stat: StatType): number {
  const profile = getProfile();

  if (profile.primaryStat === stat) return 1.5;
  if (profile.secondaryStat === stat) return 1.1;
  return 0.5;
}
