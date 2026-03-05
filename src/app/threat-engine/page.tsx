'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

type SubjectID = 'alg' | 'csp' | 'aphu' | 'bio' | 'eng' | 'spa' | 'band';

interface ClassData {
  id: SubjectID;
  name: string;
  level: 'L1' | 'L2'; // L1=AP, L2=Regular
  formative: number[];
  summative: number[];
}

interface LogEntry {
  type: 'success' | 'error' | 'info' | 'breach' | 'sim';
  message: string;
}

// KHS Scale: 100 = 5.0 (L2) or 6.0 (L1). Target is 5.75.
// L2 = +1.0 weight, L1 = +2.0 weight (on top of base 4.0? No, KHS usually caps at 5/6).
// Let's assume Base 4.0 scale + 1.0 (Reg) or + 2.0 (AP).
// So 100 in Reg = 5.0. 100 in AP = 6.0.

const GPA_SCALE = [
  [97, 100, 4.0], [93, 96, 3.8], [90, 92, 3.6], 
  [87, 89, 3.4], [83, 86, 3.2], [80, 82, 3.0],
  [77, 79, 2.8], [73, 76, 2.6], [70, 72, 2.4], 
  [0, 69, 0.0]
];

const SUBJECT_MAP: { [key: string]: { name: string; id: SubjectID; level: 'L1' | 'L2' } } = {
  'm': { name: 'Algebra II', id: 'alg', level: 'L2' },
  'cs': { name: 'AP CSP', id: 'csp', level: 'L1' },
  'h': { name: 'AP Human', id: 'aphu', level: 'L1' },
  'b': { name: 'Biology', id: 'bio', level: 'L2' },
  'e': { name: 'English 1', id: 'eng', level: 'L2' },
  's': { name: 'Spanish 2', id: 'spa', level: 'L2' },
  'vb': { name: 'Varsity Band', id: 'band', level: 'L2' },
};

// FOUNDATION: Geometry Advanced (8th Grade)
// 95 Average = 5.5 GPA (L2 weight assumed for advanced middle school? Or L1? Assuming L2: 95 -> 4.8ish + 1 = 5.8? 
// User said "95 / 5.5". Let's lock the 5.5 value directly.
const FOUNDATION = { credits: 1.0, gpa: 5.5 };

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAvg(arr: number[]): number {
  if (arr.length === 0) return 100;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getClassAvg(f: number[], s: number[]): number {
  return (getAvg(f) * 0.3) + (getAvg(s) * 0.7);
}

function getBasePoints(grade: number): number {
  for (const [min, max, pts] of GPA_SCALE) {
    if (grade >= min && grade <= max) return pts;
  }
  return 0;
}

function calcStrikes(currentAvg: number, fAvg: number): number {
  // How many 100s on Summative to hit 95?
  // (FAvg * 0.3) + (NewSAvg * 0.7) >= 95
  // NewSAvg >= (95 - (FAvg * 0.3)) / 0.7
  if (currentAvg >= 95) return 0;
  const target = 95;
  const requiredSummative = (target - (fAvg * 0.3)) / 0.7;
  if (requiredSummative > 100) return 99; // Impossible
  // Approximate count. This is a heuristic.
  // If current summative is 80, and we need 98, how many 100s?
  // This is complex dynamic math. Simplified: "Points needed / Weight"
  const deficit = target - currentAvg;
  return Math.ceil(deficit / 0.7); // Rough strokes needed
}

function calculateCumulativeGPA(classes: ClassData[]): number {
  let totalPoints = FOUNDATION.gpa * FOUNDATION.credits;
  let totalCredits = FOUNDATION.credits;

  classes.forEach(cls => {
    const grade = getClassAvg(cls.formative, cls.summative);
    let base = getBasePoints(grade);
    const weight = cls.level === 'L1' ? 2.0 : 1.0; // L1=AP (6.0 max), L2=Reg (5.0 max)
    totalPoints += (base + weight);
    totalCredits += 1;
  });

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ThreatEngine() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<SubjectID | null>(null);
  const [simGpa, setSimGpa] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init
  useEffect(() => {
    const stored = localStorage.getItem('bluelock_threat_v2');
    if (stored) setClasses(JSON.parse(stored));
    else {
      const defaults: ClassData[] = Object.values(SUBJECT_MAP).map(s => ({
        id: s.id, name: s.name, level: s.level, formative: [], summative: []
      }));
      setClasses(defaults);
    }
    addLog('info', 'TERMINAL ONLINE. FOUNDATION LOADED.');
  }, []);

  // Save
  useEffect(() => {
    if (classes.length > 0) localStorage.setItem('bluelock_threat_v2', JSON.stringify(classes));
  }, [classes]);

  // Focus
  useEffect(() => {
    window.addEventListener('keydown', () => inputRef.current?.focus());
  }, []);

  const addLog = (type: LogEntry['type'], msg: string) => setLogs(prev => [...prev.slice(-4), { type, message: msg }]);

  // PARSER
  const handleCommand = (raw: string) => {
    setSimGpa(null); // Clear simulation
    const commands = raw.split(';').map(c => c.trim());

    let tempClasses = [...classes];
    let simulation = false;

    for (const c of commands) {
      if (!c) continue;

      // SIMULATION CHECK
      if (c.startsWith('?')) {
        simulation = true;
        const subCmd = c.substring(1).trim();
        processInput(subCmd, tempClasses, true);
      } else {
        processInput(c, tempClasses, false);
      }
    }
    
    if (!simulation) setClasses(tempClasses);
  };

  const processInput = (input: string, data: ClassData[], isSim: boolean) => {
    // ADD
    if (input.startsWith('+')) {
      const parts = input.split(' ');
      const key = parts[0].substring(1);
      const type = parts[1];
      const grade = parseInt(parts[2]);

      const target = SUBJECT_MAP[key];
      if (!target || !type || isNaN(grade)) {
        addLog('error', 'ERR: SYNTAX');
        return;
      }

      const idx = data.findIndex(cls => cls.id === target.id);
      if (idx === -1) return;

      const arrKey = type === 't' ? 'summative' : 'formative';
      data[idx][arrKey].push(grade);
      
      if (isSim) {
        const newGpa = calculateCumulativeGPA(data);
        setSimGpa(newGpa);
        addLog('sim', `SIM: ${target.name} ${grade} -> GPA ${newGpa.toFixed(3)}`);
      } else {
        addLog('success', `LOGGED: ${target.name} [${grade}]`);
        if (grade < 97) addLog('breach', 'BREACH: GRADE < 97');
      }
    }
    // STATUS
    else if (input === 'status') {
      const critical = data.filter(c => getClassAvg(c.formative, c.summative) < 90);
      addLog('info', `CRITICAL TARGETS: ${critical.length}`);
    }
    // EXIT
    else if (input === 'exit') {
      window.location.href = '/'; // Hard redirect
    }
    // RESET (Dangerous)
    else if (input === 'reset_all') {
      localStorage.removeItem('bluelock_threat_v2');
      window.location.reload();
    }
    else {
      addLog('error', `UNKNOWN: ${input}`);
    }
  };

  // EDITOR
  const deleteGrade = (id: SubjectID, type: 'formative' | 'summative', idx: number) => {
    setClasses(prev => {
      const newClasses = [...prev];
      newClasses.find(c => c.id === id)![type].splice(idx, 1);
      return newClasses;
    });
    addLog('info', 'GRADE DELETED.');
  };

  // CALCULATIONS
  const gpa = calculateCumulativeGPA(classes);
  const probability = classes.filter(c => getClassAvg(c.formative, c.summative) >= 95).length >= 5 ? 'STABLE' : 'CRITICAL';

  // SORT (ROI)
  const sortedClasses = [...classes].sort((a, b) => {
    const avgA = getClassAvg(a.formative, a.summative);
    const avgB = getClassAvg(b.formative, b.summative);
    return avgA - avgB; // Lowest grades first
  });

  return (
    <main style={styles.main}>
      {/* HUD */}
      <header style={styles.hud}>
        <div style={styles.hudInner}>
          <div style={styles.statBlock}>
            <span style={styles.label}>PROB</span>
            <span style={{ ...styles.value, color: probability === 'STABLE' ? '#00FF41' : '#FFB000' }}>{probability}</span>
          </div>
          <div style={styles.statBlock}>
            <span style={styles.label}>GPA</span>
            <span style={{ ...styles.value, color: simGpa ? '#FFB000' : '#00FF41' }}>
              {(simGpa || gpa).toFixed(3)}
            </span>
          </div>
          <div style={styles.statBlock}>
            <span style={styles.label}>FOUNDATION</span>
            <span style={styles.subValue}>L1_GEO_95 [ACTIVE]</span>
          </div>
        </div>
      </header>

      {/* LIST */}
      <div style={styles.listContainer}>
        {sortedClasses.map(cls => {
          const avg = getClassAvg(cls.formative, cls.summative);
          const fAvg = getAvg(cls.formative);
          const strikes = calcStrikes(avg, fAvg);
          const isCritical = avg < 90;
          const isExpanded = expanded === cls.id;

          return (
            <div key={cls.id} onClick={() => setExpanded(isExpanded ? null : cls.id)} style={styles.rowWrapper}>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <div style={styles.rowTop}>
                    <span style={styles.levelBadge}>{cls.level}</span>
                    <span style={{ ...styles.rowName, color: isCritical ? '#FFB000' : '#FFF' }}>{cls.name}</span>
                  </div>
                </div>
                <div style={styles.rowData}>
                  <span style={styles.avgText}>{avg.toFixed(1)}</span>
                  <div style={styles.strikeBox}>
                    <span style={styles.strikeLabel}>STRK</span>
                    <span style={{ ...styles.strikeVal, color: strikes > 0 ? '#FFB000' : '#00FF41' }}>
                      {strikes === 99 ? 'X' : strikes}
                    </span>
                  </div>
                </div>
              </div>
              {/* EXPANDED VIEW */}
              {isExpanded && (
                <div style={styles.expanded}>
                  <div style={styles.expHeader}>
                    FORMATIVE [{cls.formative.length}]
                  </div>
                  <div style={styles.gradeList}>
                    {cls.formative.map((g, i) => (
                      <div key={i} style={styles.gradeItem}>
                        <span>{g}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteGrade(cls.id, 'formative', i); }} style={styles.delBtn}>X</button>
                      </div>
                    ))}
                    {cls.formative.length === 0 && <span style={styles.emptyText}>EMPTY</span>}
                  </div>
                  <div style={styles.expHeader}>
                    SUMMATIVE [{cls.summative.length}]
                  </div>
                  <div style={styles.gradeList}>
                    {cls.summative.map((g, i) => (
                      <div key={i} style={styles.gradeItem}>
                        <span>{g}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteGrade(cls.id, 'summative', i); }} style={styles.delBtn}>X</button>
                      </div>
                    ))}
                    {cls.summative.length === 0 && <span style={styles.emptyText}>EMPTY</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LOGS */}
      <div style={styles.logArea}>
        {logs.map((l, i) => (
          <div key={i} style={{ color: l.type === 'breach' ? '#FF1744' : l.type === 'sim' ? '#FFB000' : '#666' }}>
            {`> ${l.message}`}
          </div>
        ))}
      </div>

      {/* CLI */}
      <footer style={styles.footer}>
        <span style={styles.prompt}>{'>'}</span>
        <input
          ref={inputRef}
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { handleCommand(cmd); setCmd(''); }}}
          placeholder="CMD (+m q 95) or SIM (?m t 100)"
          style={styles.input}
        />
      </footer>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  main: { height: '100vh', background: '#000', color: '#FFF', fontFamily: 'monospace', display: 'flex', flexDirection: 'column' },
  hud: { borderBottom: '1px solid #222', padding: '10px 15px' },
  hudInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  statBlock: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.7rem', color: '#666' },
  value: { fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px' },
  subValue: { fontSize: '0.7rem', color: '#00FF41' },
  
  listContainer: { flex: 1, overflowY: 'auto', padding: '5px 0' },
  rowWrapper: { borderBottom: '1px solid #111' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer' },
  rowTop: { display: 'flex', alignItems: 'center', gap: '10px' },
  levelBadge: { fontSize: '0.6rem', border: '1px solid #333', padding: '2px 4px', color: '#666' },
  rowName: { fontSize: '0.9rem' },
  rowData: { display: 'flex', alignItems: 'center', gap: '15px' },
  avgText: { fontSize: '1.1rem', fontWeight: 'bold', width: '50px', textAlign: 'right' },
  strikeBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #333', padding: '2px 5px' },
  strikeLabel: { fontSize: '0.5rem', color: '#666' },
  strikeVal: { fontSize: '1rem', fontWeight: 'bold' },
  
  expanded: { background: '#050505', padding: '10px 20px 20px', borderTop: '1px solid #222' },
  expHeader: { fontSize: '0.7rem', color: '#00FF41', marginTop: '10px', marginBottom: '5px' },
  gradeList: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
  gradeItem: { background: '#111', padding: '2px 8px', border: '1px solid #333', display: 'flex', gap: '5px', alignItems: 'center' },
  delBtn: { background: 'none', border: 'none', color: '#FF1744', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' },
  emptyText: { color: '#444', fontSize: '0.7rem' },

  logArea: { height: '60px', overflow: 'hidden', padding: '5px 15px', fontSize: '0.7rem', borderTop: '1px solid #222' },
  
  footer: { display: 'flex', alignItems: 'center', padding: '10px', background: '#000', borderTop: '1px solid #333' },
  prompt: { color: '#00FF41', marginRight: '10px', fontWeight: 'bold' },
  input: { background: 'transparent', border: 'none', color: '#FFF', flex: 1, outline: 'none', fontFamily: 'monospace' },
};
