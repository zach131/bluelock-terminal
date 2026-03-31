// src/app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getProfile,
  switchWeapon,
  calculateMultiplier,
  type StatType,
} from "@/lib/profile";
import { getGlobalXp, setGlobalXp } from "@/lib/globalXp";
import { SWITCH_COST_XP } from "@/lib/profile";
import { levelFromXp } from "@/lib/xp";

const STATS: StatType[] = ["ACADEMICS", "FOCUS", "BODY", "MIND"];

const STAT_META: Record<
  StatType,
  { label: string; icon: string; desc: string }
> = {
  ACADEMICS: {
    label: "Academics",
    icon: "📐",
    desc: "Threat Engine & GPA",
  },
  FOCUS: {
    label: "Focus",
    icon: "⏱",
    desc: "Overclock & Deep Work",
  },
  BODY: {
    label: "Body",
    icon: "💪",
    desc: "Biological Ledger",
  },
  MIND: {
    label: "Mind",
    icon: "🧠",
    desc: "Neural Link",
  },
  BUILD: {
    label: "Build",
    icon: "🏗️",
    desc: "Architecture & Code",
  },
};

export default function ProfilePage() {
  const [xp, setXp] = useState(0);
  const [primary, setPrimary] = useState<StatType | null>(null);
  const [secondary, setSecondary] = useState<StatType | null>(null);
  const [savedPrimary, setSavedPrimary] = useState<StatType | null>(null);
  const [savedSecondary, setSavedSecondary] = useState<StatType | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const currentXp = getGlobalXp();
    setXp(currentXp);
    const profile = getProfile();
    setPrimary(profile.primaryStat);
    setSecondary(profile.secondaryStat);
    setSavedPrimary(profile.primaryStat);
    setSavedSecondary(profile.secondaryStat);
  }, []);

  // Listen for XP updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.xp !== undefined) setXp(detail.xp);
    };
    window.addEventListener("blt-xp-update", handler);
    return () => window.removeEventListener("blt-xp-update", handler);
  }, []);

  const handleSelect = (stat: StatType) => {
    setMsg(null);
    if (primary === stat) {
      setPrimary(null);
    } else if (secondary === stat) {
      setSecondary(null);
    } else if (!primary) {
      setPrimary(stat);
    } else if (!secondary) {
      setSecondary(stat);
    } else {
      // If both slots filled, replace primary (user choice)
      setSecondary(primary);
      setPrimary(stat);
    }
  };

  const handleConfirm = () => {
    if (!primary || !secondary) {
      setMsg("Select a Primary and Secondary stat.");
      return;
    }
    if (primary === secondary) {
      setMsg("Primary and Secondary cannot be the same.");
      return;
    }

    const result = switchWeapon(primary, secondary, xp);

    if (result.success) {
      setXp(result.newXp);
      setSavedPrimary(primary);
      setSavedSecondary(secondary);
      setMsg(
        hasExistingWeapon
          ? `Weapon switched! -${SWITCH_COST_XP} XP`
          : "Weapon selected!",
      );
    }
  };

  const hasExistingWeapon = savedPrimary !== null;
  const canAfford = xp >= SWITCH_COST_XP;
  const hasChanges = primary !== savedPrimary || secondary !== savedSecondary;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.title}>WEAPON SELECTION</span>
        <span style={styles.level}>LVL {levelFromXp(xp)}</span>
      </header>

      <div style={styles.info}>
        <div style={styles.row}>
          <span style={styles.label}>CURRENT PRIMARY</span>
          <span style={styles.value}>
            {savedPrimary ? STAT_META[savedPrimary].label : "—"}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>CURRENT SECONDARY</span>
          <span style={styles.value}>
            {savedSecondary ? STAT_META[savedSecondary].label : "—"}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>SWITCH COST</span>
          <span
            style={{
              ...styles.value,
              color: hasExistingWeapon
                ? canAfford
                  ? "#fbbf24"
                  : "#f87171"
                : "#4ade80",
            }}
          >
            {hasExistingWeapon ? `${SWITCH_COST_XP} XP` : "FREE"}
          </span>
        </div>
      </div>

      <div style={styles.grid}>
        {STATS.map((stat) => {
          const meta = STAT_META[stat];
          const isPrimary = primary === stat;
          const isSecondary = secondary === stat;
          const isSelected = isPrimary || isSecondary;

          return (
            <div
              key={stat}
              onClick={() => handleSelect(stat)}
              style={{
                ...styles.card,
                borderColor: isPrimary
                  ? "#fbbf24"
                  : isSecondary
                    ? "#94a3b8"
                    : "var(--border)",
                background: isSelected
                  ? "rgba(255,255,255,0.02)"
                  : "transparent",
              }}
            >
              <div style={styles.cardHeader}>
                <span style={styles.icon}>{meta.icon}</span>
                {isPrimary && <span style={styles.badgeGold}>PRIMARY</span>}
                {isSecondary && (
                  <span style={styles.badgeSilver}>SECONDARY</span>
                )}
              </div>
              <div style={styles.cardTitle}>{meta.label}</div>
              <div style={styles.cardDesc}>{meta.desc}</div>
              <div style={styles.multiplier}>
                {isPrimary ? "1.5× XP" : isSecondary ? "1.1× XP" : "0.5× XP"}
              </div>
            </div>
          );
        })}
      </div>

      {msg && (
        <div
          style={{
            ...styles.msg,
            color: msg.includes("-") ? "#f87171" : "#4ade80",
          }}
        >
          {msg}
        </div>
      )}

      <div style={styles.actions}>
        <button
          onClick={handleConfirm}
          disabled={
            !hasChanges ||
            !primary ||
            !secondary ||
            (hasExistingWeapon && !canAfford)
          }
          style={{
            ...styles.confirmBtn,
            opacity:
              hasChanges &&
              primary &&
              secondary &&
              (hasExistingWeapon ? canAfford : true)
                ? 1
                : 0.4,
          }}
        >
          {hasExistingWeapon
            ? `SWITCH (-${SWITCH_COST_XP} XP)`
            : "CONFIRM SELECTION"}
        </button>
      </div>

      <footer style={styles.footer}>
        <Link href="/" style={styles.backLink}>
          ⟵ MAINFRAME
        </Link>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
  },
  title: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--green-500)",
    letterSpacing: "0.15em",
  },
  level: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
    fontFamily: "var(--font-display)",
  },
  info: {
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "var(--space-xs)",
  },
  label: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    letterSpacing: "0.08em",
  },
  value: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "var(--space-sm)",
    padding: "var(--space-md) var(--space-lg)",
    flex: 1,
  },
  card: {
    border: "1px solid",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-md)",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-xs)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "var(--space-xs)",
  },
  icon: {
    fontSize: "1.2rem",
  },
  badgeGold: {
    fontSize: "0.5rem",
    fontWeight: 700,
    color: "#fbbf24",
    border: "1px solid #fbbf24",
    padding: "1px 5px",
    borderRadius: "3px",
    letterSpacing: "0.05em",
  },
  badgeSilver: {
    fontSize: "0.5rem",
    fontWeight: 700,
    color: "#94a3b8",
    border: "1px solid #94a3b8",
    padding: "1px 5px",
    borderRadius: "3px",
    letterSpacing: "0.05em",
  },
  cardTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    fontFamily: "var(--font-display)",
  },
  cardDesc: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  multiplier: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "var(--green-500)",
    marginTop: "auto",
  },
  msg: {
    textAlign: "center",
    padding: "var(--space-sm)",
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  actions: {
    padding: "var(--space-md) var(--space-lg)",
    borderTop: "1px solid var(--border)",
    background: "var(--bg-surface)",
  },
  confirmBtn: {
    width: "100%",
    padding: "12px",
    background: "var(--green-500)",
    color: "#000",
    border: "none",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    fontSize: "0.75rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.05em",
  },
  footer: {
    textAlign: "center",
    padding: "var(--space-sm)",
    background: "var(--bg-surface)",
  },
  backLink: {
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "0.7rem",
  },
};
