// src/lib/phantoms.ts

import type { Rival } from "@/types";

const LAST_EVOLUTION_KEY = "blt_last_evolution";
const WORLD_DIFFICULTY = 1.0;

const PREFIXES = [
  "VIPER", "GHOST", "SHADOW", "ZERO", "NOVA", "APEX", "RAVEN", "FROST", "BLAZE", "ECHO",
  "PHANTOM", "STRIKER", "IRON", "SPECTRE", "WRAITH",
];

const SUFFIXES = [
  "X", "7", "9", "K", "ZERO", "ONE", "PRIME", "NOVA", "VOID", "EDGE",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCallsign(index: number): string {
  const prefix = pick(PREFIXES);
  const suffix = pick(SUFFIXES);
  return `${prefix}-${suffix}`;
}

function generateBio(velocity: number, volatility: number): string {
  const parts: string[] = [];

  if (velocity > 0.02) {
    parts.push(pick(["A grinder. Never stops improving.", "On the rise. Relentless work ethic.", "Climbing fast. Hungry for more."]));
  } else if (velocity < -0.02) {
    parts.push(pick(["Cruising on talent. Risk of decline.", "Coasting. Resting on past results.", "Slipping. Needs a wake-up call."]));
  } else {
    parts.push(pick(["Steady. No dramatic moves.", "Consistent. Playing the long game.", "Holding position. Watching the field."]));
  }

  if (volatility > 0.25) {
    parts.push(pick([" Unpredictable. Wildly inconsistent.", " Volatile. Could explode or collapse.", " Erratic. Dangerous to underestimate."]));
  } else if (volatility < 0.15) {
    parts.push(pick([" Metronome. Stable, reliable performance.", " Machine-like. Almost boring consistency.", " Locked in. Rarely makes mistakes."]));
  } else {
    parts.push(pick([" Moderate variance. Normal range.", " Some fluctuation. Human after all.", " Balanced. Neither reckless nor rigid."]));
  }

  return parts.join("");
}

function generateTraits(velocity: number, volatility: number): string[] {
  const traits: string[] = ["Phantom"];

  if (velocity > 0.03) traits.push("Grinder", "Ambitious");
  else if (velocity > 0.01) traits.push("Rising");
  else if (velocity < -0.03) traits.push("Complacent", "Cruising");
  else if (velocity < -0.01) traits.push("Declining");

  if (volatility > 0.3) traits.push("Volatile", "Unpredictable");
  else if (volatility < 0.12) traits.push("Stable", "Reliable");

  return traits;
}

function checkEvolutionClock(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(LAST_EVOLUTION_KEY);
  if (!saved) return true;
  const lastEvolution = new Date(saved);
  if (isNaN(lastEvolution.getTime())) return true;
  const now = new Date();
  const diffMs = now.getTime() - lastEvolution.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 24;
}

function setEvolutionClock(): void {
  localStorage.setItem(LAST_EVOLUTION_KEY, new Date().toISOString());
}

// ─── NEW: LADDER GENERATOR ────────────────────────────────────────

/**
 * Generates a "Ladder" of rivals around the user.
 * This ensures a realistic curve and places the user at a specific rank.
 *
 * @param userGpa The user's actual calculated GPA.
 * @param userTargetRank Where the user should be placed (e.g., 300).
 * @param totalPopulation Total number of rivals to generate.
 */
export function generateLadder(
  userGpa: number,
  userTargetRank: number = 300,
  totalPopulation: number = 500
): Rival[] {
  const rivals: Rival[] = [];

  // 1. Define the "Ceiling"
  // Top rank (excluding Masterminds) should be around 5.73 (Realistic Top)
  const topGpa = 5.73;

  // 2. Calculate the GPA step
  // We want a linear-ish drop from Top to User.
  // GPA Drop = Top - User.
  // Steps = Target Rank - 1.
  const gpaDrop = topGpa - userGpa;
  const steps = Math.max(1, userTargetRank - 1);
  const gpaStep = gpaDrop / steps;

  // 3. Generate Rivals ABOVE the user (Rank 1 to User Rank - 1)
  for (let i = 1; i < userTargetRank; i++) {
    // Linear interpolation with tiny randomness for "human" feel
    const baseGpa = topGpa - (i * gpaStep);
    const noise = (Math.random() - 0.5) * 0.02; // Very small noise
    const finalGpa = Math.min(6.0, Math.max(0, baseGpa + noise));

    rivals.push({
      id: `phantom_above_${i}`,
      rank: i,
      name: generateCallsign(i),
      gpa: finalGpa,
      isConfirmed: false,
      type: "SYNTHETIC",
      velocity: Math.random() * 0.04 - 0.02, // Slow movers at top
      volatility: Math.random() * 0.2 + 0.1, // Low volatility (stable)
      origin: "LOCAL",
      bio: generateBio(0, 0.15),
      traits: generateTraits(0, 0.15),
      avatar: "◈",
    });
  }

  // 4. Generate Rivals BELOW the user (User Rank + 1 to Total)
  const bottomStartRank = userTargetRank + 1;
  const bottomCount = totalPopulation - userTargetRank;

  // GPA drops faster below the user (the "pack")
  const bottomGpaStart = userGpa - 0.01;
  const bottomGpaEnd = 3.5; // Floor

  for (let i = 0; i < bottomCount; i++) {
    // Randomize GPA below user (wider spread)
    const progress = i / bottomCount;
    const drop = (progress * progress) * (bottomGpaStart - bottomGpaEnd); // Quadratic drop
    const finalGpa = Math.max(0, bottomGpaStart - drop);

    rivals.push({
      id: `phantom_below_${i}`,
      rank: bottomStartRank + i,
      name: generateCallsign(i + userTargetRank),
      gpa: finalGpa,
      isConfirmed: false,
      type: "SYNTHETIC",
      velocity: Math.random() * 0.1 - 0.05,
      volatility: Math.random() * 0.4 + 0.1,
      origin: "LOCAL",
      bio: generateBio(0, 0.3),
      traits: generateTraits(0, 0.3),
      avatar: "◈",
    });
  }

  return rivals;
}

// Keep evolveRivals for daily drift
export function evolveRivals(rivals: Rival[]): Rival[] {
  if (!checkEvolutionClock()) return rivals;

  const worldDrift = (WORLD_DIFFICULTY - 1.0) * 0.01;

  const evolved = rivals.map((rival) => {
    if (rival.type !== "SYNTHETIC") return rival;

    const drift = rival.velocity;
    const noise = (Math.random() - 0.5) * 2 * rival.volatility;
    const newGpa = Math.max(0, Math.min(6.0, rival.gpa + drift + noise + worldDrift));

    return { ...rival, gpa: newGpa };
  });

  setEvolutionClock();
  return evolved;
}

// Legacy export if needed elsewhere
export function generateEliteClass(userGpa: number, count: number): Rival[] {
  return generateLadder(userGpa, 300, count);
}
