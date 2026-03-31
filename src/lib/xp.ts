// src/lib/xp.ts

export function xpForLevel(level: number): number {
  return level * 500;
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level) <= totalXp) level++;
  return level;
}

export function xpInCurrentLevel(totalXp: number, level: number): number {
  const prev = level > 1 ? xpForLevel(level - 1) : 0;
  return totalXp - prev;
}

export function xpNeededForLevel(level: number): number {
  const prev = level > 1 ? xpForLevel(level - 1) : 0;
  return xpForLevel(level) - prev;
}

export function xpProgressPercent(totalXp: number, level: number): number {
  const inLevel = xpInCurrentLevel(totalXp, level);
  const needed = xpNeededForLevel(level);
  return needed === 0 ? 100 : Math.min(100, (inLevel / needed) * 100);
}
