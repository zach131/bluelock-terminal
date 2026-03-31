// src/app/threat-engine/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSync } from "@/lib/useSync";
import {
  SUBJECTS,
  SUBJECT_BY_KEY,
  SUBJECT_BY_ID,
  XP_VALUES,
} from "@/lib/constants";
import {
  calculateCumulativeGpa,
  getCurrentAvg,
  formatAvg,
  gradeColor,
} from "@/lib/grades";
import {
  levelFromXp,
  xpInCurrentLevel,
  xpNeededForLevel,
  xpProgressPercent,
} from "@/lib/xp";
import { awardXp, getGlobalXp } from "@/lib/globalXp";
import type {
  GradesState,
  ClassData,
  SubjectID,
  LogEntry,
  QuarterID,
  GradeEntry,
} from "@/types";

function createDefaultClasses(): ClassData[] {
  return SUBJECTS.map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    grades: { q1: [], q2: [], q3: [], q4: [] },
  }));
}

const DEFAULT_STATE: GradesState = {
  classes: createDefaultClasses(),
  rank: { current: 76, total: 736 },
  activeQuarter: "q3",
  lockedQuarters: [],
};

const SYNC_KEY = "bluelock_threat_engine";

const COMMANDS = [
  { cmd: "+m q1 95 92", desc: "Log Summative grades (default)" },
  { cmd: "+m q1 f 95", desc: "Log Formative grade (use 'f')" },
  { cmd: "override m q1 92", desc: "Set Q1 average directly" },
  { cmd: "lock q1", desc: "Archive a quarter (read-only)" },
  { cmd: "switch q3", desc: "Change active quarter" },
  { cmd: "import", desc: "Open bulk grade injector" },
  { cmd: "rank 76/736", desc: "Update your class rank" },
  { cmd: "reset", desc: "Reset all grades (with confirm)" },
  { cmd: "clear", desc: "Clear the log" },
  { cmd: "help", desc: "Show this reference" },
];

const SUBJECT_KEYS = SUBJECTS.map((s) => `${s.key} = ${s.name}`);

export default function ThreatEngine() {
  const { data, loading, saveStatus, update } = useSync<GradesState>({
    cloudKey: SYNC_KEY,
    defaultValue: DEFAULT_STATE,
  });

  const [cmd, setCmd] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<SubjectID | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importForm, setImportForm] = useState({
    subject: "m",
    period: "q1",
    category: "SUMMATIVE",
    mode: "DETAILED" as "DETAILED" | "OVERRIDE",
    grades: "",
  });
  const [xp, setXp] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback(
    (type: LogEntry["type"], msg: string) =>
      setLogs((prev) => [...prev.slice(-4), { type, msg }]),
    [],
  );

  useEffect(() => {
    setXp(getGlobalXp());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.xp !== undefined) setXp(detail.xp);
    };
    window.addEventListener("blt-xp-update", handler);
    return () => window.removeEventListener("blt-xp-update", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (importOpen || showHelp) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [importOpen, showHelp]);

  // --- Logic Handlers ---

  const overrideGrades = useCallback(
    (id: SubjectID, period: QuarterID, grade: number) => {
      if ((data.lockedQuarters || []).includes(period)) {
        addLog("err", `Q${period[1]} IS LOCKED`);
        return;
      }
      update((prev) => {
        const classes = prev.classes.map((cls) => {
          if (cls.id !== id) return cls;
          const entry: GradeEntry = {
            earned: grade,
            possible: 100,
            category: "OVERRIDE",
          };
          const newGrades = { ...cls.grades } || {};
          newGrades[period] = [entry];
          return { ...cls, grades: newGrades };
        });
        return { ...prev, classes };
      });
      const xpAmount = XP_VALUES.GRADE_ENTRY;
      const newTotal = awardXp(xpAmount, "ACADEMICS");
      setXp(newTotal);
      addLog(
        "ok",
        `OVERRIDE: ${SUBJECT_BY_ID[id]?.name} [${period.toUpperCase()}] = ${grade}%`,
      );
    },
    [update, addLog, data.lockedQuarters],
  );

  const injectGrades = useCallback(
    (
      id: SubjectID,
      period: QuarterID,
      grades: number[],
      category: "SUMMATIVE" | "FORMATIVE",
    ) => {
      if ((data.lockedQuarters || []).includes(period)) {
        addLog("err", `Q${period[1]} IS LOCKED`);
        return;
      }
      update((prev) => {
        const classes = prev.classes.map((cls) => {
          if (cls.id !== id) return cls;
          const entries = grades.map((g) => ({
            earned: g,
            possible: 100,
            category,
          }));
          const newGrades = { ...cls.grades } || {};
          newGrades[period] = [...(newGrades[period] || []), ...entries];
          return { ...cls, grades: newGrades };
        });
        return { ...prev, classes };
      });
      const xpAmount = grades.length * XP_VALUES.GRADE_ENTRY;
      const newTotal = awardXp(xpAmount, "ACADEMICS");
      setXp(newTotal);
      addLog(
        "ok",
        `LOGGED: ${SUBJECT_BY_ID[id]?.name} [${period.toUpperCase()}] [${category.charAt(0)}] +${xpAmount}XP`,
      );
    },
    [update, addLog, data.lockedQuarters],
  );

  const deleteGrade = useCallback(
    (id: SubjectID, period: QuarterID, index: number) => {
      if ((data.lockedQuarters || []).includes(period)) {
        addLog("err", `Q${period[1]} IS LOCKED`);
        return;
      }
      update((prev) => {
        const classes = prev.classes.map((cls) => {
          if (cls.id !== id) return cls;
          const newGrades = { ...cls.grades };
          newGrades[period] = (newGrades[period] || []).filter(
            (_, i) => i !== index,
          );
          return { ...cls, grades: newGrades };
        });
        return { ...prev, classes };
      });
      addLog("info", "GRADE REMOVED");
    },
    [update, addLog, data.lockedQuarters],
  );

  const lockQuarter = useCallback(
    (q: QuarterID) => {
      if (data.lockedQuarters.includes(q)) {
        addLog("err", `Q${q[1]} ALREADY LOCKED`);
        return;
      }
      update((prev) => ({
        ...prev,
        lockedQuarters: [...prev.lockedQuarters, q],
      }));
      addLog("ok", `QUARTER ${q.toUpperCase()} ARCHIVED`);
    },
    [update, addLog, data.lockedQuarters],
  );

  const switchQuarter = useCallback(
    (q: QuarterID) => {
      update((prev) => ({ ...prev, activeQuarter: q }));
      addLog("info", `ACTIVE QUARTER: ${q.toUpperCase()}`);
    },
    [update, addLog],
  );

  const handleCmd = useCallback(
    (raw: string) => {
      const c = raw.trim().toLowerCase();
      if (c === "import") {
        setImportOpen(true);
        return;
      }
      if (c === "clear") {
        setLogs([]);
        return;
      }
      if (c === "help") {
        setShowHelp(true);
        return;
      }
      if (c === "reset") {
        if (confirm("Reset all grades?")) {
          update(() => DEFAULT_STATE);
          addLog("err", "DATA RESET");
        }
        return;
      }
      if (c.startsWith("rank ")) {
        const parts = c.replace("rank ", "").split("/");
        if (parts.length === 2) {
          const cur = parseInt(parts[0]);
          const tot = parseInt(parts[1]);
          if (!isNaN(cur) && !isNaN(tot)) {
            update((prev) => ({ ...prev, rank: { current: cur, total: tot } }));
            addLog("ok", `RANK → #${cur}/${tot}`);
            return;
          }
        }
        addLog("err", "SYNTAX: rank 76/736");
        return;
      }
      if (c.startsWith("lock ")) {
        const q = raw.split(" ")[1].toLowerCase() as QuarterID;
        if (["q1", "q2", "q3", "q4"].includes(q)) lockQuarter(q);
        else addLog("err", "SYNTAX: lock q1");
        return;
      }
      if (c.startsWith("switch ")) {
        const q = raw.split(" ")[1].toLowerCase() as QuarterID;
        if (["q1", "q2", "q3", "q4"].includes(q)) switchQuarter(q);
        else addLog("err", "SYNTAX: switch q3");
        return;
      }
      if (c.startsWith("+")) {
        const parts = raw.split(" ");
        const key = parts[0].substring(1);
        const period = parts[1] as QuarterID;
        let category: "SUMMATIVE" | "FORMATIVE" = "SUMMATIVE";
        let gradeStartIndex = 2;
        if (parts[2] && parts[2].toLowerCase() === "f") {
          category = "FORMATIVE";
          gradeStartIndex = 3;
        }
        const grades = parts
          .slice(gradeStartIndex)
          .map(Number)
          .filter((g) => !isNaN(g));
        const target = SUBJECT_BY_KEY[key.toLowerCase()];
        if (!target || !period || grades.length === 0) {
          addLog("err", "SYNTAX: +m q1 95  OR  +m q1 f 95");
          return;
        }
        injectGrades(target.id, period, grades, category);
        return;
      }
      if (c.startsWith("override ")) {
        const parts = raw.split(" ");
        const key = parts[1];
        const period = parts[2] as QuarterID;
        const grade = parseInt(parts[3]);
        const target = SUBJECT_BY_KEY[key.toLowerCase()];
        if (!target || !period || isNaN(grade)) {
          addLog("err", "SYNTAX: override m q1 92");
          return;
        }
        overrideGrades(target.id, period, grade);
        return;
      }
      addLog("err", `UNKNOWN: ${c}`);
    },
    [injectGrades, update, addLog, lockQuarter, switchQuarter],
  );

  const gpa = calculateCumulativeGpa(data.classes);
  const level = levelFromXp(xp);
  const progress = xpProgressPercent(xp, level);
  const sortedClasses = [...data.classes].sort(
    (a, b) => getCurrentAvg(b) - getCurrentAvg(a),
  );

  if (loading)
    return (
      <div style={styles.loading}>
        <span style={{ color: "var(--threat)" }}>▸</span> CONNECTING...
      </div>
    );

  return (
    <div style={styles.container}>
      <header style={styles.hud}>
        <div style={styles.hudTop}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>RANK</span>
            <span style={{ ...styles.statValue, color: "var(--cyan-500)" }}>
              #{data.rank.current}
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                /{data.rank.total}
              </span>
            </span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>GPA</span>
            <span
              style={{
                ...styles.statValue,
                fontSize: "1.8rem",
                color: gradeColor(gpa),
              }}
            >
              {gpa.toFixed(3)}
            </span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>LVL {level}</span>
            <div style={styles.xpBarOuter}>
              <div style={{ ...styles.xpBarInner, width: `${progress}%` }} />
            </div>
            <span style={styles.xpSubtext}>
              {xpInCurrentLevel(xp, level)}/{xpNeededForLevel(level)} XP
            </span>
          </div>
          <div style={styles.syncBadge}>
            <span
              style={{
                fontSize: "0.6rem",
                color:
                  saveStatus === "saved"
                    ? "var(--green-500)"
                    : saveStatus === "saving" || saveStatus === "syncing"
                      ? "var(--amber-500)"
                      : saveStatus === "error"
                        ? "var(--red-500)"
                        : "var(--text-muted)",
              }}
            >
              {saveStatus === "saved"
                ? "● SYNCED"
                : saveStatus === "saving"
                  ? "● SAVING"
                  : saveStatus === "syncing"
                    ? "○ PENDING"
                    : saveStatus === "error"
                      ? "✕ OFFLINE"
                      : "○ IDLE"}
            </span>
          </div>
        </div>
        <div style={styles.hudMeta}>
          <span style={{ color: "var(--text-muted)" }}>GEO: 5.5</span>
          <span
            style={{ color: "var(--amber-500)", textTransform: "uppercase" }}
          >
            {data.activeQuarter || "q3"}{" "}
            {(data.lockedQuarters || []).includes(data.activeQuarter || "q3")
              ? "(LOCKED)"
              : ""}
          </span>
        </div>
      </header>

      <div style={styles.classList}>
        {sortedClasses.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            expanded={expanded === cls.id}
            onToggle={() => setExpanded(expanded === cls.id ? null : cls.id)}
            onDeleteGrade={deleteGrade}
            activeQuarter={data.activeQuarter || "q3"}
            lockedQuarters={data.lockedQuarters || []}
          />
        ))}
      </div>

      <div style={styles.log}>
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              color:
                l.type === "err"
                  ? "var(--red-500)"
                  : l.type === "ok"
                    ? "var(--green-500)"
                    : "var(--text-muted)",
            }}
          >
            &gt; {l.msg}
          </div>
        ))}
      </div>

      <footer style={styles.footer}>
        <span style={{ color: "var(--threat)" }}>▸</span>
        <input
          ref={inputRef}
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCmd(cmd);
              setCmd("");
            }
          }}
          placeholder="+m q1 95 | lock q1 | help"
          style={styles.input}
        />
        <button
          onClick={() => setShowHelp(true)}
          style={styles.helpBtn}
          title="Commands"
        >
          ?
        </button>
      </footer>

      {showHelp && (
        <div style={styles.overlay} onClick={() => setShowHelp(false)}>
          <div style={styles.helpModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.helpHeader}>
              <span>COMMAND REFERENCE</span>
              <button
                onClick={() => setShowHelp(false)}
                style={styles.helpClose}
              >
                ×
              </button>
            </div>
            <div style={styles.helpBody}>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>COMMANDS</div>
                {COMMANDS.map((c, i) => (
                  <div key={i} style={styles.helpRow}>
                    <code style={styles.helpCmd}>{c.cmd}</code>
                    <span style={styles.helpDesc}>{c.desc}</span>
                  </div>
                ))}
              </div>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>SUBJECT KEYS</div>
                <div style={styles.helpKeyGrid}>
                  {SUBJECT_KEYS.map((k, i) => (
                    <div key={i} style={styles.helpKeyRow}>
                      <code style={styles.helpKey}>{k.split(" = ")[0]}</code>
                      <span style={styles.helpKeyName}>
                        {k.split(" = ")[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>WEIGHTING SYSTEM</div>
                <div style={styles.helpTip}>
                  L1 (AP/Adv): 70% Summative / 30% Formative
                </div>
                <div style={styles.helpTip}>
                  L2 (OnLevel): 60% Summative / 40% Formative
                </div>
                <div style={styles.helpTip}>
                  Use 'f' flag for Formative (e.g. +m q1 f 95)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div style={styles.overlay} onClick={() => setImportOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>DATA INJECTOR</div>
            <div style={styles.modalBody}>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-sm)",
                  marginBottom: "var(--space-sm)",
                }}
              >
                <button
                  onClick={() =>
                    setImportForm((f) => ({ ...f, mode: "DETAILED" }))
                  }
                  style={{
                    ...styles.toggleBtn,
                    background:
                      importForm.mode === "DETAILED"
                        ? "var(--bg-elevated)"
                        : "transparent",
                    borderColor:
                      importForm.mode === "DETAILED"
                        ? "var(--threat)"
                        : "var(--border)",
                    color:
                      importForm.mode === "DETAILED"
                        ? "var(--threat)"
                        : "var(--text-muted)",
                  }}
                >
                  DETAILED
                </button>
                <button
                  onClick={() =>
                    setImportForm((f) => ({ ...f, mode: "OVERRIDE" }))
                  }
                  style={{
                    ...styles.toggleBtn,
                    background:
                      importForm.mode === "OVERRIDE"
                        ? "var(--bg-elevated)"
                        : "transparent",
                    borderColor:
                      importForm.mode === "OVERRIDE"
                        ? "var(--threat)"
                        : "var(--border)",
                    color:
                      importForm.mode === "OVERRIDE"
                        ? "var(--threat)"
                        : "var(--text-muted)",
                  }}
                >
                  QUICK (AVG)
                </button>
              </div>
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                <select
                  value={importForm.subject}
                  onChange={(e) =>
                    setImportForm({ ...importForm, subject: e.target.value })
                  }
                  style={styles.select}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={importForm.period}
                  onChange={(e) =>
                    setImportForm({ ...importForm, period: e.target.value })
                  }
                  style={styles.select}
                >
                  <option value="q1">Q1</option>
                  <option value="q2">Q2</option>
                  <option value="q3">Q3</option>
                  <option value="q4">Q4</option>
                </select>
                {importForm.mode === "DETAILED" && (
                  <select
                    value={importForm.category}
                    onChange={(e) =>
                      setImportForm({
                        ...importForm,
                        category: e.target.value as any,
                      })
                    }
                    style={styles.select}
                  >
                    <option value="SUMMATIVE">SUM</option>
                    <option value="FORMATIVE">FORM</option>
                  </select>
                )}
              </div>
              <textarea
                placeholder={
                  importForm.mode === "OVERRIDE"
                    ? "Enter single average (e.g. 92)"
                    : "Grades separated by spaces or commas..."
                }
                value={importForm.grades}
                onChange={(e) =>
                  setImportForm({ ...importForm, grades: e.target.value })
                }
                style={styles.textarea}
                autoFocus
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "var(--space-sm)",
                }}
              >
                <button
                  onClick={() => setImportOpen(false)}
                  style={styles.cancelBtn}
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    if (importForm.mode === "OVERRIDE") {
                      const grade = parseInt(importForm.grades);
                      if (!isNaN(grade)) {
                        overrideGrades(
                          importForm.subject as SubjectID,
                          importForm.period as QuarterID,
                          grade,
                        );
                        setImportOpen(false);
                      }
                    } else {
                      const grades = importForm.grades
                        .split(/[\s,]+/)
                        .map(Number)
                        .filter((n) => !isNaN(n));
                      if (grades.length > 0) {
                        injectGrades(
                          importForm.subject as SubjectID,
                          importForm.period as QuarterID,
                          grades,
                          importForm.category as "SUMMATIVE" | "FORMATIVE",
                        );
                        setImportOpen(false);
                      }
                    }
                  }}
                  style={styles.injectBtn}
                >
                  INJECT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ClassCard Component
function ClassCard({
  cls,
  expanded,
  onToggle,
  onDeleteGrade,
  activeQuarter,
  lockedQuarters,
}: {
  cls: ClassData;
  expanded: boolean;
  onToggle: () => void;
  onDeleteGrade: (id: SubjectID, period: QuarterID, index: number) => void;
  activeQuarter: QuarterID;
  lockedQuarters: QuarterID[];
}) {
  const s1 = getCurrentAvg(cls);
  const totalGrades = Object.values(cls.grades || {}).flat().length;
  const quarters: QuarterID[] = ["q1", "q2", "q3", "q4"];
  const activeEntries = cls.grades?.[activeQuarter] || [];
  const sumGrades = activeEntries.filter(
    (e) => e.category === "SUMMATIVE" || !e.category,
  );
  const formGrades = activeEntries.filter((e) => e.category === "FORMATIVE");
  const sumAvg =
    sumGrades.length > 0
      ? (
          (sumGrades.reduce((s, g) => s + g.earned, 0) /
            sumGrades.reduce((s, g) => s + g.possible, 0)) *
          100
        ).toFixed(0)
      : "--";
  const formAvg =
    formGrades.length > 0
      ? (
          (formGrades.reduce((s, g) => s + g.earned, 0) /
            formGrades.reduce((s, g) => s + g.possible, 0)) *
          100
        ).toFixed(0)
      : "--";

  return (
    <div style={styles.cardWrapper}>
      <div style={styles.card} onClick={onToggle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <span
            style={{
              ...styles.levelBadge,
              borderColor:
                cls.level === "L1" ? "var(--threat)" : "var(--text-muted)",
              color: cls.level === "L1" ? "var(--threat)" : "var(--text-muted)",
            }}
          >
            {cls.level}
          </span>
          <span style={styles.className}>{cls.name}</span>
          {totalGrades > 0 && (
            <span style={styles.gradeCount}>{totalGrades}</span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-lg)",
          }}
        >
          <div style={styles.avgCol}>
            <span style={styles.avgLabel}>CUR</span>
            <span style={{ ...styles.avgValue, color: gradeColor(s1) }}>
              {formatAvg(s1)}
            </span>
          </div>
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "0.7rem",
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            ▸
          </span>
        </div>
      </div>
      {expanded && (
        <div style={styles.expanded}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--space-md)",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "var(--space-sm)",
            }}
          >
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
              {activeQuarter.toUpperCase()} BREAKDOWN
            </span>
            <div style={{ display: "flex", gap: "var(--space-md)" }}>
              <span
                style={{
                  fontSize: "0.55rem",
                  color: "var(--cyan-500)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                S ({sumAvg}%) / F ({formAvg}%)
              </span>
            </div>
          </div>
          {quarters.map((q) => {
            const grades = cls.grades?.[q] || [];
            const isLocked = lockedQuarters.includes(q);
            const sum = grades.filter(
              (g) => g.category === "SUMMATIVE" || !g.category,
            );
            const form = grades.filter((g) => g.category === "FORMATIVE");
            return (
              <div key={q} style={{ marginTop: "var(--space-sm)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {q.toUpperCase()} [{grades.length}]
                    {isLocked && (
                      <span style={{ color: "var(--amber-500)" }}> LOCKED</span>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-md)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={styles.catLabel}>SUM</div>
                    <div style={styles.gradeRow}>
                      {sum.map((g, i) => (
                        <span
                          key={i}
                          style={styles.gradeItemSum}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isLocked) onDeleteGrade(cls.id, q, i);
                          }}
                          title="Click to remove"
                        >
                          {g.earned}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.catLabel}>FORM</div>
                    <div style={styles.gradeRow}>
                      {form.map((g, i) => (
                        <span
                          key={i}
                          style={styles.gradeItemForm}
                          onClick={(e) => {
                            e.stopPropagation();
                            const realIndex = grades.findIndex(
                              (gr) => gr === g,
                            );
                            if (!isLocked) onDeleteGrade(cls.id, q, realIndex);
                          }}
                          title="Click to remove"
                        >
                          {g.earned}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
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
  hud: {
    padding: "var(--space-md) var(--space-lg)",
    background: "var(--bg-surface)",
    borderBottom: "1px solid var(--border)",
  },
  hudTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "var(--space-sm)",
  },
  stat: { display: "flex", flexDirection: "column" },
  statLabel: {
    fontSize: "0.55rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    marginBottom: "2px",
  },
  statValue: {
    fontSize: "1.3rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    lineHeight: 1,
  },
  xpBarOuter: {
    width: "80px",
    height: "3px",
    background: "var(--bg-primary)",
    borderRadius: "2px",
    overflow: "hidden",
    marginTop: "4px",
  },
  xpBarInner: {
    height: "100%",
    background: "var(--green-500)",
    borderRadius: "2px",
    transition: "width 0.5s ease",
  },
  xpSubtext: {
    fontSize: "0.5rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  syncBadge: { alignSelf: "center" },
  hudMeta: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--space-sm)",
    fontSize: "0.65rem",
  },
  classList: { flex: 1, overflowY: "auto" },
  cardWrapper: { borderBottom: "1px solid var(--border)" },
  card: {
    padding: "var(--space-md) var(--space-lg)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  levelBadge: {
    fontSize: "0.5rem",
    border: "1px solid",
    padding: "1px 5px",
    letterSpacing: "0.05em",
  },
  className: { fontSize: "0.85rem", fontWeight: 500 },
  gradeCount: {
    fontSize: "0.55rem",
    color: "var(--text-muted)",
    background: "var(--bg-elevated)",
    padding: "1px 6px",
    borderRadius: "var(--radius-sm)",
  },
  avgCol: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  avgLabel: {
    fontSize: "0.45rem",
    color: "var(--text-muted)",
    letterSpacing: "0.05em",
  },
  avgValue: {
    fontSize: "1rem",
    fontWeight: 600,
    fontFamily: "var(--font-display)",
  },
  expanded: {
    background: "var(--bg-surface)",
    padding: "0 var(--space-lg) var(--space-md)",
    borderTop: "1px solid var(--border)",
  },
  catLabel: {
    fontSize: "0.5rem",
    color: "var(--text-muted)",
    marginBottom: "2px",
  },
  gradeRow: { display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" },
  gradeItemSum: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(0,229,255,0.3)",
    color: "var(--cyan-500)",
    padding: "2px 6px",
    fontSize: "0.75rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
  },
  gradeItemForm: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "var(--text-muted)",
    padding: "2px 6px",
    fontSize: "0.75rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
  },
  log: {
    height: "32px",
    fontSize: "0.6rem",
    padding: "2px var(--space-lg)",
    overflow: "hidden",
    borderTop: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    padding: "var(--space-sm) var(--space-lg)",
    background: "var(--bg-input)",
    borderTop: "1px solid var(--border)",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    outline: "none",
  },
  helpBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s",
    flexShrink: 0,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  helpModal: {
    width: "90%",
    maxWidth: "520px",
    maxHeight: "80vh",
    background: "var(--bg-surface)",
    border: "1px solid var(--threat)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 0 20px rgba(255,23,68,0.2)",
  },
  helpHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    fontSize: "0.7rem",
    color: "var(--threat)",
    letterSpacing: "0.15em",
    fontWeight: 600,
  },
  helpClose: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  helpBody: {
    overflowY: "auto",
    padding: "var(--space-lg)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-lg)",
  },
  helpSection: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-sm)",
  },
  helpSectionTitle: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    letterSpacing: "0.12em",
    fontWeight: 600,
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--space-xs)",
  },
  helpRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
    padding: "var(--space-xs) 0",
  },
  helpCmd: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.75rem",
    color: "var(--green-500)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
  },
  helpDesc: { color: "var(--text-secondary)", fontSize: "0.75rem" },
  helpKeyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "var(--space-xs)",
  },
  helpKeyRow: { display: "flex", alignItems: "center", gap: "var(--space-sm)" },
  helpKey: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.7rem",
    color: "var(--threat)",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    minWidth: "24px",
    textAlign: "center",
  },
  helpKeyName: { color: "var(--text-secondary)", fontSize: "0.7rem" },
  helpTip: {
    color: "var(--text-muted)",
    fontSize: "0.7rem",
    paddingLeft: "var(--space-md)",
  },
  modal: {
    width: "90%",
    maxWidth: "480px",
    background: "var(--bg-surface)",
    border: "1px solid var(--threat)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-lg)",
    boxShadow: "0 0 20px rgba(255,23,68,0.2)",
  },
  modalHeader: {
    fontSize: "0.7rem",
    color: "var(--threat)",
    letterSpacing: "0.15em",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--space-sm)",
    marginBottom: "var(--space-md)",
    fontWeight: 600,
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-md)",
  },
  select: {
    flex: 1,
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "var(--space-sm) var(--space-md)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    borderRadius: "var(--radius-sm)",
  },
  textarea: {
    width: "100%",
    height: "80px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "var(--space-md)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    resize: "none",
    borderRadius: "var(--radius-sm)",
  },
  cancelBtn: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    padding: "var(--space-sm) var(--space-md)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
  },
  injectBtn: {
    background: "rgba(255,23,68,0.15)",
    color: "var(--threat)",
    border: "1px solid var(--threat)",
    padding: "var(--space-sm) var(--space-lg)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    fontWeight: 600,
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
  },
  toggleBtn: {
    flex: 1,
    padding: "var(--space-sm) var(--space-md)",
    cursor: "pointer",
    border: "1px solid",
    fontFamily: "var(--font-mono)",
    fontSize: "0.65rem",
    letterSpacing: "0.05em",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s",
  },
};
