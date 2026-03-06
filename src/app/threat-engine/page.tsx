'use client';

import { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════

type SubjectID = 'alg' | 'csp' | 'aphu' | 'bio' | 'eng' | 'spa' | 'band';

interface GradeEntry { earned: number; possible: number; }

interface SemesterData {
  q1: GradeEntry[]; // 1st 9 Weeks
  q2: GradeEntry[]; // 2nd 9 Weeks
  q3: GradeEntry[]; // 3rd 9 Weeks (Current)
}

interface ClassData {
  id: SubjectID;
  name: string;
  level: 'L1' | 'L2';
  sem1: SemesterData; // Semester 1 is now "Banked" history
  sem2: SemesterData; // Semester 2 is Current
}

// RANK INFO
const RANK_INFO = { current: 76, total: 736 };

// GPA FORMULA (Linear Scale)
// L1: 100=6.0, 99=5.9... (Grade - 40) / 10
// L2: 100=5.0, 99=4.9... (Grade - 50) / 10
function calculateGPAValue(grade: number, level: 'L1' | 'L2'): number {
  if (level === 'L1') return (grade - 40) / 10;
  return (grade - 50) / 10;
}

const SUBJECT_MAP: { [key: string]: { name: string; id: SubjectID; level: 'L1' | 'L2' } } = {
  'm': { name: 'Algebra II', id: 'alg', level: 'L1' },
  'cs': { name: 'AP CSP', id: 'csp', level: 'L1' },
  'h': { name: 'AP Human', id: 'aphu', level: 'L1' },
  'b': { name: 'Biology', id: 'bio', level: 'L1' },
  'e': { name: 'English 1', id: 'eng', level: 'L1' },
  's': { name: 'Spanish 2', id: 'spa', level: 'L1' },
  'vb': { name: 'Varsity Band', id: 'band', level: 'L2' },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAvg(arr: GradeEntry[]): number {
  if (arr.length === 0) return -1; // -1 indicates no data
  const sum = arr.reduce((a, b) => a + b.earned, 0);
  const poss = arr.reduce((a, b) => a + b.possible, 0);
  return poss === 0 ? -1 : (sum / poss) * 100;
}

// Calculate Semester Average (Q1 50% + Q2 50% or single Q if only one)
function getSemesterAvg(sem: SemesterData): number {
  const q1 = getAvg(sem.q1);
  const q2 = getAvg(sem.q2);
  const q3 = getAvg(sem.q3); // For current semester calc

  // For Sem 1 (Q1+Q2)
  if (q1 !== -1 && q2 !== -1) return (q1 + q2) / 2;
  if (q1 !== -1) return q1;
  if (q2 !== -1) return q2;
  
  // For Sem 2 (Q3 currently)
  if (q3 !== -1) return q3;
  return -1;
}

function calculateCumulativeGPA(classes: ClassData[]): number {
  // 1. Geometry Foundation (1.0 Credit @ 5.5)
  let totalPoints = 5.5;
  let totalCredits = 1.0;

  classes.forEach(cls => {
    // Sem 1 Credit?
    const s1Avg = getSemesterAvg(cls.sem1);
    if (s1Avg !== -1) {
      totalPoints += calculateGPAValue(s1Avg, cls.level);
      totalCredits += 1.0;
    }

    // Sem 2 Credit? (Currently in progress, we count it as 0.5 or 1.0 projected?)
    // Let's count projected for "Current Pace" calculation
    const s2Avg = getSemesterAvg(cls.sem2);
    if (s2Avg !== -1) {
       // Only count current progress
       totalPoints += calculateGPAValue(s2Avg, cls.level);
       totalCredits += 1.0; // Projecting full credit for simplicity or adjust to 0.5?
       // User said Rank updates Semesters. Let's count completed credits + current projection.
    }
  });

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ThreatEngine() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<{type: string, msg: string}[]>([]);
  const [expanded, setExpanded] = useState<SubjectID | null>(null);
  
  // UI States
  const [importMode, setImportMode] = useState(false);
  const [importData, setImportData] = useState({ subject: 'm', period: 'q3', grades: '' });
  const [syncMode, setSyncMode] = useState(false);
  const [syncCode, setSyncCode] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // INIT
  useEffect(() => {
    const stored = localStorage.getItem('virtue_os_v6');
    if (stored) setClasses(JSON.parse(stored));
    else {
      const defaults: ClassData[] = Object.values(SUBJECT_MAP).map(s => ({
        id: s.id, name: s.name, level: s.level, 
        sem1: { q1: [], q2: [], q3: [] }, // Q3 unused in Sem1
        sem2: { q1: [], q2: [], q3: [] }  // Q3 is current
      }));
      setClasses(defaults);
    }
    addLog('info', 'SYSTEM ONLINE. TYPE "import" or "sync".');
  }, []);

  // SAVE
  useEffect(() => {
    if (classes.length > 0) localStorage.setItem('virtue_os_v6', JSON.stringify(classes));
  }, [classes]);

  // FOCUS
  useEffect(() => {
    const handleKey = () => { if(!importMode && !syncMode) inputRef.current?.focus(); };
    window.addEventListener('keypress', handleKey);
    return () => window.removeEventListener('keypress', handleKey);
  }, [importMode, syncMode]);

  const addLog = (type: string, msg: string) => setLogs(prev => [...prev.slice(-4), { type, msg }]);

  // CLI HANDLER
  const handleCmd = (raw: string) => {
    const c = raw.trim().toLowerCase();
    
    if (c === 'import') { setImportMode(true); return; }
    if (c === 'sync') { 
      generateSyncCode();
      setSyncMode(true); 
      return; 
    }
    if (c === 'clear') { setLogs([]); return; }
    
    // Quick Add Logic (+m q3 100 90)
    if (c.startsWith('+')) {
      const parts = raw.split(' '); // Keep case for numbers
      const key = parts[0].substring(1);
      const period = parts[1]; // q1, q2, q3
      const grades = parts.slice(2).map(g => parseInt(g)).filter(g => !isNaN(g));
      
      const target = SUBJECT_MAP[key.toLowerCase()];
      if (!target || !period || grades.length === 0) {
        addLog('err', 'SYNTAX: +[sub] [q1/q2/q3] [grades]');
        return;
      }
      
      injectGrades(target.id, period, grades);
    }
  };

  const injectGrades = (id: SubjectID, period: string, grades: number[]) => {
    setClasses(prev => {
      const n = [...prev];
      const cls = n.find(c => c.id === id);
      if(!cls) return n;

      const entries = grades.map(g => ({ earned: g, possible: 100 }));
      
      // Determine target array
      // If period is q1 or q2, it goes to sem1. q3 goes to sem2.
      // Actually, for simplicity, user specifies period.
      // q1/q2 -> sem1. q3 -> sem2.
      let targetArr;
      if (period === 'q1') targetArr = cls.sem1.q1;
      else if (period === 'q2') targetArr = cls.sem1.q2;
      else targetArr = cls.sem2.q3;

      targetArr.push(...entries);
      addLog('ok', `LOGGED: ${cls.name} [${period}] +${entries.length}`);
      return n;
    });
  };

  // SYNC LOGIC
  const generateSyncCode = () => {
    const data = JSON.stringify(classes);
    // Simple Base64 encoding for copy-paste
    const code = btoa(data);
    setSyncCode(code);
  };

  const applySyncCode = () => {
    try {
      const data = JSON.parse(atob(syncCode));
      setClasses(data);
      addLog('ok', 'DATA SYNCED FROM CODE');
      setSyncMode(false);
    } catch (e) {
      addLog('err', 'INVALID SYNC CODE');
    }
  };

  // CALCULATIONS
  const gpa = calculateCumulativeGPA(classes);
  
  // Sort: Lowest GPA first
  const sortedClasses = [...classes].sort((a, b) => {
    const aAvg = getSemesterAvg(a.sem2) !== -1 ? getSemesterAvg(a.sem2) : getSemesterAvg(a.sem1);
    const bAvg = getSemesterAvg(b.sem2) !== -1 ? getSemesterAvg(b.sem2) : getSemesterAvg(b.sem1);
    return aAvg - bAvg;
  });

  return (
    <main style={styles.main}>
      {/* MODALS */}
      {importMode && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>DATA INJECTOR</div>
            <div style={styles.modalBody}>
              <div style={styles.row}>
                <select value={importData.subject} onChange={e => setImportData({...importData, subject: e.target.value})} style={styles.select}>
                  {Object.entries(SUBJECT_MAP).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
                <select value={importData.period} onChange={e => setImportData({...importData, period: e.target.value})} style={styles.select}>
                  <option value="q1">Q1 (Sem1)</option>
                  <option value="q2">Q2 (Sem1)</option>
                  <option value="q3">Q3 (Current)</option>
                </select>
              </div>
              <textarea placeholder="Paste grades..." value={importData.grades} onChange={e => setImportData({...importData, grades: e.target.value})} style={styles.textarea} />
              <div style={styles.modalActions}>
                <button onClick={() => setImportMode(false)} style={styles.cancelBtn}>CANCEL</button>
                <button onClick={() => { injectGrades(importData.subject as SubjectID, importData.period, importData.grades.split(/[\s,]+/).map(Number).filter(n => !isNaN(n))); setImportMode(false); }} style={styles.injectBtn}>INJECT</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {syncMode && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>CROSS-DEVICE SYNC</div>
            <div style={styles.modalBody}>
              <div style={styles.hint}>EXPORT: Copy this code on Device A. Paste on Device B.</div>
              <textarea value={syncCode} onChange={e => setSyncCode(e.target.value)} style={styles.textarea} />
              <div style={styles.modalActions}>
                <button onClick={() => setSyncMode(false)} style={styles.cancelBtn}>CLOSE</button>
                <button onClick={applySyncCode} style={styles.injectBtn}>IMPORT CODE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER HUD */}
      <header style={styles.hud}>
        <div style={styles.rowTop}>
          <div style={styles.col}>
            <span style={styles.label}>CLASS RANK</span>
            <span style={{ ...styles.val, color: '#00F0FF' }}>
              {RANK_INFO.current} <span style={{fontSize: '0.8rem', color: '#666'}}>/ {RANK_INFO.total}</span>
            </span>
          </div>
          <div style={styles.col}>
            <span style={styles.label}>PROJECTED GPA</span>
            <span style={{ ...styles.val, color: gpa >= 5.75 ? '#00FF41' : '#FFB000', fontSize: '1.8rem' }}>
              {gpa.toFixed(3)}
            </span>
          </div>
        </div>
        <div style={styles.hudBot}>
          <div style={styles.bank}>
            <span style={styles.bankLabel}>FOUNDATION</span>
            <span style={styles.bankVal}>GEO: 5.5</span>
          </div>
          <div style={styles.statusLight}>
            Q3 IN PROGRESS
          </div>
        </div>
      </header>

      {/* LIST */}
      <div style={styles.list}>
        {sortedClasses.map(cls => {
          const s1Avg = getSemesterAvg(cls.sem1);
          const s2Avg = getSemesterAvg(cls.sem2);
          const isExpanded = expanded === cls.id;

          return (
            <div key={cls.id} onClick={() => setExpanded(isExpanded ? null : cls.id)} style={styles.cardWrapper}>
              <div style={styles.card}>
                <div style={{ flex: 1 }}>
                  <span style={{ ...styles.badge, borderColor: cls.level === 'L1' ? '#FFF' : '#888', color: cls.level === 'L1' ? '#FFF' : '#888' }}>{cls.level}</span>
                  <span style={styles.name}>{cls.name}</span>
                </div>
                <div style={styles.data}>
                  <div style={styles.semBlock}>
                    <span style={styles.semLabel}>SEM 1</span>
                    <span style={styles.semVal}>{s1Avg !== -1 ? s1Avg.toFixed(1) : '--'}</span>
                  </div>
                  <div style={styles.semBlock}>
                    <span style={styles.semLabel}>CURR</span>
                    <span style={{ ...styles.semVal, color: s2Avg >= 90 ? '#00FF41' : '#FFB000' }}>{s2Avg !== -1 ? s2Avg.toFixed(1) : '--'}</span>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div style={styles.exp}>
                  <div style={styles.expSec}>SEM 1 - Q1 [{cls.sem1.q1.length}]</div>
                  <div style={styles.gList}>{cls.sem1.q1.map((g,i) => <div key={i} style={styles.gItem}>{g.earned}</div>)}</div>
                  <div style={styles.expSec}>SEM 1 - Q2 [{cls.sem1.q2.length}]</div>
                  <div style={styles.gList}>{cls.sem1.q2.map((g,i) => <div key={i} style={styles.gItem}>{g.earned}</div>)}</div>
                  <div style={styles.expSec}>CURRENT - Q3 [{cls.sem2.q3.length}]</div>
                  <div style={styles.gList}>{cls.sem2.q3.map((g,i) => <div key={i} style={styles.gItem}>{g.earned}</div>)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LOG */}
      <div style={styles.log}>
        {logs.map((l, i) => <div key={i} style={{ color: l.type === 'err' ? '#FF1744' : l.type === 'ok' ? '#00FF41' : '#666' }}>{`> ${l.msg}`}</div>)}
      </div>

      {/* INPUT */}
      <footer style={styles.footer}>
        <span style={styles.prompt}>{`>`}</span>
        <input ref={inputRef} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { handleCmd(cmd); setCmd(''); }}} style={styles.input} />
      </footer>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: { height: '100vh', background: '#000', color: '#FFF', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '90%', maxWidth: '500px', background: '#111', border: '1px solid #00FF41', padding: '20px' },
  modalHeader: { fontSize: '0.8rem', color: '#00FF41', borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '15px', letterSpacing: '2px' },
  modalBody: { display: 'flex', flexDirection: 'column', gap: '15px' },
  row: { display: 'flex', gap: '10px' },
  select: { flex: 1, background: '#000', border: '1px solid #333', color: '#FFF', padding: '8px', fontFamily: 'monospace' },
  textarea: { width: '100%', height: '80px', background: '#000', border: '1px solid #333', color: '#FFF', padding: '10px', fontFamily: 'monospace', resize: 'none', fontSize: '0.8rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
  cancelBtn: { background: 'transparent', color: '#666', border: '1px solid #333', padding: '5px 15px', cursor: 'pointer' },
  injectBtn: { background: '#00FF41', color: '#000', border: 'none', padding: '5px 15px', fontWeight: 'bold', cursor: 'pointer' },
  hint: { fontSize: '0.7rem', color: '#666' },
  
  hud: { borderBottom: '2px solid #333', padding: '15px', background: '#050505' },
  rowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' },
  col: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.6rem', color: '#666', letterSpacing: '1px' },
  val: { fontSize: '1.2rem', fontWeight: 'bold' },
  hudBot: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '5px', fontSize: '0.7rem' },
  bank: { display: 'flex', gap: '5px', color: '#666' },
  bankLabel: { border: '1px solid #333', padding: '0 3px', fontSize: '0.6rem' },
  bankVal: { color: '#00FF41' },
  statusLight: { color: '#FFB000', letterSpacing: '2px' },

  list: { flex: 1, overflowY: 'auto' },
  cardWrapper: { borderBottom: '1px solid #111' },
  card: { padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  badge: { fontSize: '0.5rem', border: '1px solid', padding: '1px 3px', marginRight: '8px' },
  name: { fontSize: '0.9rem' },
  data: { display: 'flex', alignItems: 'center', gap: '15px' },
  semBlock: { textAlign: 'right' },
  semLabel: { display: 'block', fontSize: '0.5rem', color: '#666' },
  semVal: { fontSize: '1rem', fontWeight: 'bold' },

  exp: { background: '#0A0A0A', padding: '10px 20px 15px', borderBottom: '1px solid #222' },
  expSec: { marginTop: '10px', fontSize: '0.7rem', color: '#555' },
  gList: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' },
  gItem: { background: '#111', border: '1px solid #333', padding: '2px 6px', fontSize: '0.8rem' },

  log: { height: '40px', fontSize: '0.7rem', padding: '5px 15px', overflow: 'hidden', borderTop: '1px solid #222' },
  footer: { display: 'flex', alignItems: 'center', padding: '10px 15px', background: '#000', borderTop: '1px solid #333' },
  prompt: { color: '#00FF41', marginRight: '10px' },
  input: { background: 'transparent', border: 'none', color: '#FFF', flex: 1, outline: 'none', fontFamily: 'monospace', fontSize: '1rem' },
};
