// src/app/threat-engine/leaderboard/page.tsx
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSync } from "@/lib/useSync";
import { generateEliteClass, evolveRivals } from "@/lib/phantoms";
import { MASTERMINDS } from "@/lib/presets";
import { addGlobalXp } from "@/lib/globalXp";
import type { Rival, RivalsState } from "@/types";

const SYNC_KEY = "bluelock_rivals";

const DEFAULT_STATE: RivalsState = {
  rivals: [],
};

function getUserGpa(rivals: Rival[]): number {
  const user = rivals.find((r) => r.name.toUpperCase() === "ZACH");
  if (user) return user.gpa;
  const real = rivals.filter((r) => r.type === "REAL");
  if (real.length === 0) return 3.5;
  return real.reduce((sum, r) => sum + r.gpa, 0) / real.length;
}

function getTypeLabel(rival: Rival): string {
  if (
    rival.origin === "WHITE_ROOM" &&
    rival.isConfirmed &&
    rival.velocity === 0.0 &&
    rival.volatility === 0.0
  )
    return "MASTERMIND";
  if (rival.name.toUpperCase() === "ZACH") return "YOU";
  if (rival.type === "REAL") return "REAL";
  return "PHANTOM";
}

function getTypeColor(rival: Rival): string {
  if (
    rival.origin === "WHITE_ROOM" &&
    rival.isConfirmed &&
    rival.velocity === 0.0
  )
    return "#fbbf24";
  if (rival.name.toUpperCase() === "ZACH") return "#22d3ee";
  if (rival.type === "REAL") return "#4ade80";
  return "#60a5fa";
}

// ─── DOSSIER MODAL ──────────────────────────────────

function DossierModal({
  rival,
  onClose,
  userGpa,
}: {
  rival: Rival;
  onClose: () => void;
  userGpa: number;
}) {
  const typeLabel = getTypeLabel(rival);
  const typeColor = getTypeColor(rival);
  const gap = userGpa - rival.gpa;
  const isBehind = gap < 0;

  const velocityLabel =
    rival.velocity > 0
      ? `↑ ${rival.velocity.toFixed(3)}`
      : rival.velocity < 0
        ? `↓ ${Math.abs(rival.velocity).toFixed(3)}`
        : "— 0.000";

  const velocityColor =
    rival.velocity > 0.01
      ? "#4ade80"
      : rival.velocity < -0.01
        ? "#f87171"
        : "rgba(255,255,255,0.3)";

  return (
    <div style={dossierStyles.overlay} onClick={onClose}>
      <div style={dossierStyles.card} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            ...dossierStyles.header,
            borderBottomColor: typeColor,
          }}
        >
          <div style={dossierStyles.headerLeft}>
            <span style={dossierStyles.avatar}>{rival.avatar}</span>
            <div>
              <div style={dossierStyles.name}>{rival.name}</div>
              <div
                style={{
                  ...dossierStyles.origin,
                  color: typeColor,
                  borderColor: typeColor,
                }}
              >
                {rival.origin}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={dossierStyles.closeBtn}>
            ×
          </button>
        </div>

        <div style={dossierStyles.section}>
          <div style={dossierStyles.sectionLabel}>DOSSIER</div>
          <div style={dossierStyles.bio}>{rival.bio}</div>
        </div>

        <div style={dossierStyles.statsGrid}>
          <div style={dossierStyles.statCard}>
            <div style={dossierStyles.statLabel}>GPA</div>
            <div
              style={{
                ...dossierStyles.statValue,
                color:
                  rival.gpa >= 5.5
                    ? "#fbbf24"
                    : rival.gpa >= 4.0
                      ? "#4ade80"
                      : "#fafafa",
              }}
            >
              {rival.gpa.toFixed(2)}
            </div>
          </div>
          <div style={dossierStyles.statCard}>
            <div style={dossierStyles.statLabel}>VELOCITY</div>
            <div
              style={{
                ...dossierStyles.statValue,
                color: velocityColor,
                fontSize: "0.9rem",
              }}
            >
              {velocityLabel}
            </div>
          </div>
          <div style={dossierStyles.statCard}>
            <div style={dossierStyles.statLabel}>VOLATILITY</div>
            <div
              style={{
                ...dossierStyles.statValue,
                color:
                  rival.volatility > 0.25
                    ? "#fbbf24"
                    : rival.volatility < 0.15
                      ? "#4ade80"
                      : "#fafafa",
                fontSize: "0.9rem",
              }}
            >
              ~{rival.volatility.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={dossierStyles.section}>
          <div style={dossierStyles.sectionLabel}>GAP ANALYSIS</div>
          <div
            style={{
              ...dossierStyles.gapText,
              color: isBehind ? "#f87171" : "#4ade80",
            }}
          >
            {isBehind
              ? `YOU ARE BEHIND BY ${Math.abs(gap).toFixed(2)} GPA`
              : gap === 0
                ? "TIED"
                : `YOU ARE AHEAD BY ${gap.toFixed(2)} GPA`}
          </div>
        </div>

        <div style={dossierStyles.section}>
          <div style={dossierStyles.sectionLabel}>TRAITS</div>
          <div style={dossierStyles.traitsRow}>
            {rival.traits.map((trait, i) => (
              <span
                key={i}
                style={{
                  ...dossierStyles.traitPill,
                  borderColor: typeColor,
                  color: typeColor,
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        <div style={dossierStyles.footer}>
          <button
            onClick={() => {
              console.log(`TARGET SET: ${rival.name}`);
              onClose();
            }}
            style={dossierStyles.targetBtn}
          >
            MARK AS TARGET
          </button>
          <button onClick={onClose} style={dossierStyles.closeFooterBtn}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────

export default function LeaderboardPage() {
  const { data, loading, update } = useSync<RivalsState>({
    cloudKey: SYNC_KEY,
    defaultValue: DEFAULT_STATE,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gpa: "",
  });
  const [selectedRival, setSelectedRival] = useState<Rival | null>(null);
  const prevUserIndex = useRef<number>(-1);

  const addRival = useCallback(() => {
    const name = form.name.trim();
    const gpa = parseFloat(form.gpa);
    if (!name || isNaN(gpa)) return;

    const newRival: Rival = {
      id: `rival_${Date.now()}`,
      rank: 0,
      name,
      gpa,
      isConfirmed: true,
      type: "REAL",
      velocity: 0.0,
      volatility: 0.0,
      origin: "LOCAL",
      bio: "Real rival. Intel confirmed.",
      traits: ["Real"],
      avatar: "⚔",
    };

    update((prev) => ({
      rivals: [...prev.rivals, newRival],
    }));
    setForm({ name: "", gpa: "" });
    setShowForm(false);
  }, [form, update]);

  const removeRival = useCallback(
    (id: string) => {
      update((prev) => ({
        rivals: prev.rivals.filter((r) => r.id !== id),
      }));
    },
    [update],
  );

  const leaderboard = useMemo(() => {
    const userGpa = getUserGpa(data.rivals);
    const realRivals = data.rivals.filter((r) => r.type === "REAL");
    const TARGET = 50;
    const existing = MASTERMINDS.length + realRivals.length;
    const neededCount = Math.max(0, TARGET - existing);
    const rawPhantoms = generateEliteClass(userGpa, neededCount);
    const evolvedPhantoms = evolveRivals(rawPhantoms);
    const merged: Rival[] = [...MASTERMINDS, ...realRivals, ...evolvedPhantoms];
    merged.sort((a, b) => b.gpa - a.gpa);
    return merged.map((rival, index) => ({
      ...rival,
      displayRank: index + 1,
    }));
  }, [data.rivals]);

  const userGpa = useMemo(() => getUserGpa(data.rivals), [data.rivals]);

  // ─── DOMINATION BONUS ───────────────────────────

  useEffect(() => {
    const currentIndex = leaderboard.findIndex(
      (entry) => entry.name.toUpperCase() === "ZACH",
    );

    if (currentIndex === -1) {
      prevUserIndex.current = -1;
      return;
    }

    if (prevUserIndex.current !== -1 && currentIndex < prevUserIndex.current) {
      const passedEntries = leaderboard.slice(
        currentIndex + 1,
        prevUserIndex.current + 1,
      );

      const passedReals = passedEntries.filter(
        (entry) => entry.type === "REAL" && entry.name.toUpperCase() !== "ZACH",
      );

      let totalXp = 0;
      passedReals.forEach((rival) => {
        totalXp += 100;
        console.log(`DOMINATED: Passed ${rival.name} +100 XP`);
      });

      if (totalXp > 0) {
        addGlobalXp(totalXp);
      }
    }

    prevUserIndex.current = currentIndex;
  }, [leaderboard]);

  // ─── RENDER ─────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={{ color: "#f87171" }}>▸</span> CONNECTING...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <span style={styles.title}>LEADERBOARD</span>
          <span style={styles.subtitle}>{leaderboard.length} entries</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? "×" : "+ INTEL"}
        </button>
      </header>

      {showForm && (
        <div style={styles.formRow}>
          <input
            placeholder="RIVAL NAME"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            style={styles.formInput}
          />
          <input
            placeholder="GPA"
            type="number"
            step="0.01"
            value={form.gpa}
            onChange={(e) =>
              setForm({
                ...form,
                gpa: e.target.value,
              })
            }
            style={styles.formSmall}
          />
          <button onClick={addRival} style={styles.formSubmit}>
            ADD
          </button>
        </div>
      )}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={styles.colRank}>#</span>
          <span style={styles.colName}>NAME</span>
          <span style={styles.colType}>TYPE</span>
          <span style={styles.colGpa}>GPA</span>
          <span style={styles.colAction} />
        </div>

        {leaderboard.map((entry) => {
          const typeLabel = getTypeLabel(entry);
          const typeColor = getTypeColor(entry);
          const isMastermind = typeLabel === "MASTERMIND";
          const isUser = typeLabel === "YOU";
          const isReal = typeLabel === "REAL";

          return (
            <div
              key={entry.id}
              onClick={() => setSelectedRival(entry)}
              style={{
                ...styles.row,
                cursor: "pointer",
                borderLeftColor: isMastermind
                  ? "#fbbf24"
                  : isUser
                    ? "#22d3ee"
                    : isReal
                      ? "#4ade80"
                      : "transparent",
                background: isUser ? "rgba(34,211,238,0.05)" : "transparent",
              }}
            >
              <span style={styles.colRank}>{entry.displayRank}</span>

              <div style={styles.colName}>
                <span style={styles.avatar}>{entry.avatar}</span>
                <div style={styles.nameBlock}>
                  <span
                    style={{
                      ...styles.nameText,
                      color: isMastermind ? "#fbbf24" : "#fafafa",
                    }}
                  >
                    {entry.name}
                  </span>
                  {entry.traits.length > 0 && (
                    <span style={styles.traitsText}>
                      {entry.traits.slice(0, 2).join(" · ")}
                    </span>
                  )}
                </div>
              </div>

              <span
                style={{
                  ...styles.colType,
                  color: typeColor,
                }}
              >
                {typeLabel}
              </span>

              <span
                style={{
                  ...styles.colGpa,
                  color:
                    entry.gpa >= 5.5
                      ? "#fbbf24"
                      : entry.gpa >= 4.0
                        ? "#4ade80"
                        : entry.gpa >= 3.0
                          ? "#fafafa"
                          : "#f87171",
                }}
              >
                {entry.gpa.toFixed(2)}
              </span>

              <span style={styles.colAction}>
                {isReal && !isUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRival(entry.id);
                    }}
                    style={styles.removeBtn}
                    title="Remove rival"
                  >
                    ×
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {selectedRival && (
        <DossierModal
          rival={selectedRival}
          userGpa={userGpa}
          onClose={() => setSelectedRival(null)}
        />
      )}
    </div>
  );
}

// ─── DOSSIER STYLES ─────────────────────────────────

const dossierStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#141414",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "2px solid rgba(255,255,255,0.06)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    fontSize: "1.6rem",
  },
  name: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#fafafa",
    fontFamily: "var(--font-display)",
    letterSpacing: "-0.02em",
  },
  origin: {
    fontSize: "0.5rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    border: "1px solid",
    padding: "2px 8px",
    borderRadius: "4px",
    marginTop: "4px",
    display: "inline-block",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    fontSize: "1.4rem",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  section: {
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  sectionLabel: {
    fontSize: "0.5rem",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.12em",
    fontWeight: 600,
    marginBottom: "8px",
  },
  bio: {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.6,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1px",
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  statCard: {
    background: "#141414",
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  statLabel: {
    fontSize: "0.45rem",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.1em",
    fontWeight: 600,
  },
  statValue: {
    fontSize: "1.2rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    color: "#fafafa",
  },
  gapText: {
    fontSize: "0.8rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
  },
  traitsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  traitPill: {
    fontSize: "0.6rem",
    fontWeight: 600,
    border: "1px solid",
    padding: "3px 10px",
    borderRadius: "20px",
    letterSpacing: "0.04em",
  },
  footer: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
  },
  targetBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fafafa",
    padding: "10px",
    fontSize: "0.65rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.08em",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.15s",
  },
  closeFooterBtn: {
    background: "#fafafa",
    color: "#0a0a0a",
    border: "none",
    padding: "10px 20px",
    fontSize: "0.65rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.08em",
    cursor: "pointer",
    borderRadius: "8px",
  },
};

// ─── TABLE STYLES ───────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0a0a0a",
  },
  loading: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "rgba(255,255,255,0.3)",
    fontSize: "0.85rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "#111111",
  },
  title: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.15em",
    display: "block",
  },
  subtitle: {
    fontSize: "0.6rem",
    color: "rgba(255,255,255,0.2)",
    fontFamily: "var(--font-mono)",
  },
  addBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fafafa",
    padding: "6px 14px",
    fontSize: "0.6rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.08em",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.15s",
  },
  formRow: {
    display: "flex",
    gap: "8px",
    padding: "12px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "#111111",
  },
  formInput: {
    flex: 1,
    background: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fafafa",
    padding: "8px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    borderRadius: "8px",
    outline: "none",
  },
  formSmall: {
    width: "80px",
    background: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fafafa",
    padding: "8px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    borderRadius: "8px",
    outline: "none",
  },
  formSubmit: {
    background: "#fafafa",
    color: "#0a0a0a",
    border: "none",
    padding: "8px 16px",
    fontSize: "0.65rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.08em",
    cursor: "pointer",
    borderRadius: "8px",
  },
  table: {
    flex: 1,
    overflowY: "auto",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    padding: "10px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "#111111",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    borderLeft: "3px solid transparent",
    transition: "background 0.1s",
  },
  colRank: {
    width: "36px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.3)",
    fontFamily: "var(--font-mono)",
    flexShrink: 0,
  },
  colName: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  avatar: {
    fontSize: "1rem",
    flexShrink: 0,
  },
  nameBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  nameText: {
    fontSize: "0.8rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  traitsText: {
    fontSize: "0.55rem",
    color: "rgba(255,255,255,0.25)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  colType: {
    width: "90px",
    fontSize: "0.55rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textAlign: "right",
    flexShrink: 0,
  },
  colGpa: {
    width: "60px",
    fontSize: "0.85rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textAlign: "right",
    flexShrink: 0,
  },
  colAction: {
    width: "30px",
    display: "flex",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.2)",
    fontSize: "0.9rem",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
    transition: "color 0.15s",
  },
};
