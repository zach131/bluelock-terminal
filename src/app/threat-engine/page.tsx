'use client';

import { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════

type SubjectID = 'alg' | 'csp' | 'aphu' | 'bio' | 'eng' | 'spa' | 'band';

interface GradeEntry { earned: number; possible: number; }

interface ClassData {
  id: SubjectID;
  name: string;
  level: 'L1' | 'L2';
  formative: GradeEntry[];
  summative: GradeEntry[];
}

// KHS Scale (Base 4.0)
const GPA_SCALE = [
  [97, 100, 4.0], [93, 96, 3.8], [90, 92, 3.6], 
  [87, 89, 3.4], [83, 86, 3.2], [80, 82, 3.0],
  [77, 79, 2.8], [73, 76, 2.6], [70, 72, 2.4], 
  [0, 69, 0.0]
];

// SUBJECT CONFIGURATION (Band is L2)
const SUBJECT_MAP: { [key: string]: { name: string; id: SubjectID; level: 'L1' | 'L2' } } = {
  'm': { name: 'Algebra II', id: 'alg', level: 'L1' },
  'cs': { name: 'AP CSP', id: 'csp', level: 'L1' },
  'h': { name: 'AP Human', id: 'aphu', level: 'L1' },
  'b': { name: 'Biology', id: 'bio', level: 'L1' },
  'e': { name: 'English 1', id: 'eng', level: 'L1' },
  's': { name: 'Spanish 2', id: 'spa', level: 'L1' },
  'vb': { name: 'Varsity Band', id: 'band', level: 'L2' }, // L2 ASSET
};

// BANKED ASSETS (Geometry)
const BANKED = { credits: 1.0, gpa: 5.5 };

// INTERCEPT CALCULATION
// Goal: 5.75 Cumulative over 8.0 Credits.
// (Banked + Current) / 8.0 = 5.75
// (5.5 + Current) = 46.0
// Current Required = 40.5
// Per Class (7 classes) = 40.5 / 7 = 5.7857...
const REQUIRED_TOTAL_POINTS = 5.75 * 8.0; // 46.0
const REQUIRED_FRESHMAN_POINTS = REQUIRED_TOTAL_POINTS - (BANKED.gpa * BANKED.credits); // 40.5
const REQUIRED_VELOCITY = REQUIRED_FRESHMAN_POINTS / 7.0; // 5.786

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

function getClassPercent(f: GradeEntry[], s: GradeEntry[]): number {
  const fSum = sumGrades(f);
  const sSum = sumGrades(s);
  
  if (fSum.possible === 0 && sSum.possible === 0) return 100; // Default to perfect

  const fAvg = fSum.possible > 0 ? (fSum.earned / fSum.possible) * 100 : 100;
  const sAvg = sSum.possible > 0 ? (sSum.earned / sSum.possible) * 100 : 100;

  // Weighted: 30% Formative, 70% Summative
  return (fAvg * 0.3) + (sAvg * 0.7);
}

function getBaseGPA(grade: number): number {
  for (const [min, max, pts] of GPA_SCALE) {
    if (grade >= min && grade <= max) return pts;
  }
  return 0;
}

function getClassGPA(cls: ClassData): number {
  const percent = getClassPercent(cls.formative, cls.summative);
  const base = getBaseGPA(percent);
  // L1 = +2.0 (Max 6.0), L2 = +1.0 (Max 5.0)
  const weight = cls.level === 'L1' ? 2.0 : 1.0;
  return base + weight;
}

function calculateCumulativeGPA(classes: ClassData[]): number {
  const bankedPoints = BANKED.gpa * BANKED.credits;
  let currentPoints = 0;
  
  classes.forEach(cls => {
    currentPoints += getClassGPA(cls);
  });

  const totalCredits = BANKED.credits + classes.length;
  return (bankedPoints + currentPoints) / totalCredits;
}

function calcDrain(cls: ClassData): number {
  const currentClassGPA = getClassGPA(cls);
  // Drain = Target Velocity - Current Performance
  // If negative, you are gaining ground. If positive, you are losing ground.
  // Wait, user wants "Drain" as "How much is this hurting me?"
  // If I have a 5.0 in Band, and I need 5.79, the drain is (5.79 - 5.0) = 0.79 deficit?
  // Or better: How much is this pulling down the average?
  // Let's show: REQUIRED - CURRENT.
  const deficit = REQUIRED_VELOCITY - currentClassGPA;
  return deficit > 0 ? deficit : 0;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ThreatEngine() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<{type: string, msg: string}[]>([]);
  const [expanded, setExpanded] = useState<SubjectID | null>(null);
  const [simGpa, setSimGpa] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // INIT
  useEffect(() => {
    const stored = localStorage.getItem('virtue_os_v5');
    if (stored) setClasses(JSON.parse(stored));
    else {
      const defaults: ClassData[] = Object.values(SUBJECT_MAP).map(s => ({
        id: s.id, name: s.name, level: s.level, formative: [], summative: []
      }));
      setClasses(defaults);
    }
    addLog('info', 'VIRTUE.OS [5.1] ONLINE.');
    addLog('info', `TARGET_VELOCITY: ${REQUIRED_VELOCITY.toFixed(3)}`);
  }, []);

  // SAVE
  useEffect(() => {
    if (classes.length > 0) localStorage.setItem('virtue_os_v5', JSON.stringify(classes));
  }, [classes]);

  // FOCUS
  useEffect(() => {
    const handleKey = () => inputRef.current?.focus();
    window.addEventListener('keypress', handleKey);
    return () => window.removeEventListener('keypress', handleKey);
  }, []);

  const addLog = (type: string, msg: string) => setLogs(prev => [...prev.slice(-4), { type, msg }]);

  // HANDLER
  const handleCmd = (raw: string) => {
    setSimGpa(null);
    const chain = raw.split(';').map(c => c.trim());
    let tempData = [...classes];
    let simMode = false;

    chain.forEach(c => {
      if (!c) return;
      if (c.startsWith('?')) {
        simMode = true;
        processCmd(c.substring(1), tempData, true);
      } else {
        processCmd(c, tempData, false);
      }
    });

    if (!simMode) setClasses(tempData);
  };

  const processCmd = (input: string, data: ClassData[], sim: boolean) => {
    // PURGE
    if (input.startsWith('purge')) {
      const key = input.split(' ')[1];
      const target = SUBJECT_MAP[key];
      if (target) {
        const idx = data.findIndex(c => c.id === target.id);
        data[idx].formative = [];
        data[idx].summative = [];
        addLog('warn', `PURGED: ${target.name}`);
      } else addLog('err', 'ERR: UNKNOWN TARGET');
      return;
    }

    // ADD
    if (input.startsWith('+')) {
      const parts = input.split(' ');
      const key = parts[0].substring(1);
      const type = parts[1]; // q or t
      const grades = parts.slice(2).map(g => parseInt(g)).filter(g => !isNaN(g));

      const target = SUBJECT_MAP[key];
      if (!target || !type || grades.length === 0) {
        addLog('err', 'ERR: SYNTAX');
        return;
      }

      const idx = data.findIndex(c => c.id === target.id);
      const arrKey = type === 't' ? 'summative' : 'formative';
      
      // Map to { earned, possible }
      const entries = grades.map(g => ({ earned: g, possible: 100 }));
      data[idx][arrKey].push(...entries);

      if (sim) {
        const gpa = calculateCumulativeGPA(data);
        setSimGpa(gpa);
        addLog('sim', `SIM: GPA ${gpa.toFixed(3)}`);
      } else {
        addLog('ok', `LOGGED: ${target.name} [${entries.length}]`);
        if (grades.some(g => g < 70)) addLog('breach', 'SYSTEM BREACH: LOW SCORE');
      }
    }
    else if (input === 'status') {
      const anchors = data.filter(c => getClassGPA(c) < REQUIRED_VELOCITY).length;
      addLog('info', `ANCHORS DETECTED: ${anchors}`);
    }
    else if (input === 'reset') {
      if (confirm('WIPE DATABASE?')) {
        localStorage.removeItem('virtue_os_v5');
        window.location.reload();
      }
    }
    else if (input === 'exit') window.location.href = '/';
  };

  // DELETE
  const deleteGrade = (id: SubjectID, type: 'formative' | 'summative', idx: number) => {
    setClasses(prev => {
      const n = [...prev];
      n.find(c => c.id === id)![type].splice(idx, 1);
      return n;
    });
  };

  // CALCULATIONS
  const gpa = calculateCumulativeGPA(classes);
  const debt = REQUIRED_TOTAL_POINTS - (BANKED.gpa * BANKED.credits + classes.reduce((s, c) => s + getClassGPA(c), 0));
  
  // SORT: Lowest GPA First (Anchors at top)
  const sortedClasses = [...classes].sort((a, b) => getClassGPA(a) - getClassGPA(b));

  return (
    <main style={styles.main}>
      {/* HEADER HUD */}
      <header style={styles.hud}>
        <div style={styles.rowTop}>
          <div style={styles.col}>
            <span style={styles.label}>CUMULATIVE GPA</span>
            <span style={{ ...styles.val, color: (simGpa || gpa) >= 5.75 ? '#00FF41' : '#FFB000', fontSize: '1.8rem' }}>
              {(simGpa || gpa).toFixed(3)}
            </span>
          </div>
          <div style={styles.col}>
            <span style={styles.label}>REQUIRED VELOCITY</span>
            <span style={{ ...styles.val, color: '#FFF' }}>{REQUIRED_VELOCITY.toFixed(3)}</span>
          </div>
        </div>
        <div style={styles.hudBot}>
          <div style={styles.bank}>
            <span style={styles.bankLabel}>BANK</span>
            <span style={styles.bankVal}>GEO: 5.5</span>
          </div>
          <div style={styles.debt}>
            <span>DEBT: </span>
            <span style={{ color: debt > 0 ? '#FFB000' : '#00FF41' }}>
              {debt.toFixed(2)} PTS
            </span>
          </div>
        </div>
      </header>

      {/* LIST */}
      <div style={styles.list}>
        {sortedClasses.map(cls => {
          const cGpa = getClassGPA(cls);
          const percent = getClassPercent(cls.formative, cls.summative);
          const drain = calcDrain(cls);
          const isAnchor = cGpa < REQUIRED_VELOCITY;
          const isExpanded = expanded === cls.id;

          return (
            <div key={cls.id} onClick={() => setExpanded(isExpanded ? null : cls.id)} style={styles.cardWrapper}>
              <div style={styles.card}>
                <div style={{ flex: 1 }}>
                  <span style={{ ...styles.badge, borderColor: cls.level === 'L1' ? '#FFF' : '#888', color: cls.level === 'L1' ? '#FFF' : '#888' }}>
                    {cls.level}
                  </span>
                  <span style={{ ...styles.name, color: isAnchor ? '#FFB000' : '#FFF' }}>{cls.name}</span>
                </div>
                <div style={styles.data}>
                  <span style={styles.grade}>{percent.toFixed(1)}%</span>
                  <div style={styles.drainBox}>
                    <span style={styles.drainLabel}>GPA</span>
                    <span style={{ ...styles.drainVal, color: cGpa >= REQUIRED_VELOCITY ? '#00FF41' : '#FF1744' }}>
                      {cGpa.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {/* EXPAND */}
              {isExpanded && (
                <div style={styles.exp}>
                  <div style={styles.expSec}>
                    FORM [{cls.formative.length}]
                    <div style={styles.gList}>
                      {cls.formative.map((g, i) => (
                        <div key={i} style={styles.gItem}>
                          {g.earned}/{g.possible}
                          <button onClick={(e) => { e.stopPropagation(); deleteGrade(cls.id, 'formative', i); }} style={styles.xBtn}>X</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={styles.expSec}>
                    SUMM [{cls.summative.length}]
                    <div style={styles.gList}>
                      {cls.summative.map((g, i) => (
                        <div key={i} style={styles.gItem}>
                          {g.earned}/{g.possible}
                          <button onClick={(e) => { e.stopPropagation(); deleteGrade(cls.id, 'summative', i); }} style={styles.xBtn}>X</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LOG */}
      <div style={styles.log}>
        {logs.map((l, i) => (
          <div key={i} style={{ color: l.type === 'breach' ? '#FF1744' : l.type === 'sim' ? '#00FF41' : l.type === 'err' ? '#FFF' : '#666' }}>
            {`> ${l.msg}`}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <footer style={styles.footer}>
        <span style={styles.prompt}>{`>`}</span>
        <input
          ref={inputRef}
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { handleCmd(cmd); setCmd(''); }}}
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
  main: { height: '100vh', background: '#000', color: '#FFF', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  
  // HUD
  hud: { borderBottom: '2px solid #333', padding: '15px', background: '#0a0a0a' },
  rowTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  col: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.6rem', color: '#666', letterSpacing: '1px', marginBottom: '2px' },
  val: { fontSize: '1.2rem', fontWeight: 'bold' },
  
  hudBot: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '5px', fontSize: '0.7rem' },
  bank: { display: 'flex', gap: '5px', color: '#666' },
  bankLabel: { border: '1px solid #333', padding: '0 3px', fontSize: '0.6rem' },
  bankVal: { color: '#00FF41' },
  debt: { color: '#666' },

  // LIST
  list: { flex: 1, overflowY: 'auto' },
  
  cardWrapper: { borderBottom: '1px solid #111' },
  card: { padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  badge: { fontSize: '0.5rem', border: '1px solid', padding: '1px 3px', marginRight: '8px' },
  name: { fontSize: '0.9rem' },
  data: { display: 'flex', alignItems: 'center', gap: '15px' },
  grade: { fontSize: '0.9rem', opacity: 0.7 },
  drainBox: { textAlign: 'right' },
  drainLabel: { display: 'block', fontSize: '0.5rem', color: '#666' },
  drainVal: { fontWeight: 'bold' },

  // EXPAND
  exp: { background: '#050505', padding: '10px 20px 15px', borderBottom: '1px solid #222' },
  expSec: { marginTop: '10px', fontSize: '0.7rem', color: '#555' },
  gList: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' },
  gItem: { background: '#111', border: '1px solid #333', padding: '2px 6px', fontSize: '0.8rem', display: 'flex', gap: '4px' },
  xBtn: { background: 'none', border: 'none', color: '#FF1744', cursor: 'pointer', fontSize: '0.7rem', padding: 0 },

  // FOOTER
  log: { height: '40px', fontSize: '0.7rem', padding: '5px 15px', overflow: 'hidden', borderTop: '1px solid #222' },
  footer: { display: 'flex', alignItems: 'center', padding: '10px 15px', background: '#000', borderTop: '1px solid #333' },
  prompt: { color: '#00FF41', marginRight: '10px' },
  input: { background: 'transparent', border: 'none', color: '#FFF', flex: 1, outline: 'none', fontFamily: 'monospace', fontSize: '1rem' },
};
