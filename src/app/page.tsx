// src/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { levelFromXp, xpProgressPercent } from "@/lib/xp";
import { calculateCumulativeGpa } from "@/lib/grades";
import { checkDailyPenalty, addGlobalXp } from "@/lib/globalXp";
import {
  getOrCreateDirective,
  completeDirective,
  type Directive,
} from "@/lib/dailyDirectives";

const CORRECT_PASSWORD = "bluelock";
const SESSION_KEY = "bluelock_session_persist";

function getDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getWeekFocusHours(): number {
  try {
    const raw = localStorage.getItem("blt_bluelock_overclock");
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (
      (data.sessions || [])
        .filter((s: any) => new Date(s.startTime) >= weekAgo)
        .reduce((sum: number, s: any) => sum + (s.durationMs || 0), 0) /
      (1000 * 60 * 60)
    );
  } catch {
    return 0;
  }
}

function getFlowStreak(): number {
  try {
    const raw = localStorage.getItem("blt_bluelock_overclock");
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const days = new Set<string>();
    (data.sessions || []).forEach((s: any) => {
      if (s.durationMs > 0) days.add(s.startTime.split("T")[0]);
    });
    const sorted = Array.from(days).sort().reverse();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      if (sorted.includes(d)) streak++;
      else if (i > 0) break;
    }
    return streak;
  } catch {
    return 0;
  }
}

function getGpa(): number {
  try {
    const raw = localStorage.getItem("blt_bluelock_threat_engine");
    if (!raw) return 0;
    return calculateCumulativeGpa(JSON.parse(raw).classes || []);
  } catch {
    return 0;
  }
}

function getRank(): string {
  try {
    const raw = localStorage.getItem("blt_bluelock_threat_engine");
    if (!raw) return "--";
    const r = JSON.parse(raw).rank;
    return r ? "#" + r.current : "--";
  } catch {
    return "--";
  }
}

function getNeuralCount(): number {
  try {
    const raw = localStorage.getItem("blt_bluelock_neural_link");
    if (!raw) return 0;
    return (JSON.parse(raw).characters || []).length;
  } catch {
    return 0;
  }
}

function getVaultBalance(): number {
  try {
    const raw = localStorage.getItem("blt_bluelock_vault");
    if (!raw) return 10000;
    return JSON.parse(raw).balance || 10000;
  } catch {
    return 10000;
  }
}

function formatMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ─── RADAR ───────────────────────────────────────────

const RADAR_STATS = [
  {
    label: "ACADEMICS",
    getValue: () => getGpa() / 6,
    color: "#f87171",
  },
  {
    label: "FOCUS",
    getValue: () => Math.min(getWeekFocusHours() / 20, 1),
    color: "#60a5fa",
  },
  {
    label: "BODY",
    getValue: () => Math.min(getFlowStreak() / 7, 1),
    color: "#4ade80",
  },
  {
    label: "MIND",
    getValue: () => Math.min(getNeuralCount() / 5, 1),
    color: "#c084fc",
  },
  {
    label: "CAPITAL",
    getValue: () => Math.min(Math.max(getVaultBalance() - 8000, 0) / 4000, 1),
    color: "#fbbf24",
  },
];

function RadarChart({ values }: { values: number[] }) {
  const n = RADAR_STATS.length;
  const angleStep = (2 * Math.PI) / n;
  const cx = 150;
  const cy = 150;
  const r = 110;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const points = values.map((v, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const pr = Math.max(v, 0.03) * r;
    return {
      x: cx + pr * Math.cos(angle),
      y: cy + pr * Math.sin(angle),
      lx: cx + (r + 30) * Math.cos(angle),
      ly: cy + (r + 30) * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox="0 0 300 300"
      style={{
        width: "100%",
        maxWidth: "300px",
        height: "auto",
      }}
    >
      {rings.map((s, i) => (
        <polygon
          key={`ring-${i}`}
          points={Array.from({ length: n }, (_, j) => {
            const a = j * angleStep - Math.PI / 2;
            return `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.7}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = i * angleStep - Math.PI / 2;
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        );
      })}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={`pt-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={5}
            fill="#1a1a1a"
            stroke={RADAR_STATS[i].color}
            strokeWidth={2}
          />
        </g>
      ))}
      {RADAR_STATS.map((s, i) => (
        <text
          key={`lbl-${i}`}
          x={points[i].lx}
          y={points[i].ly}
          fill="rgba(255,255,255,0.35)"
          fontSize="7.5"
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
          }}
        >
          {s.label}
        </text>
      ))}
    </svg>
  );
}

// ─── PASSWORD GATE ───────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === CORRECT_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "authenticated");
      onUnlock();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div style={gateStyles.container}>
      <div style={gateStyles.content}>
        <div style={gateStyles.icon}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 style={gateStyles.title}>Welcome back</h1>
        <p style={gateStyles.subtitle}>Enter your key to continue</p>
        <form onSubmit={handleSubmit} style={gateStyles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Key"
            autoFocus
            style={{
              ...gateStyles.input,
              borderColor: error ? "#ef4444" : "rgba(255,255,255,0.1)",
            }}
          />
          <button type="submit" style={gateStyles.button}>
            Unlock
          </button>
        </form>
        {error && <p style={gateStyles.error}>Incorrect key</p>}
      </div>
    </div>
  );
}

// ─── MODULES ─────────────────────────────────────────

const MODULES = [
  {
    name: "Threat Engine",
    desc: "Grades & academic tracking",
    color: "#f87171",
    path: "/threat-engine",
    stat: () => getRank(),
    icon: "📐",
  },
  {
    name: "Overclock",
    desc: "Deep work & focus sessions",
    color: "#60a5fa",
    path: "/overclock",
    stat: () => getWeekFocusHours().toFixed(1) + "h this week",
    icon: "⏱",
  },
  {
    name: "Biological Ledger",
    desc: "Training & body metrics",
    color: "#4ade80",
    path: "/biological-ledger",
    stat: () => getFlowStreak() + "d streak",
    icon: "💪",
  },
  {
    name: "Neural Link",
    desc: "Character & quality analysis",
    color: "#c084fc",
    path: "/neural-link",
    stat: () => getNeuralCount() + " linked",
    icon: "🧠",
  },
  {
    name: "The Vault",
    desc: "Trading journal & P&L",
    color: "#fbbf24",
    path: "/vault",
    stat: () => formatMoney(getVaultBalance()),
    icon: "📈",
  },
  {
    name: "Visage",
    desc: "Image, grooming & presence",
    color: "#f472b6",
    path: "/visage",
    stat: () => "Coming soon",
    icon: "✨",
  },
];

// ─── DIRECTIVE CARD ──────────────────────────────────

function DirectiveCard({
  directive,
  onComplete,
}: {
  directive: Directive | null;
  onComplete: () => void;
}) {
  if (!directive) return null;

  const done = directive.completed;
  const borderColor = done ? "#4ade80" : "#f87171";
  const accentColor = done ? "#4ade80" : "#f87171";

  return (
    <section
      className="directive-card"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="directive-header">
        <span className="directive-label" style={{ color: accentColor }}>
          {done ? "DIRECTIVE COMPLETE" : "DAILY DIRECTIVE"}
        </span>
        {!done && (
          <span className="directive-reward">+{directive.reward} XP</span>
        )}
      </div>
      <div className="directive-title">{directive.title}</div>
      <div className="directive-desc">{directive.description}</div>
      {!done && (
        <button
          onClick={() => {
            completeDirective(directive.id);
            addGlobalXp(directive.reward);
            onComplete();
          }}
          className="directive-btn"
        >
          MARK COMPLETE
        </button>
      )}
      {done && <div className="directive-done">✓ Completed</div>}
    </section>
  );
}

// ─── DECAY EFFECTS ───────────────────────────────────

function Scanlines() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        opacity: 0.4,
      }}
    />
  );
}

function DecayBanner() {
  return (
    <div
      style={{
        width: "100%",
        background: "rgba(248, 113, 113, 0.08)",
        borderBottom: "1px solid rgba(248, 113, 113, 0.15)",
        padding: "6px 0",
        textAlign: "center",
        color: "#f87171",
        fontSize: "0.55rem",
        fontWeight: 700,
        letterSpacing: "0.2em",
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
      }}
    >
      SYSTEM DEGRADED: PERFORMANCE CRITICAL
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────

function Dashboard() {
  const [xp, setXp] = useState(0);
  const [stats, setStats] = useState({
    gpa: 0,
    rank: "--",
    focusHrs: 0,
    streak: 0,
    neuralCount: 0,
    vaultBalance: 10000,
  });
  const [directive, setDirective] = useState<Directive | null>(null);

  const refreshStats = useCallback(() => {
    const currentXp = parseInt(localStorage.getItem("blt_xp") || "0");
    setXp(currentXp);

    const currentStats = {
      gpa: getGpa(),
      rank: getRank(),
      focusHrs: getWeekFocusHours(),
      streak: getFlowStreak(),
      neuralCount: getNeuralCount(),
      vaultBalance: getVaultBalance(),
    };
    setStats(currentStats);

    const currentLevel = levelFromXp(currentXp);
    const dir = getOrCreateDirective({
      gpa: currentStats.gpa,
      weeklyFocusHours: currentStats.focusHrs,
      flowStreak: currentStats.streak,
      neuralCount: currentStats.neuralCount,
    });
    setDirective(dir);
  }, []);

  useEffect(() => {
    refreshStats();

    const currentXp = parseInt(localStorage.getItem("blt_xp") || "0");
    const currentLevel = levelFromXp(currentXp);
    const result = checkDailyPenalty(currentLevel);
    if (result.applied) {
      console.log(
        `PENALTY: Missed ${result.daysMissed} days. Lost ${result.penalty} XP.`,
      );
    }

    const h = () => refreshStats();
    window.addEventListener("blt-xp-update", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("blt-xp-update", h);
      window.removeEventListener("storage", h);
    };
  }, [refreshStats]);

  const level = levelFromXp(xp);
  const progress = xpProgressPercent(xp, level);
  const radarValues = RADAR_STATS.map((s) => s.getValue());

  // ─── THREAT LEVEL & DECAY LOGIC ─────────────────────
  const threatScore = Math.round(
    Math.min(25, (stats.gpa / 6.0) * 25) +
      Math.min(25, (stats.focusHrs / 20) * 25) +
      Math.min(25, (stats.streak / 7) * 25) +
      Math.min(25, (stats.neuralCount / 5) * 25),
  );

  let threatColor = "#f87171"; // Red
  if (threatScore >= 70)
    threatColor = "#4ade80"; // Green
  else if (threatScore >= 30) threatColor = "#fbbf24"; // Amber

  const isDecayed = stats.streak === 0 || threatScore < 30;

  return (
    <>
      {/* Visual Decay Overlay */}
      {isDecayed && <Scanlines />}

      <main
        className="dash-main"
        style={{
          boxShadow: isDecayed
            ? "inset 0 0 120px rgba(248, 113, 113, 0.06)"
            : "none",
        }}
      >
        {/* Warning Banner */}
        {isDecayed && <DecayBanner />}

        {/* Greeting */}
        <section className="dash-greeting">
          <div>
            <h1 className="dash-greeting-text">{getGreeting()}, Zach</h1>
            <p className="dash-date">{getDate()}</p>
          </div>
          <div className="dash-level">
            <span className="dash-level-text">Level {level}</span>
            <div className="dash-xp-bar-outer">
              <div
                className="dash-xp-bar-inner"
                style={{
                  width: progress + "%",
                }}
              />
            </div>
            <span className="dash-xp-text">{xp} XP</span>
          </div>
        </section>

        {/* Directive */}
        <DirectiveCard
          directive={directive}
          onComplete={() => {
            const dir = getOrCreateDirective({
              gpa: stats.gpa,
              weeklyFocusHours: stats.focusHrs,
              flowStreak: stats.streak,
              neuralCount: stats.neuralCount,
            });
            setDirective(dir);
          }}
        />

        {/* Stats */}
        <section className="dash-stats">
          <div className="dash-stat-card">
            <span className="dash-stat-label">CLASS RANK</span>
            <span className="dash-stat-value dash-stat-red">{stats.rank}</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">THREAT LEVEL</span>
            <span className="dash-stat-value" style={{ color: threatColor }}>
              {threatScore}
            </span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">WEEKLY FOCUS</span>
            <span className="dash-stat-value dash-stat-blue">
              {stats.focusHrs > 0 ? stats.focusHrs.toFixed(1) + "h" : "0.0h"}
            </span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">FLOW STREAK</span>
            <span className="dash-stat-value dash-stat-green">
              {stats.streak}d
            </span>
          </div>
        </section>

        {/* Radar + Quick Actions */}
        <section className="dash-middle">
          <div className="dash-radar-block">
            <div className="dash-section-header">
              <span className="dash-section-title">Performance</span>
              <span className="dash-section-sub">Last 7 days</span>
            </div>
            <div className="dash-radar-wrap">
              <RadarChart values={radarValues} />
            </div>
            <div className="dash-legend">
              {RADAR_STATS.map((s, i) => (
                <div key={i} className="dash-legend-item">
                  <div
                    className="dash-legend-dot"
                    style={{
                      background: s.color,
                    }}
                  />
                  <span className="dash-legend-label">{s.label}</span>
                  <span className="dash-legend-value">
                    {Math.round(radarValues[i] * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-quick-block">
            <div className="dash-section-header">
              <span className="dash-section-title">Quick Start</span>
            </div>
            <div className="dash-quick-grid">
              <Link href="/threat-engine" className="dash-quick-btn">
                <span className="dash-quick-icon">+</span>
                <span>Log grades</span>
              </Link>
              <Link href="/overclock" className="dash-quick-btn">
                <span className="dash-quick-icon">▶</span>
                <span>Start focus</span>
              </Link>
              <Link href="/neural-link" className="dash-quick-btn">
                <span className="dash-quick-icon">◇</span>
                <span>Observe</span>
              </Link>
              <Link href="/vault" className="dash-quick-btn">
                <span className="dash-quick-icon">$</span>
                <span>Log trade</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="dash-modules">
          <div className="dash-section-header">
            <span className="dash-section-title">Modules</span>
            <span className="dash-section-sub">{MODULES.length} active</span>
          </div>
          <div className="dash-modules-grid">
            {MODULES.map((mod, i) => (
              <Link
                key={i}
                href={mod.path}
                style={{
                  textDecoration: "none",
                }}
              >
                <div className="dash-module-card">
                  <div
                    className="dash-module-accent"
                    style={{
                      background: mod.color,
                    }}
                  />
                  <div className="dash-module-content">
                    <div className="dash-module-icon">{mod.icon}</div>
                    <div className="dash-module-name">{mod.name}</div>
                    <div className="dash-module-desc">{mod.desc}</div>
                    <div
                      className="dash-module-stat"
                      style={{
                        color: mod.color,
                      }}
                    >
                      {mod.stat()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="dash-footer">
          <span className="dash-footer-text">All systems online</span>
          <button
            onClick={() => {
              localStorage.removeItem(SESSION_KEY);
              window.location.reload();
            }}
            className="dash-lock-btn"
          >
            Lock
          </button>
        </footer>
      </main>
    </>
  );
}

// ─── PAGE ────────────────────────────────────────────

export default function Page() {
  const [isAuth, setIsAuth] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsAuth(localStorage.getItem(SESSION_KEY) === "authenticated");
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuth) return <PasswordGate onUnlock={() => setIsAuth(true)} />;
  return <Dashboard />;
}

// ─── GATE STYLES ─────────────────────────────────────

const gateStyles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "48px",
    background: "#141414",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  icon: { marginBottom: "8px" },
  title: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#fafafa",
    margin: 0,
    fontFamily: "var(--font-body)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.4)",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "260px",
    marginTop: "8px",
  },
  input: {
    background: "#0a0a0a",
    border: "1px solid",
    padding: "12px 16px",
    color: "#fafafa",
    fontFamily: "var(--font-mono)",
    fontSize: "0.9rem",
    textAlign: "center",
    outline: "none",
    borderRadius: "10px",
  },
  button: {
    background: "#fafafa",
    color: "#0a0a0a",
    border: "none",
    padding: "12px",
    fontFamily: "var(--font-body)",
    fontSize: "0.8rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    borderRadius: "10px",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.75rem",
    margin: 0,
  },
};
