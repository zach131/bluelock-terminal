// src/app/threat-engine/calculator/page.tsx

"use client";

import { useState } from "react";
import { classGpa, cumulativeGpa, requiredForTarget } from "@/lib/grades";

export default function Calculator() {
  const [grade, setGrade] = useState(95);
  const [level, setLevel] = useState<"L1" | "L2">("L1");
  const [count, setCount] = useState(7);
  const [bankedGpa, setBankedGpa] = useState(5.5);
  const [bankedCredits, setBankedCredits] = useState(1);

  const cgpa = classGpa(grade, level);
  const cum = cumulativeGpa(bankedGpa, bankedCredits, cgpa, count);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SIMULATION ENGINE</span>
        <span style={styles.subtitle}>GPA PROJECTION</span>
      </div>

      <div style={styles.grid}>
        {/* Input */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>INPUT</div>

          <div style={styles.field}>
            <label style={styles.label}>AVERAGE %</label>
            <input
              type="number" min={0} max={100} value={grade}
              onChange={(e) => setGrade(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              style={styles.numberInput}
            />
            <input
              type="range" min={0} max={100} value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>TIER</label>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              {(["L1", "L2"] as const).map((t) => (
                <button key={t} onClick={() => setLevel(t)} style={{
                  ...styles.toggleBtn,
                  background: level === t ? "rgba(255,23,68,0.15)" : "var(--bg-primary)",
                  borderColor: level === t ? "var(--threat)" : "var(--border)",
                  color: level === t ? "var(--threat)" : "var(--text-muted)",
                }}>
                  {t} {t === "L1" ? "STD" : "HONORS"}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.field}>
            <label style={styles.label}>CLASSES</label>
            <input type="number" min={1} value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              style={styles.numberInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>BANKED GPA</label>
            <input type="number" step="0.001" value={bankedGpa}
              onChange={(e) => setBankedGpa(parseFloat(e.target.value) || 0)}
              style={styles.numberInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>BANKED CREDITS</label>
            <input type="number" min={0} value={bankedCredits}
              onChange={(e) => setBankedCredits(Math.max(0, parseInt(e.target.value) || 0))}
              style={styles.numberInput}
            />
          </div>
        </div>

        {/* Output */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>OUTPUT</div>

          <div style={styles.field}>
            <span style={styles.label}>CLASS GPA</span>
            <span style={{
              fontSize: "1.8rem", fontWeight: 700, fontFamily: "var(--font-display)", lineHeight: 1,
              color: cgpa >= 5.5 ? "var(--green-500)" : cgpa >= 4 ? "var(--amber-500)" : "var(--red-500)",
            }}>
              {cgpa.toFixed(2)}
            </span>
          </div>

          <div style={styles.divider} />

          <div style={styles.field}>
            <span style={styles.label}>CUMULATIVE GPA</span>
            <span style={{
              fontSize: "2.5rem", fontWeight: 700, fontFamily: "var(--font-display)", lineHeight: 1,
              color: cum >= 5.75 ? "var(--green-500)" : cum >= 5 ? "var(--amber-500)" : "var(--red-500)",
            }}>
              {cum.toFixed(3)}
            </span>
          </div>

          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textAlign: "right" }}>
            {bankedCredits}cr @ {bankedGpa.toFixed(2)} + {count} @ {grade}%
          </div>
        </div>
      </div>

      {/* Targets */}
      <div style={styles.targetsCard}>
        <div style={styles.cardTitle}>TARGET ANALYSIS</div>
        {[5.0, 5.25, 5.5, 5.75, 6.0].map((target) => {
          const req = requiredForTarget(target, bankedGpa, bankedCredits, count);
          const exceeded = req < 0;
          const impossible = req > 6;
          const achievable = !exceeded && !impossible;

          return (
            <div key={target} style={styles.targetRow}>
              <span style={{ color: "var(--text-secondary)" }}>GPA {target.toFixed(2)}</span>
              <span style={{
                color: exceeded ? "var(--green-500)" : achievable ? "var(--cyan-500)" : "var(--red-500)",
                fontWeight: 500,
              }}>
                {exceeded ? "EXCEEDED" : impossible ? "IMPOSSIBLE" : `REQ: ${req.toFixed(2)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1, padding: "var(--space-lg)", display: "flex", flexDirection: "column",
    gap: "var(--space-lg)", overflowY: "auto",
  },
  header: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  title: {
    fontSize: "1rem", fontWeight: 700, color: "var(--threat)", letterSpacing: "0.12em",
    fontFamily: "var(--font-display)",
  },
  subtitle: { fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "var(--space-lg)",
  },
  card: {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)", padding: "var(--space-lg)",
    display: "flex", flexDirection: "column", gap: "var(--space-md)",
  },
  cardTitle: {
    fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.15em", fontWeight: 600,
  },
  field: { display: "flex", flexDirection: "column", gap: "var(--space-xs)" },
  label: { fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.08em" },
  numberInput: {
    background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)",
    padding: "var(--space-sm) var(--space-md)", fontFamily: "var(--font-mono)",
    fontSize: "0.9rem", borderRadius: "var(--radius-sm)", width: "100%",
  },
  slider: { width: "100%", accentColor: "var(--threat)" },
  toggleBtn: {
    flex: 1, padding: "var(--space-sm) var(--space-md)", cursor: "pointer",
    border: "1px solid", fontFamily: "var(--font-mono)", fontSize: "0.65rem",
    letterSpacing: "0.05em", borderRadius: "var(--radius-sm)", transition: "all 0.15s",
  },
  divider: { height: "1px", background: "var(--border)" },
  targetsCard: {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)", padding: "var(--space-lg)",
  },
  targetRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "var(--space-sm) var(--space-md)", background: "var(--bg-primary)",
    marginTop: "var(--space-xs)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem",
  },
};
