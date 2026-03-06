'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ... (Keep Types) ...
type SubjectID = 'alg' | 'csp' | 'aphu' | 'bio' | 'eng' | 'spa' | 'band';
interface GradeEntry { earned: number; possible: number; }
interface SemesterData { q1: GradeEntry[]; q2: GradeEntry[]; q3: GradeEntry[]; }
interface ClassData { id: SubjectID; name: string; level: 'L1' | 'L2'; sem1: SemesterData; sem2: SemesterData; }
interface ThreatData { classes: ClassData[]; rank: { current: number; total: number }; }

const SYNC_KEY = 'bluelock_threat_engine';

// ... (Keep Constants & Helpers) ...
const SUBJECT_MAP: { [key: string]: { name: string; id: SubjectID; level: 'L1' | 'L2' } } = {
  'm': { name: 'Algebra II', id: 'alg', level: 'L1' },
  'cs': { name: 'AP CSP', id: 'csp', level: 'L1' },
  'h': { name: 'AP Human', id: 'aphu', level: 'L1' },
  'b': { name: 'Biology', id: 'bio', level: 'L1' },
  'e': { name: 'English 1', id: 'eng', level: 'L1' },
  's': { name: 'Spanish 2', id: 'spa', level: 'L1' },
  'vb': { name: 'Varsity Band', id: 'band', level: 'L2' },
};

function calculateGPAValue(grade: number, level: 'L1' | 'L2'): number {
  return level === 'L1' ? (grade - 40) / 10 : (grade - 50) / 10;
}

function getAvg(arr: GradeEntry[]): number {
  if (arr.length === 0) return -1;
  const sum = arr.reduce((a, b) => a + b.earned, 0);
  const poss = arr.reduce((a, b) => a + b.possible, 0);
  return poss === 0 ? -1 : (sum / poss) * 100;
}

function getSemesterAvg(sem: SemesterData): number {
  const q1 = getAvg(sem.q1), q2 = getAvg(sem.q2), q3 = getAvg(sem.q3);
  if (q1 !== -1 && q2 !== -1) return (q1 + q2) / 2;
  if (q1 !== -1) return q1;
  if (q2 !== -1) return q2;
  if (q3 !== -1) return q3;
  return -1;
}

function calculateCumulativeGPA(classes: ClassData[]): number {
  let totalPoints = 5.5, totalCredits = 1.0;
  classes.forEach(cls => {
    const s1 = getSemesterAvg(cls.sem1);
    if (s1 !== -1) { totalPoints += calculateGPAValue(s1, cls.level); totalCredits += 1.0; }
    const s2 = getSemesterAvg(cls.sem2);
    if (s2 !== -1) { totalPoints += calculateGPAValue(s2, cls.level); totalCredits += 1.0; }
  });
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

function createDefaultClasses(): ClassData[] {
  return Object.values(SUBJECT_MAP).map(s => ({ id: s.id, name: s.name, level: s.level, sem1: { q1: [], q2: [], q3: [] }, sem2: { q1: [], q2: [], q3: [] } }));
}

export default function ThreatEngine() {
  const [data, setData] = useState<ThreatData>({ classes: [], rank: { current: 76, total: 736 } });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<{type: string, msg: string}[]>([]);
  const [expanded, setExpanded] = useState<SubjectID | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [importData, setImportData] = useState({ subject: 'm', period: 'q1', grades: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((type: string, msg: string) => setLogs(prev => [...prev.slice(-4), { type, msg }]), []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/sync?key=${SYNC_KEY}`);
        const json = await res.json();
        if (json.success && json.data) { setData(json.data); setSaveStatus('saved'); addLog('ok', 'CLOUD LOADED'); }
        else { setData(prev => ({ ...prev, classes: createDefaultClasses() })); addLog('info', 'INIT DEFAULTS'); }
      } catch (e) { addLog('err', 'LOAD FAILED'); setData(prev => ({ ...prev, classes: createDefaultClasses() })); }
      setLoading(false);
    }
    loadData();
  }, [addLog]);

  const saveToCloud = useCallback(async () => {
    setSaveStatus('saving');
    addLog('info', 'SAVING...');
    try { 
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: SYNC_KEY, payload: data }) });
      const json = await res.json();
      if(json.success) {
        setSaveStatus('saved');
        addLog('ok', 'CLOUD SYNCED');
      } else {
        throw new Error('API Error');
      }
    } catch (e) { 
      addLog('err', 'SAVE FAILED'); 
      setSaveStatus('error');
    }
  }, [data, addLog]);

  useEffect(() => {
    const handleKey = () => { if(!importMode) inputRef.current?.focus(); };
    window.addEventListener('keypress', handleKey);
    return () => window.removeEventListener('keypress', handleKey);
  }, [importMode]);

  const handleCmd = (raw: string) => {
    const c = raw.trim().toLowerCase();
    if (c === 'import') { setImportMode(true); return; }
    if (c === 'save') { saveToCloud(); return; } // Allow manual save via command too
    if (c === 'clear') { setLogs([]); return; }
    if (c.startsWith('+')) {
      const parts = raw.split(' ');
      const key = parts[0].substring(1);
      const period = parts[1];
      const grades = parts.slice(2).map(g => parseInt(g)).filter(g => !isNaN(g));
      const target = SUBJECT_MAP[key.toLowerCase()];
      if (!target || !period || grades.length === 0) { addLog('err', 'SYNTAX'); return; }
      injectGrades(target.id, period, grades);
    }
  };

  const injectGrades = (id: SubjectID, period: string, grades: number[]) => {
    setData(prev => {
      const newClasses = prev.classes.map(cls => {
        if (cls.id !== id) return cls;
        const entries = grades.map(g => ({ earned: g, possible: 100 }));
        let newSem1 = { ...cls.sem1 }, newSem2 = { ...cls.sem2 };
        if (period === 'q1') newSem1 = { ...newSem1, q1: [...newSem1.q1, ...entries] };
        else if (period === 'q2') newSem1 = { ...newSem1, q2: [...newSem1.q2, ...entries] };
        else if (period === 'q3') newSem2 = { ...newSem2, q3: [...newSem2.q3, ...entries] };
        return { ...cls, sem1: newSem1, sem2: newSem2 };
      });
      addLog('ok', `LOGGED: ${SUBJECT_MAP[id]?.name || id} [${period}]`);
      setSaveStatus('idle'); // Mark as dirty
      return { ...prev, classes: newClasses };
    });
  };

  const gpa = calculateCumulativeGPA(data.classes);
  const sortedClasses = [...data.classes].sort((a, b) => {
    const aAvg = getSemesterAvg(a.sem2) !== -1 ? getSemesterAvg(a.sem2) : getSemesterAvg(a.sem1);
    const bAvg = getSemesterAvg(b.sem2) !== -1 ? getSemesterAvg(b.sem2) : getSemesterAvg(b.sem1);
    return aAvg - bAvg;
  });

  if (loading) return <div style={s.main}>CONNECTING...</div>;

  return (
    <main style={s.main}>
      {/* ... (Keep Import Modal JSX) ... */}
      {importMode && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>DATA INJECTOR</div>
            <div style={s.modalBody}>
              <div style={s.row}>
                <select value={importData.subject} onChange={e => setImportData({...importData, subject: e.target.value})} style={s.select}>
                  {Object.entries(SUBJECT_MAP).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
                <select value={importData.period} onChange={e => setImportData({...importData, period: e.target.value})} style={s.select}>
                  <option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option>
                </select>
              </div>
              <textarea placeholder="Grades..." value={importData.grades} onChange={e => setImportData({...importData, grades: e.target.value})} style={s.textarea} />
              <div style={s.modalActions}>
                <button onClick={() => setImportMode(false)} style={s.cancelBtn}>CANCEL</button>
                <button onClick={() => { injectGrades(importData.subject as SubjectID, importData.period, importData.grades.split(/[\s,]+/).map(Number).filter(n => !isNaN(n))); setImportMode(false); }} style={s.injectBtn}>INJECT</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header style={s.hud}>
        <div style={s.rowTop}>
          <div style={s.col}><span style={s.label}>RANK</span><span style={{...s.val, color:'#00F0FF'}}>{data.rank.current}/{data.rank.total}</span></div>
          <div style={s.col}><span style={s.label}>GPA</span><span style={{...s.val, color: gpa>=5.75?'#00FF41':'#FFB000'}}>{gpa.toFixed(3)}</span></div>
          {/* NEW: Save Button in HUD */}
          <button onClick={saveToCloud} style={{
            padding: '0.5rem 1rem', 
            background: saveStatus === 'saving' ? '#333' : saveStatus === 'saved' ? '#003300' : 'transparent', 
            border: `1px solid ${saveStatus === 'saved' ? '#00FF41' : '#FF1744'}`,
            color: saveStatus === 'saved' ? '#00FF41' : '#FFF',
            fontSize: '0.7rem',
            cursor: 'pointer'
          }}>
            {saveStatus === 'saving' ? 'SYNCING...' : saveStatus === 'saved' ? 'SAVED ✓' : 'SAVE'}
          </button>
        </div>
        <div style={s.hudBot}><span style={{color:'#666'}}>GEO: 5.5</span><span style={{color:'#FFB000'}}>Q3</span></div>
      </header>

      {/* ... (Keep Class List, Log, Footer JSX) ... */}
      <div style={s.list}>
        {sortedClasses.map(cls => {
          const s1 = getSemesterAvg(cls.sem1), s2 = getSemesterAvg(cls.sem2);
          return (
            <div key={cls.id} onClick={() => setExpanded(expanded === cls.id ? null : cls.id)} style={s.cardWrapper}>
              <div style={s.card}>
                <div><span style={{...s.badge, borderColor: cls.level==='L1'?'#FFF':'#888', color: cls.level==='L1'?'#FFF':'#888'}}>{cls.level}</span> {cls.name}</div>
                <div style={s.data}>
                  <div><span style={s.semLabel}>S1</span><span style={s.semVal}>{s1!==-1?s1.toFixed(1):'--'}</span></div>
                  <div><span style={s.semLabel}>CUR</span><span style={{...s.semVal, color: s2>=90?'#00FF41':s2>=0?'#FFB000':'#666'}}>{s2!==-1?s2.toFixed(1):'--'}</span></div>
                </div>
              </div>
              {expanded === cls.id && (
                <div style={s.exp}>
                  <div style={s.expSec}>Q1 [{cls.sem1.q1.length}]</div>
                  <div style={s.gList}>{cls.sem1.q1.map((g,i) => <span key={i} style={s.gItem}>{g.earned}</span>)}</div>
                  <div style={s.expSec}>Q2 [{cls.sem1.q2.length}]</div>
                  <div style={s.gList}>{cls.sem1.q2.map((g,i) => <span key={i} style={s.gItem}>{g.earned}</span>)}</div>
                  <div style={s.expSec}>Q3 [{cls.sem2.q3.length}]</div>
                  <div style={s.gList}>{cls.sem2.q3.map((g,i) => <span key={i} style={s.gItem}>{g.earned}</span>)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={s.log}>{logs.map((l,i) => <div key={i} style={{color: l.type==='err'?'#FF1744':l.type==='ok'?'#00FF41':'#666'}}>&gt; {l.msg}</div>)}</div>
      <footer style={s.footer}>
        <span style={{color:'#FF1744'}}>&gt;</span>
        <input ref={inputRef} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { handleCmd(cmd); setCmd(''); }}} placeholder="type 'import', 'save' or '+m q1 95 92'..." style={s.input} />
      </footer>
    </main>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  // ... (Keep existing styles) ...
  main: { flex: 1, background: '#0A0A0A', color: '#FFF', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '90%', maxWidth: '500px', background: '#111', border: '1px solid #FF1744', padding: '20px' },
  modalHeader: { fontSize: '0.8rem', color: '#FF1744', borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '15px', letterSpacing: '2px' },
  modalBody: { display: 'flex', flexDirection: 'column', gap: '15px' },
  row: { display: 'flex', gap: '10px' },
  select: { flex: 1, background: '#000', border: '1px solid #333', color: '#FFF', padding: '8px' },
  textarea: { width: '100%', height: '80px', background: '#000', border: '1px solid #333', color: '#FFF', padding: '10px', resize: 'none' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
  cancelBtn: { background: 'transparent', color: '#666', border: '1px solid #333', padding: '8px 15px', cursor: 'pointer' },
  injectBtn: { background: '#FF1744', color: '#FFF', border: 'none', padding: '8px 15px', fontWeight: 'bold', cursor: 'pointer' },
  hud: { borderBottom: '2px solid #333', padding: '15px', background: '#050505' },
  rowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' },
  col: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.6rem', color: '#666', letterSpacing: '1px' },
  val: { fontSize: '1.2rem', fontWeight: 'bold' },
  hudBot: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '8px', fontSize: '0.7rem' },
  list: { flex: 1, overflowY: 'auto' },
  cardWrapper: { borderBottom: '1px solid #111', cursor: 'pointer' },
  card: { padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: '0.5rem', border: '1px solid', padding: '1px 4px', marginRight: '8px' },
  data: { display: 'flex', gap: '15px' },
  semLabel: { display: 'block', fontSize: '0.5rem', color: '#666' },
  semVal: { fontSize: '1rem', fontWeight: 'bold' },
  exp: { background: '#0A0A0A', padding: '10px 20px 15px', borderBottom: '1px solid #222' },
  expSec: { marginTop: '10px', fontSize: '0.7rem', color: '#555' },
  gList: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' },
  gItem: { background: '#111', border: '1px solid #333', padding: '2px 8px', fontSize: '0.8rem' },
  log: { height: '40px', fontSize: '0.7rem', padding: '5px 15px', overflow: 'hidden', borderTop: '1px solid #222' },
  footer: { display: 'flex', alignItems: 'center', padding: '10px 15px', background: '#000', borderTop: '1px solid #333' },
  input: { background: 'transparent', border: 'none', color: '#FFF', flex: 1, outline: 'none', fontSize: '0.9rem' },
};
