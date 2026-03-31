// src/lib/neural.ts

import type { NeuralState, Character, TraitID } from "@/types/neural";

export function createDefaultNeuralState(): NeuralState {
  return {
    characters: [],
    traits: { MEN: 0, PHY: 0, PRE: 0, SKL: 0, COD: 0, DRV: 0 },
    activeSlots: [null, null, null],
  };
}

export function getActiveCharacters(state: NeuralState): Character[] {
  return state.activeSlots
    .map((id) => state.characters.find((c) => c.id === id))
    .filter((c): c is Character => c !== undefined);
}

export function getIntegratedCharacters(state: NeuralState): Character[] {
  return state.characters.filter((c) => c.status === "INTEGRATED");
}

export function findEmptySlot(state: NeuralState): number {
  return state.activeSlots.findIndex((s) => s === null);
}

export function traitLevel(xp: number): number {
  // Exponential: 0→1, 100→2, 250→3, 500→4, 900→5...
  let level = 1;
  while (traitXpThreshold(level + 1) <= xp) level++;
  return level;
}

export function traitXpThreshold(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
}

export function traitProgress(
  xp: number
): { level: number; inLevel: number; needed: number; percent: number } {
  const level = traitLevel(xp);
  const current = traitXpThreshold(level);
  const next = traitXpThreshold(level + 1);
  const inLevel = xp - current;
  const needed = next - current;
  return {
    level,
    inLevel,
    needed,
    percent: needed === 0 ? 100 : Math.min(100, (inLevel / needed) * 100),
  };
}

export function characterTotalXp(char: Character): number {
  return char.qualities.reduce((sum, q) => sum + q.xp, 0);
}
