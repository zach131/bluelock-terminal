// src/app/overclock/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSync } from "@/lib/useSync";
import { awardXp, getGlobalXp } from "@/lib/globalXp";
import { XP_VALUES } from "@/lib/constants";

interface FocusSession {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMs: number;
  label: string;
}

interface OverclockData {
  sessions: FocusSession[];
}

const DEFAULT_DATA: OverclockData = {
  sessions: [],
};

const SYNC_KEY = "bluelock_overclock";

const FOCUS_LABELS = [
  "STUDY",
  "CODE",
  "READ",
  "PROBLEM SET",
  "REVIEW",
  "PROJECT",
  "OTHER",
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function formatHours(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  return hours.toFixed(1);
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekSessions(sessions: FocusSession[]): FocusSession[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return sessions.filter((s) => new Date(s.startTime) >= weekAgo);
}

function getTodaySessions(sessions: FocusSession[]): FocusSession[] {
  const today = getToday();
  return sessions.filter((s) => s.startTime.startsWith(today));
}

function getFlowStreak(sessions: FocusSession[]): number {
  if (sessions.length === 0) return 0;

  const daysWithFocus = new Set<string>();
  sessions.forEach((s) => {
    if (s.durationMs > 0) {
      daysWithFocus.add(s.startTime.split("T")[0]);
    }
  });

  const sortedDays = Array.from(daysWithFocus).sort().reverse();
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = checkDate.toISOString().split("T")[0];
    if (sortedDays.includes(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

function getWeeklyTotalMs(sessions: FocusSession[]): number {
  return getWeekSessions(sessions).reduce((sum, s) => sum + s.durationMs, 0);
}

function getTodayTotalMs(sessions: FocusSession[]): number {
  return getTodaySessions(sessions).reduce((sum, s) => sum + s.durationMs, 0);
}

function getWeeklyAvgSessionMs(sessions: FocusSession[]): number {
  const weekSessions = getWeekSessions(sessions);
  if (weekSessions.length === 0) return 0;
  return (
    weekSessions.reduce((sum, s) => sum + s.durationMs, 0) / weekSessions.length
  );
}

export default function Overclock() {
  const { data, loading, update } = useSync<OverclockData>({
    cloudKey: SYNC_KEY,
    defaultValue: DEFAULT_DATA,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeLabel, setActiveLabel] = useState("STUDY");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [xp, setXp] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    setXp(getGlobalXp());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.xp !== undefined) setXp(detail.xp);
    };
    window.addEventListener("blt-xp-update", handler);
    return () => window.removeEventListener("blt-xp-update", handler);
  }, []);

  const startFocus = useCallback(() => {
    const now = new Date();
    const sessionId = Date.now().toString();

    startTimeRef.current = now;
    setActiveSessionId(sessionId);
    setIsRunning(true);
    setIsPaused(false);
    setElapsedMs(0);

    update((prev) => ({
      sessions: [
        ...prev.sessions,
        {
          id: sessionId,
          startTime: now.toISOString(),
          endTime: null,
          durationMs: 0,
          label: activeLabel,
        },
      ],
    }));

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current.getTime());
      }
    }, 100);
  }, [activeLabel, update]);

  const pauseFocus = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPaused(true);
  }, []);

  const resumeFocus = useCallback(() => {
    startTimeRef.current = new Date(Date.now() - elapsedMs);
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current.getTime());
      }
    }, 100);
    setIsPaused(false);
  }, [elapsedMs]);

  const stopFocus = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const now = new Date();
    const finalDuration = elapsedMs;
    const xpEarned =
      Math.floor(finalDuration / (1000 * 60)) * XP_VALUES.FOCUS_MINUTE;

    if (finalDuration > 0 && activeSessionId) {
      update((prev) => ({
        sessions: prev.sessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, endTime: now.toISOString(), durationMs: finalDuration }
            : s,
        ),
      }));

      if (xpEarned > 0) {
        // UPDATED: Use awardXp for FOCUS
        const newTotal = awardXp(xpEarned, "FOCUS");
        setXp(newTotal);
      }
    }

    setIsRunning(false);
    setIsPaused(false);
    setElapsedMs(0);
    setActiveSessionId(null);
    startTimeRef.current = null;
  }, [elapsedMs, activeSessionId, update]);

  const deleteSession = useCallback(
    (id: string) => {
      update((prev) => ({
        sessions: prev.sessions.filter((s) => s.id !== id),
      }));
    },
    [update],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const todaySessions = getTodaySessions(data.sessions);
  const weekTotalMs = getWeeklyTotalMs(data.sessions);
  const weekSessionCount = getWeekSessions(data.sessions).length;
  const avgSessionMs = getWeeklyAvgSessionMs(data.sessions);
  const flowStreak = getFlowStreak(data.sessions);
  const todayTotalMs = getTodayTotalMs(data.sessions);

  const todayHours = todayTotalMs / (1000 * 60 * 60);
  const dailyGoalPercent = Math.min((todayHours / 4) * 100, 100);

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={{ color: "#00E5FF" }}>▸</span> CONNECTING...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.timerSection}>
        <div style={styles.timerLabel}>
          {isRunning ? (isPaused ? "PAUSED" : "FLOW STATE") : "READY"}
        </div>
        <div
          style={{
            ...styles.timerDisplay,
            color: isRunning
              ? isPaused
                ? "#FFD700"
                : "#00E5FF"
              : "var(--text-muted)",
            textShadow:
              isRunning && !isPaused ? "0 0 30px rgba(0,229,255,0.3)" : "none",
          }}
        >
          {formatDuration(elapsedMs)}
        </div>

        {!isRunning ? (
          <div style={styles.setupRow}>
            <div style={styles.labelPicker}>
              {FOCUS_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => setActiveLabel(label)}
                  style={{
                    ...styles.labelBtn,
                    borderColor:
                      activeLabel === label ? "#00E5FF" : "var(--border)",
                    color:
                      activeLabel === label ? "#00E5FF" : "var(--text-muted)",
                    background:
                      activeLabel === label
                        ? "rgba(0,229,255,0.1)"
                        : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={startFocus} style={styles.startBtn}>
              ENGAGE
            </button>
          </div>
        ) : (
          <div style={styles.controlRow}>
            <button onClick={stopFocus} style={styles.stopBtn}>
              ■ STOP
            </button>
            <button
              onClick={isPaused ? resumeFocus : pauseFocus}
              style={styles.pauseBtn}
            >
              {isPaused ? "▶ RESUME" : "❚❚ PAUSE"}
            </button>
          </div>
        )}

        <div style={styles.dailyGoal}>
          <div style={styles.dailyGoalHeader}>
            <span style={styles.dailyGoalLabel}>DAILY GOAL</span>
            <span style={styles.dailyGoalValue}>
              {todayHours.toFixed(1)} / 4.0 hrs
            </span>
          </div>
          <div style={styles.dailyGoalBarOuter}>
            <div
              style={{
                ...styles.dailyGoalBarInner,
                width: `${dailyGoalPercent}%`,
                background:
                  dailyGoalPercent >= 100
                    ? "#00E676"
                    : dailyGoalPercent >= 50
                      ? "#00E5FF"
                      : "#FFD700",
              }}
            />
          </div>
        </div>
      </div>

      <div style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>THIS WEEK</span>
            <span style={styles.statValue}>{formatHours(weekTotalMs)}h</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>SESSIONS</span>
            <span style={styles.statValue}>{weekSessionCount}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>AVG SESSION</span>
            <span style={styles.statValue}>{formatDuration(avgSessionMs)}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>FLOW STREAK</span>
            <span
              style={{
                ...styles.statValue,
                color:
                  flowStreak >= 7
                    ? "#00E676"
                    : flowStreak >= 3
                      ? "#00E5FF"
                      : "var(--text-primary)",
              }}
            >
              {flowStreak}d
            </span>
          </div>
        </div>
      </div>

      <div style={styles.sessionsSection}>
        <div style={styles.sessionsHeader}>TODAY [{todaySessions.length}]</div>
        {todaySessions.length === 0 ? (
          <div style={styles.emptySessions}>
            No sessions today. Hit ENGAGE to start.
          </div>
        ) : (
          todaySessions.map((s) => (
            <div key={s.id} style={styles.sessionRow}>
              <div style={styles.sessionInfo}>
                <span style={styles.sessionLabel}>{s.label}</span>
                <span style={styles.sessionTime}>
                  {new Date(s.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div style={styles.sessionRight}>
                <span style={styles.sessionDuration}>
                  {formatDuration(s.durationMs)}
                </span>
                <span style={styles.sessionXp}>
                  +
                  {Math.floor(s.durationMs / (1000 * 60)) *
                    XP_VALUES.FOCUS_MINUTE}
                  XP
                </span>
                <button
                  onClick={() => deleteSession(s.id)}
                  style={styles.sessionDelete}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--bg-primary)",
  },
  loading: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
  },
  timerSection: {
    padding: "var(--space-xl) var(--space-lg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
  },
  timerLabel: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    letterSpacing: "0.2em",
    fontWeight: 600,
    marginBottom: "var(--space-sm)",
  },
  timerDisplay: {
    fontSize: "3.5rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    letterSpacing: "0.05em",
    lineHeight: 1,
    marginBottom: "var(--space-lg)",
    transition: "color 0.3s, text-shadow 0.3s",
  },
  setupRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-md)",
    width: "100%",
    maxWidth: "500px",
  },
  labelPicker: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-xs)",
    justifyContent: "center",
  },
  labelBtn: {
    border: "1px solid",
    padding: "4px 10px",
    fontSize: "0.6rem",
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.05em",
    fontWeight: 500,
    transition: "all 0.15s",
  },
  startBtn: {
    background: "#00E5FF",
    color: "#000",
    border: "none",
    padding: "12px 48px",
    fontSize: "0.85rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.15em",
    transition: "all 0.15s",
  },
  controlRow: {
    display: "flex",
    gap: "var(--space-md)",
  },
  stopBtn: {
    background: "transparent",
    border: "1px solid var(--red-500)",
    color: "var(--red-500)",
    padding: "10px 24px",
    fontSize: "0.75rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.1em",
  },
  pauseBtn: {
    background: "transparent",
    border: "1px solid #FFD700",
    color: "#FFD700",
    padding: "10px 24px",
    fontSize: "0.75rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.1em",
  },
  dailyGoal: {
    width: "100%",
    maxWidth: "500px",
    marginTop: "var(--space-lg)",
  },
  dailyGoalHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "var(--space-xs)",
  },
  dailyGoalLabel: {
    fontSize: "0.5rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
  },
  dailyGoalValue: {
    fontSize: "0.55rem",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
  },
  dailyGoalBarOuter: {
    width: "100%",
    height: "4px",
    background: "var(--bg-primary)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  dailyGoalBarInner: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.5s ease",
  },
  statsSection: {
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--space-sm)",
  },
  statCard: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--space-sm) var(--space-md)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  statLabel: {
    fontSize: "0.45rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
  },
  statValue: {
    fontSize: "1rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    color: "var(--text-primary)",
  },
  sessionsSection: {
    flex: 1,
    overflowY: "auto",
  },
  sessionsHeader: {
    fontSize: "0.55rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    padding: "var(--space-sm) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    fontWeight: 600,
  },
  emptySessions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-xl)",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
  },
  sessionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-sm) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
  },
  sessionInfo: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
  },
  sessionLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#00E5FF",
    letterSpacing: "0.05em",
  },
  sessionTime: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
  },
  sessionRight: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
  },
  sessionDuration: {
    fontSize: "0.8rem",
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    color: "var(--text-primary)",
  },
  sessionXp: {
    fontSize: "0.6rem",
    color: "var(--green-500)",
    fontWeight: 500,
  },
  sessionDelete: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
};
