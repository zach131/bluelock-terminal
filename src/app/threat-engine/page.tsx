'use client';

import { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

type SubjectID = 'alg' | 'csp' | 'aphu' | 'bio' | 'eng' | 'spa' | 'band';

interface GradeEntry { 
  earned: number; 
  possible: number; 
}

interface ClassData {
  id: SubjectID;
  name: string;
  level: 'L1' | 'L2';
  formative: GradeEntry[];
  summative: GradeEntry[];
}

interface LogEntry {
  type: 'success' | 'error' | 'info' | 'breach' | 'sim';
  message: string;
}

// CONSTANTS
const GPA_SCALE = [
  [97, 100, 4.0], [93, 96, 3.8], [90, 92, 3.6], 
  [87, 89, 3.4], [83, 86, 3.2], [80, 82, 3.0],
  [77, 79, 2.8], [73, 76, 2.6], [70, 72, 2.4], 
  [0, 69, 0.0]
];

const SUBJECT_MAP: { [key: string]: { name: string; id: SubjectID; level: 'L1' | 'L2' } } = {
  'm': { name: 'Algebra II', id: 'alg', level: 'L1' },
  'cs': { name: 'AP CSP', id: 'csp', level: 'L1' },
  'h': { name: 'AP Human', id: 'aphu', level: 'L1' },
  'b': { name: 'Biology', id: 'bio', level: 'L1' },
  'e': { name: 'English 1', id: 'eng', level: 'L1' },
  's': { name: 'Spanish 2', id: 'spa', level: 'L1' },
  'vb': { name: 'Varsity Band', id: 'band', level: 'L1' },
};

// Foundation: Geometry (8th Grade) - Banked Asset
const FOUNDATION = { credits: 1.0, gpa: 5.5 };

// Target: 5.75 Cumulative GPA
const TARGET_GPA = 5.75;
// Total Credits Target (Foundation + 7 Classes = 8.0)
const TOTAL_CREDITS_GOAL = 8.0; 

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function sumGrades(arr: GradeEntry[]): { earned: number, possible: number } {
  return arr.reduce((acc, g) => {
    acc.earned += g.earned;
    acc.possible += g.possible;
    return acc;
  }, { earned: 0, possible: 0 });
}

function getClassGradePercent(f: GradeEntry[], s: GradeEntry[]): number {
  // If no grades, assume 100% to prevent NaN
  if (f.length === 0 && s.length === 0) return 100;

  const fSum = sumGrades(f);
  const sSum = sumGrades(s);
  
  // Calculate weighted points
  // Formative is 30% of grade, Summative is 70%
  // We need to calculate the percentage based on total points per category?
  // No, schools usually do: (F_Avg * 0.3) + (S_Avg * 0.7).
  // BUT, for "Total Points" accuracy with weighted categories:
  // We treat the "Weight" as a multiplier for the points.
  
  // Total "Points" = (FormativeEarned / FormativePossible) * 30 + (SummativeEarned / SummativePossible) * 70
  // This maintains the 30/70 split while respecting point totals.
  
  const fAvg = fSum.possible > 0 ? (fSum.earned / fSum.possible) * 100 : 100;
  const sAvg = sSum.possible > 0 ? (sSum.earned / sSum.possible) * 100 : 100;

  return (fAvg * 0.3) + (sAvg * 0.7);
}

function getBasePoints(grade: number): number {
  for (const [min, max, pts] of GPA_SCALE) {
    if (grade >= min && grade <= max) return pts;
  }
  return 0;
}

function calcGPAForClass(cls: ClassData): number {
  const grade = getClassGradePercent(cls.formative, cls.summative);
  const base = getBasePoints(grade);
  const weight = cls.level === 'L1' ? 2.0 : 1.0;
  return base + weight;
}

function calculateCumulativeGPA(classes: ClassData[]): number {
  let totalPoints = FOUNDATION.gpa * FOUNDATION.credits;
  let totalCredits = FOUNDATION.credits;

  classes.forEach(cls => {
    totalPoints += calcGPAForClass(cls);
    totalCredits += 1;
  });

  return totalPoints / totalCredits;
}

function calcDrain(cls: ClassData, allClasses: ClassData[]): number {
  // Calculate current GPA
  const currentGPA = calculateCumulativeGPA(allClasses);
  
  // Calculate GPA if this class was perfect (100% = 6.0 for L1)
  const tempClasses = allClasses.map(c => {
    if (c.id === cls.id) {
      // Create a perfect clone
      return { 
        ...c, 
        formative: [{earned: 100, possible: 100}], 
        summative: [{earned: 100, possible: 100}] 
      };
    }
    return c;
  });
  
  const perfectGPA = calculateCumulativeGPA(tempClasses);
  return perfectGPA - currentGPA;
}

function calcStrikes(cls: ClassData): number {
  const fSum = sumGrades(cls.formative);
  const sSum = sumGrades(cls.summative);
  
  const currentGrade = getClassGradePercent(cls.formative, cls.summative);
  if (currentGrade >= 90) return 0;

  const target = 90;
  // How many points needed to reach 90%?
  // (CurrentPoints + (100 * N)) / (CurrentPossible + (100 * N)) = 0.90
  // Simplified heuristic: assume next assignments are Summative (heavier weight)
  // This is a rough approximation for "Reclamation Strikes".
  
  // Let's use the deficit approach.
  // Deficit from 90:
  const deficit = target - currentGrade; // e.g. 90 - 61 = 29
  
  // Each Summative 100 pulls the grade up.
  // If we have few summatives, one 100 swings it a lot.
  // If we have many, it swings less.
  // Approximation: each 100 on a major assignment swings average by ~2-5% typically.
  // Let's assume a "Strike" = a 100 on a standard 100pt assignment.
  // Using calculus: d(Grade)/d(Points) = ...
  // Let's simplify: We need to cover the deficit.
  // Each 100 in summative contributes ~70 points to the "weighted average".
  // So strikes = deficit / (avg_impact_per_100). Let's say impact is 2.5% per assignment.
  return Math.ceil(deficit / 2.5); 
}

function calcIntercept(gpa: number): string {
  // Required GPA for remaining credits to hit 5.75
  const currentCredits = FOUNDATION.credits + 7; // Assuming all 7 classes are active
  // Actually, let's assume we are calculating for the "Rest of High School" or just "Remaining classes"
  // Let's display "Required Average for 5.75" based on a theoretical perfect semester.
  
  // Let's show: "REQ_AVG: 5.8" (meaning you need 5.8 semesters to balance out)
  // Simpler: Remaining Points Needed.
  const targetPoints = TARGET_GPA * TOTAL_CREDITS_GOAL;
  const currentPoints = (gpa * (FOUNDATION.credits + 7)); // Approx current points
  
  if (gpa >= TARGET_GPA) return "LOCKED";
  
  const deficit = targetPoints - currentPoints;
  // If deficit is positive, you need to average this GPA on future credits.
  // But since we are mid-semester, this is just "Pressure".
  
  // Let's return the "Required Future Perf"
  // If GPA is 5.2, and target is 5.75, the gap is 0.55.
  // To close gap, you need > 5.75.
  const reqFuture = TARGET_GPA + (TARGET_GPA - gpa);
  
  if (reqFuture > 6.0) return "IMPOSSIBLE";
  return `REQ_SEM: ${reqFuture.toFixed(2)}`;
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

  // INIT
  useEffect(() => {
    const stored = localStorage.getItem('bluelock_threat_v4');
    if (stored) setClasses(JSON.parse(stored));
    else {
      const defaults: ClassData[] = Object.values(SUBJECT_MAP).map(s => ({
        id: s.id, name: s.name, level: s.level, formative: [], summative: []
      }));
      setClasses(defaults);
    }
    addLog('info', 'SYSTEM ONLINE. POINT-BASED ARCHITECTURE.');
  }, []);

  // SAVE
  useEffect(() => {
    if (classes.length > 0) localStorage.setItem('bluelock_threat_v4', JSON.stringify(classes));
  }, [classes]);

  // FOCUS
  useEffect(() => {
    window.addEventListener('keydown', () => inputRef.current?.focus());
  }, []);

  const addLog = (type: LogEntry['type'], msg: string) => setLogs(prev => [...prev.slice(-4), { type, message: msg }]);

  // PARSER
  const handleCommand = (raw: string) => {
    setSimGpa(null);
    const commands = raw.split(';').map(c => c.trim());
    let tempClasses = [...classes];
    let simulation = false;

    for (const c of commands) {
      if (!c) continue;
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
    // ADD COMMAND
    if (input.startsWith('+')) {
      const parts = input.split(' ');
      const key = parts[0].substring(1);
      const type = parts[1]; // q or t
      
      // Parse numbers: +m q 100 90 80
      // We map them to {earned, possible}. 
      // Standard input is just "Earned". We assume "Possible" is 100.
      const gradesRaw = parts.slice(2).map(g => parseInt(g)).filter(g => !isNaN(g));
      
      const target = SUBJECT_MAP[key];
      if (!target || !type || gradesRaw.length === 0) {
        addLog('error', 'ERR: SYNTAX. +[sub] [q/t] [grades...]');
        return;
      }

      const idx = data.findIndex(cls => cls.id === target.id);
      if (idx === -1) return;

      const arrKey = type === 't' ? 'summative' : 'formative';
      
      // Convert raw numbers to GradeEntry objects
      const newEntries: GradeEntry[] = gradesRaw.map(g => ({ earned: g, possible: 100 }));
      
      data[idx][arrKey].push(...newEntries);
      
      if (isSim) {
        const newGpa = calculateCumulativeGPA(data);
        setSimGpa(newGpa);
        addLog('sim', `SIM: +${gradesRaw.length} to ${target.name} -> GPA ${newGpa.toFixed(3)}`);
      } else {
        addLog('success', `LOGGED: ${target.name} [${newEntries.length} entries]`);
        const breaches = gradesRaw.filter(g => g < 90);
        if (breaches.length > 0) addLog('breach', `ANCHOR DETECTED: ${breaches.length} low scores`);
      }
    }
    else if (input === 'status') {
      const critical = data.filter(c => getClassGradePercent(c.formative, c.summative) < 90);
      addLog('info', `CRITICAL ANCHORS: ${critical.length}`);
    }
    else if (input === 'exit') window.location.href = '/';
    else if (input === 'reset') {
      if (confirm('RESET DATABASE?')) {
        localStorage.removeItem('bluelock_threat_v4');
        window.location.reload();
      }
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
    addLog('info', 'RECORD PURGED.');
  };

  // CALCULATIONS
  const gpa = calculateCumulativeGPA(classes);
  const intercept = calcIntercept(gpa);
  
  // Sort by Grade (Lowest first = Highest Priority)
  const sortedClasses = [...classes].sort((a, b) => 
    getClassGradePercent(a.formative, a.summative) - getClassGradePercent(b.formative, b.summative)
  );

  return (
    <main style={styles.main}>
      {/* HUD */}
      <header style={styles.hud}>
        <div style={styles.hudTop}>
          <div style={styles.statBlock}>
            <span style={styles.label}>CUMULATIVE GPA</span>
            <span style={{ ...styles.value, color: gpa >= 5.75 ? '#00FF41' : '#FFB000' }}>
              {(simGpa || gpa).toFixed(3)}
            </span>
          </div>
          <div style={styles.statBlock}>
            <span style={styles.label}>5.75 INTERCEPT</span>
            <span style={styles.subValue}>{intercept}</span>
          </div>
        </div>
        <div style={styles.hudBottom}>
          <div style={styles.bank}>
            <span style={styles.bankLabel}>BANK</span>
            <span style={styles.bankVal}>GEO_95 [5.5]</span>
          </div>
          <div style={styles.statusLight}>
            {gpa >= 5.5 ? 'NOMINAL' : 'DEGRADED'}
          </div>
        </div>
      </header>

      {/* LIST */}
      <div style={styles.listContainer}>
        {sortedClasses.map(cls => {
          const avg = getClassGradePercent(cls.formative, cls.summative);
          const drain = calcDrain(cls, classes);
          const strikes = calcStrikes(cls);
          const isCritical = avg < 90;
          const isExpanded = expanded === cls.id;

          return (
            <div key={cls.id} onClick={() => setExpanded(isExpanded ? null : cls.id)} style={styles.rowWrapper}>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <div style={styles.rowTop}>
                    <span style={styles.levelBadge}>L1</span>
                    <span style={{ ...styles.rowName, color: isCritical ? '#FF1744' : '#FFF' }}>{cls.name}</span>
                  </div>
                </div>
                <div style={styles.rowData}>
                  <div style={styles.avgBlock}>
                    <span style={styles.avgNum}>{avg.toFixed(1)}</span>
                    <span style={styles.avgSuffix}>%</span>
                  </div>
                  <div style={styles.drainBox}>
                    <span style={styles.drainLabel}>DRAIN</span>
                    <span style={{ ...styles.drainVal, color: drain > 0.1 ? '#FF1744' : '#666' }}>
                      -{drain.toFixed(3)}
                    </span>
                  </div>
                  <div style={styles.strikeBox}>
                    <span style={styles.strikeLabel}>STRK</span>
                    <span style={{ ...styles.strikeVal, color: strikes > 0 ? '#FFB000' : '#00FF41' }}>
                      {strikes}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* EXPANDED */}
              {isExpanded && (
                <div style={styles.expanded}>
                  <div style={styles.expHeader}>FORMATIVE [{cls.formative.length}]</div>
                  <div style={styles.gradeList}>
                    {cls.formative.map((g, i) => (
                      <div key={i} style={styles.gradeItem}>
                        <span>{g.earned}/{g.possible}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteGrade(cls.id, 'formative', i); }} style={styles.delBtn}>X</button>
                      </div>
                    ))}
                  </div>
                  <div style={styles.expHeader}>SUMMATIVE [{cls.summative.length}]</div>
                  <div style={styles.gradeList}>
                    {cls.summative.map((g, i) => (
                      <div key={i} style={styles.gradeItem}>
                        <span>{g.earned}/{g.possible}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteGrade(cls.id, 'summative', i); }} style={styles.delBtn}>X</button>
                      </div>
                    ))}
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
          <div key={i} style={{ color: l.type === 'breach' ? '#FF1744' : l.type === 'sim' ? '#00FF41' : '#666' }}>
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
          placeholder="CMD (+m q 100)"
          style={styles.input}
        />
      </footer>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES (Ghost UI / Static HUD)
// ═══════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  main: { height: '100vh', background: '#000', color: '#FFF', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  
  // HUD
  hud: { borderBottom: '2px solid #222', padding: '15px', background: '#050505', flexShrink: 0 },
  hudTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' },
  statBlock: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.7rem', color: '#666', letterSpacing: '1px' },
  value: { fontSize: '2rem', fontWeight: 'bold', lineHeight: 1 },
  subValue: { fontSize: '0.9rem', color: '#00FF41', fontFamily: 'monospace' },
  
  hudBottom: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '10px' },
  bank: { display: 'flex', gap: '10px', alignItems: 'center' },
  bankLabel: { fontSize: '0.6rem', border: '1px solid #333', padding: '2px 5px', color: '#666' },
  bankVal: { color: '#00FF41', fontSize: '0.8rem' },
  statusLight: { fontSize: '0.7rem', color: '#FFB000', letterSpacing: '2px' },

  // LIST
  listContainer: { flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }, // Hide scrollbar
  
  rowWrapper: { borderBottom: '1px solid #111' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', cursor: 'pointer' },
  rowTop: { display: 'flex', alignItems: 'center', gap: '8px' },
  levelBadge: { fontSize: '0.5rem', border: '1px solid #00FF41', color: '#00FF41', padding: '1px 3px' },
  rowName: { fontSize: '0.9rem', fontWeight: 'bold' },
  
  rowData: { display: 'flex', alignItems: 'center', gap: '10px' },
  avgBlock: { display: 'flex', alignItems: 'baseline' },
  avgNum: { fontSize: '1.2rem', fontWeight: 'bold' },
  avgSuffix: { fontSize: '0.7rem', color: '#666', marginLeft: '2px' },
  
  drainBox: { textAlign: 'center', width: '60px' },
  drainLabel: { display: 'block', fontSize: '0.5rem', color: '#666' },
  drainVal: { fontSize: '0.8rem' },
  
  strikeBox: { textAlign: 'center', width: '40px' },
  strikeLabel: { display: 'block', fontSize: '0.5rem', color: '#666' },
  strikeVal: { fontSize: '1rem', fontWeight: 'bold' },

  // EXPANDED
  expanded: { background: '#0A0A0A', padding: '10px 20px 20px', borderBottom: '1px solid #222' },
  expHeader: { fontSize: '0.7rem', color: '#00FF41', marginTop: '10px', opacity: 0.5 },
  gradeList: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' },
  gradeItem: { background: '#111', padding: '2px 8px', border: '1px solid #333', fontSize: '0.8rem', display: 'flex', gap: '5px' },
  delBtn: { background: 'none', border: 'none', color: '#FF1744', cursor: 'pointer', fontWeight: 'bold', padding: 0 },

  // FOOTER
  logArea: { height: '40px', overflow: 'hidden', padding: '5px 15px', fontSize: '0.7rem', borderTop: '1px solid #222' },
  footer: { display: 'flex', alignItems: 'center', padding: '10px', background: '#000', borderTop: '1px solid #333', flexShrink: 0 },
  prompt: { color: '#00FF41', marginRight: '10px', fontWeight: 'bold' },
  input: { background: 'transparent', border: 'none', color: '#FFF', flex: 1, outline: 'none', fontFamily: 'monospace' },
};
