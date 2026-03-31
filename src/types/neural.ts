// src/types/neural.ts

export type TraitID = "MEN" | "PHY" | "PRE" | "SKL" | "COD" | "DRV";

export interface Quality {
  id: string;
  text: string;
  trait: TraitID;
  xp: number;
  date: string;
}

export interface Character {
  id: string;
  name: string;
  source: string;
  qualities: Quality[];
  status: "ACTIVE" | "INTEGRATED";
  slot?: 1 | 2 | 3;
}

export interface NeuralState {
  characters: Character[];
  traits: Record<TraitID, number>;
  activeSlots: [string | null, string | null, string | null];
}

export const VALID_TRAITS: TraitID[] = ["MEN", "PHY", "PRE", "SKL", "COD", "DRV"];

export const TRAIT_META: Record<
  TraitID,
  { name: string; color: string }
> = {
  MEN: { name: "MENTAL", color: "var(--cyan-500)" },
  PHY: { name: "PHYSICAL", color: "var(--green-500)" },
  PRE: { name: "PRESENCE", color: "var(--purple-500)" },
  SKL: { name: "SKILL", color: "var(--amber-500)" },
  COD: { name: "CODE", color: "var(--blue-500)" },
  DRV: { name: "DRIVE", color: "var(--red-500)" },
};
