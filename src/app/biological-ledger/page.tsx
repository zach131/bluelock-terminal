'use client';

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// BIOLOGICAL LEDGER - Physical Evolution Tracker
// Iron/Plyometrics with Cloud Sync
// ═══════════════════════════════════════════════════════════════

interface Set { weight: number; reps: number; id: string; }
interface Exercise { name: string; sets: Set[]; isPR?: boolean; }
interface WorkoutSession { id: string; date: string; type: 'push' | 'pull' | 'legs' | 'cardio' | 'plyo' | 'other'; exercises: Exercise[]; totalVolume: number; }
interface PlyometricLog { date: string; verticalJump: number; broadJump?: number; }
interface FitnessData { workouts: WorkoutSession[]; plyometrics: PlyometricLog[]; personalRecords: Record<string, number>; streak: number; lastWorkoutDate: string | null; totalWorkouts: number; }

type ViewMode = 'log' | 'history' | 'plyo' | 'prs';

const SYNC_KEY = 'bluelock_biological_ledger';
const generateId = () => Math.random().toString(36).substring(2, 9);
const getToday = () => new Date().toISOString().split('T')[0];

function calculateStreak(workouts: WorkoutSession[]): number {
  if (workouts.length === 0) return 0;
  const sortedDates = [...new Set(workouts.map(w => w.date))].sort().reverse();
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  for (const dateStr of sortedDates) {
    const workoutDate = new Date(dateStr);
    workoutDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === streak || (streak === 0 && diffDays <= 1)) { streak++; currentDate = workoutDate; } else { break; }
  }
  return streak;
}

function getWeeklyWorkouts(workouts: WorkoutSession[]): number {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return workouts.filter(w => new Date(w.date) >= oneWeekAgo).length;
}

export default function BiologicalLedger() {
  const [data, setData] = useState<FitnessData>({ workouts: [], plyometrics: [], personalRecords: {}, streak: 0, lastWorkoutDate: null, totalWorkouts: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewMode>('log');
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutSession | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState<Set[]>([]);
  const [workoutType, setWorkoutType] = useState<WorkoutSession['type']>('push');
  const [verticalJump, setVerticalJump] = useState('');
  const [broadJump, setBroadJump] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/sync?key=${SYNC_KEY}`);
        const json = await res.json();
        if (json.success && json.data) setData(json.data);
      } catch (e) { console.error('Failed to load:', e); }
      setLoading(false);
    }
    loadData();
  }, []);

  const saveData = useCallback(async (newData: FitnessData) => {
    setSaving(true);
    try {
      await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: SYNC_KEY, payload: newData }) });
    } catch (e) { console.error('Failed to save:', e); }
    setTimeout(() => setSaving(false), 500);
  }, []);

  useEffect(() => {
    if (!loading) { const timer = setTimeout(() => saveData(data), 1000); return () => clearTimeout(timer); }
  }, [data, loading, saveData]);

  const startWorkout = () => setCurrentWorkout({ id: generateId(), date: getToday(), type: workoutType, exercises: [], totalVolume: 0 });
  
  const addSet = () => {
    const w = parseFloat(weight), r = parseInt(reps);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
    setSets(prev => [...prev, { id: generateId(), weight: w, reps: r }]);
    setWeight(''); setReps('');
  };

  const saveExercise = () => {
    if (!currentWorkout || sets.length === 0 || !exerciseName.trim()) return;
    const bestWeight = Math.max(...sets.map(s => s.weight));
    const prevPR = data.personalRecords[exerciseName.toLowerCase()] || 0;
    const isPR = bestWeight > prevPR;
    const volume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    setCurrentWorkout(prev => prev ? { ...prev, exercises: [...prev.exercises, { name: exerciseName.trim(), sets: [...sets], isPR }], totalVolume: prev.totalVolume + volume } : null);
    if (isPR) setData(prev => ({ ...prev, personalRecords: { ...prev.personalRecords, [exerciseName.toLowerCase()]: bestWeight } }));
    setExerciseName(''); setSets([]);
  };

  const finishWorkout = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) return;
    setData(prev => { const newWorkouts = [...prev.workouts, currentWorkout]; return { ...prev, workouts: newWorkouts, streak: calculateStreak(newWorkouts), lastWorkoutDate: currentWorkout.date, totalWorkouts: prev.totalWorkouts + 1 }; });
    setCurrentWorkout(null); setSets([]); setExerciseName('');
  };

  const cancelWorkout = () => { setCurrentWorkout(null); setSets([]); setExerciseName(''); };

  const logPlyo = () => {
    const vj = parseFloat(verticalJump);
    if (isNaN(vj) || vj <= 0) return;
    setData(prev => ({ ...prev, plyometrics: [...prev.plyometrics, { date: getToday(), verticalJump: vj, broadJump: broadJump ? parseFloat(broadJump) : undefined }] }));
    setVerticalJump(''); setBroadJump('');
  };

  const deleteWorkout = (id: string) => setData(prev => ({ ...prev, workouts: prev.workouts.filter(w => w.id !== id), totalWorkouts: Math.max(0, prev.totalWorkouts - 1) }));

  const weeklyCount = getWeeklyWorkouts(data.workouts);
  const prCount = Object.keys(data.personalRecords).length;
  const latestVJ = data.plyometrics.length > 0 ? data.plyometrics[data.plyometrics.length - 1].verticalJump : null;
  const bestVJ = data.plyometrics.length > 0 ? Math.max(...data.plyometrics.map(p => p.verticalJump)) : null;
  const vjGoal = 30;
  const vjProgress = latestVJ ? (latestVJ / vjGoal) * 100 : 0;

  if (loading) return <main style={s.main}><div style={s.loading}>CONNECTING...</div></main>;

  return (
    <main style={s.main}>
      <header style={s.header}>
        <div style={s.headerTitle}>CORE_02: BIOLOGICAL LEDGER</div>
        <div style={s.headerSubtitle}>PHYSICAL EVOLUTION</div>
        {saving && <div style={s.sync}>SYNC</div>}
      </header>
      
      <div style={s.statsBar}>
        <div style={s.stat}><span style={s.statVal}>{data.streak}</span><span style={s.statLabel}>STREAK</span></div>
        <div style={s.stat}><span style={s.statVal}>{weeklyCount}/5</span><span style={s.statLabel}>WEEKLY</span></div>
        <div style={s.stat}><span style={{...s.statVal, color:'#FFD700'}}>{prCount}</span><span style={s.statLabel}>PRs</span></div>
      </div>
      
      <nav style={s.nav}>
        {['LOG','HISTORY','PLYO','PRs'].map(k => (
          <button key={k} onClick={() => setView(k.toLowerCase() as ViewMode)} style={{...s.navBtn, borderBottom: view===k.toLowerCase()?'2px solid #00FF7F':'none', color: view===k.toLowerCase()?'#00FF7F':'#666'}}>{k}</button>
        ))}
      </nav>
      
      <div style={s.content}>
        {view === 'log' && (currentWorkout ? (
          <div style={s.form}>
            <div style={s.formHeader}><span>{currentWorkout.type.toUpperCase()}</span><span style={{color:'#666'}}>{currentWorkout.date}</span></div>
            <div style={s.inputGroup}>
              <input type="text" placeholder="EXERCISE NAME" value={exerciseName} onChange={e=>setExerciseName(e.target.value)} style={s.input} />
              {sets.length > 0 && <div style={s.setsList}>{sets.map((s,i) => <div key={s.id} style={s.setItem}>SET {i+1}: {s.weight}×{s.reps} = {s.weight*s.reps}</div>)}</div>}
              <div style={s.row}>
                <input type="number" placeholder="LBS" value={weight} onChange={e=>setWeight(e.target.value)} style={s.smallInput} />
                <span style={{color:'#666'}}>×</span>
                <input type="number" placeholder="REPS" value={reps} onChange={e=>setReps(e.target.value)} style={s.smallInput} />
                <button onClick={addSet} style={s.addBtn}>+</button>
              </div>
              {sets.length > 0 && <button onClick={saveExercise} style={s.saveBtn}>SAVE EXERCISE</button>}
            </div>
            {currentWorkout.exercises.length > 0 && (
              <div style={s.session}>
                <div style={s.sessionHeader}>SESSION</div>
                {currentWorkout.exercises.map((ex,i) => <div key={i} style={s.exItem}>{ex.name} {ex.isPR && <span style={s.prTag}>PR!</span>} <span style={{color:'#888'}}>{ex.sets.map(s=>`${s.weight}×${s.reps}`).join(', ')}</span></div>)}
                <div style={s.volume}>VOL: {currentWorkout.totalVolume.toLocaleString()} lbs</div>
              </div>
            )}
            <div style={s.actions}>
              <button onClick={cancelWorkout} style={s.cancelBtn}>CANCEL</button>
              <button onClick={finishWorkout} disabled={currentWorkout.exercises.length===0} style={{...s.finishBtn, opacity: currentWorkout.exercises.length===0?0.5:1}}>FINISH</button>
            </div>
          </div>
        ) : (
          <div style={s.start}>
            <div style={s.ready}>SYSTEM READY</div>
            <div style={s.typeGrid}>
              {(['push','pull','legs','cardio','plyo','other'] as const).map(t => (
                <button key={t} onClick={()=>setWorkoutType(t)} style={{...s.typeBtn, borderColor: workoutType===t?'#00FF7F':'#333', color: workoutType===t?'#00FF7F':'#666'}}>{t.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={startWorkout} style={s.startBtn}>START WORKOUT</button>
          </div>
        ))}
        
        {view === 'history' && (
          <div style={s.historyList}>
            {data.workouts.length === 0 ? <div style={s.empty}>No workouts yet.</div> : [...data.workouts].reverse().map(w => (
              <div key={w.id} style={s.historyCard}>
                <div style={s.historyHeader}><span style={{color:'#00FF7F'}}>{w.type.toUpperCase()}</span><span style={{color:'#666'}}>{w.date}</span><button onClick={()=>deleteWorkout(w.id)} style={s.delBtn}>×</button></div>
                {w.exercises.map((ex,i) => <div key={i} style={s.historyEx}>{ex.name}: {ex.sets.map(s=>`${s.weight}×${s.reps}`).join(', ')}</div>)}
                <div style={s.historyVol}>VOL: {w.totalVolume.toLocaleString()} lbs</div>
              </div>
            ))}
          </div>
        )}
        
        {view === 'plyo' && (
          <div style={s.plyo}>
            <div style={s.plyoCard}>
              <div style={{color:'#666', letterSpacing:'0.2em', marginBottom:'1rem'}}>VERTICAL JUMP</div>
              <div style={{fontSize:'3rem', fontWeight:'bold', color:'#00FF7F'}}>{latestVJ || '--'}</div>
              <div style={{color:'#666'}}>inches</div>
              <div style={{marginTop:'1rem', color:'#888'}}>GOAL: {vjGoal}"</div>
              <div style={s.progressBar}><div style={{...s.progressFill, width:`${Math.min(vjProgress,100)}%`}} /></div>
              <div style={{color:'#666'}}>{Math.round(vjProgress)}%</div>
            </div>
            <div style={s.plyoForm}>
              <div style={s.plyoRow}>
                <div><label style={{color:'#666', fontSize:'0.6rem'}}>VERTICAL (in)</label><input type="number" value={verticalJump} onChange={e=>setVerticalJump(e.target.value)} style={s.plyoInput} /></div>
                <div><label style={{color:'#666', fontSize:'0.6rem'}}>BROAD (in)</label><input type="number" value={broadJump} onChange={e=>setBroadJump(e.target.value)} style={s.plyoInput} /></div>
              </div>
              <button onClick={logPlyo} style={s.logBtn}>LOG</button>
            </div>
            {data.plyometrics.length > 0 && (
              <div style={s.plyoHistory}>
                <div style={{color:'#666', marginBottom:'0.5rem'}}>RECENT</div>
                {data.plyometrics.slice(-5).reverse().map((p,i) => <div key={i} style={s.plyoLog}>{p.date}: <span style={{color:'#00FF7F'}}>{p.verticalJump}"</span></div>)}
              </div>
            )}
            {bestVJ && <div style={s.best}>BEST: {bestVJ}"</div>}
          </div>
        )}
        
        {view === 'prs' && (
          <div style={s.prs}>
            {Object.keys(data.personalRecords).length === 0 ? <div style={s.empty}>No PRs yet.</div> : Object.entries(data.personalRecords).sort(([,a],[,b])=>b-a).map(([ex,w]) => (
              <div key={ex} style={s.prItem}><span>{ex.toUpperCase()}</span><span style={{color:'#FFD700', fontWeight:'bold'}}>{w} lbs</span></div>
            ))}
          </div>
        )}
      </div>
      
      <footer style={s.footer}><a href="/" style={s.backLink}>⟵ MAINFRAME</a></footer>
    </main>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  main: { minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFF', display: 'flex', flexDirection: 'column' },
  loading: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00FF7F' },
  header: { padding: '1rem', textAlign: 'center', borderBottom: '2px solid #00FF7F', position: 'relative' },
  headerTitle: { fontSize: '0.9rem', fontWeight: 'bold', color: '#00FF7F', letterSpacing: '0.2em' },
  headerSubtitle: { fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em' },
  sync: { position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#666' },
  statsBar: { display: 'flex', justifyContent: 'space-around', padding: '1rem', backgroundColor: '#111' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  statVal: { fontSize: '1.5rem', fontWeight: 'bold', color: '#00FF7F' },
  statLabel: { fontSize: '0.6rem', color: '#666' },
  nav: { display: 'flex', borderBottom: '1px solid #222' },
  navBtn: { flex: 1, padding: '0.75rem 0', background: 'none', border: 'none', color: '#666', fontSize: '0.7rem', cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: '1rem' },
  start: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 1rem' },
  ready: { color: '#00FF7F', fontSize: '0.8rem', letterSpacing: '0.2em' },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', width: '100%', maxWidth: '300px' },
  typeBtn: { padding: '0.75rem 0.5rem', background: '#111', border: '1px solid #333', color: '#666', fontSize: '0.7rem', cursor: 'pointer' },
  startBtn: { padding: '1rem 2rem', background: '#00FF7F', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  formHeader: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#111', borderBottom: '1px solid #00FF7F', color: '#00FF7F', fontWeight: 'bold' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: '#111', border: '1px solid #222' },
  input: { width: '100%', padding: '0.75rem', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', fontSize: '1rem' },
  setsList: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  setItem: { padding: '0.5rem', backgroundColor: '#0A0A0A', fontSize: '0.8rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  smallInput: { width: '60px', padding: '0.5rem', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', textAlign: 'center' },
  addBtn: { padding: '0.5rem 1rem', background: '#222', border: '1px solid #333', color: '#FFF', cursor: 'pointer' },
  saveBtn: { padding: '0.75rem', background: '#00FF7F', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  session: { padding: '1rem', backgroundColor: '#0F0F0F', border: '1px solid #222' },
  sessionHeader: { color: '#00FF7F', fontSize: '0.7rem', marginBottom: '0.5rem' },
  exItem: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A' },
  prTag: { fontSize: '0.6rem', color: '#FFD700', border: '1px solid #FFD700', padding: '1px 4px', marginLeft: '0.5rem' },
  volume: { marginTop: '0.5rem', fontSize: '0.7rem', color: '#666', textAlign: 'right' },
  actions: { display: 'flex', gap: '1rem', marginTop: '1rem' },
  cancelBtn: { flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #FF1744', color: '#FF1744', cursor: 'pointer' },
  finishBtn: { flex: 1, padding: '1rem', background: '#00FF7F', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty: { textAlign: 'center', color: '#666', padding: '2rem' },
  historyCard: { backgroundColor: '#111', border: '1px solid #222', padding: '1rem' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #222' },
  delBtn: { background: 'none', border: 'none', color: '#FF1744', cursor: 'pointer', fontSize: '1rem' },
  historyEx: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', color: '#888' },
  historyVol: { marginTop: '0.75rem', fontSize: '0.7rem', color: '#666', textAlign: 'right' },
  plyo: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  plyoCard: { backgroundColor: '#111', border: '2px solid #00FF7F', padding: '1.5rem', textAlign: 'center' },
  progressBar: { height: '8px', backgroundColor: '#222', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00FF7F', transition: 'width 0.3s' },
  plyoForm: { backgroundColor: '#111', border: '1px solid #222', padding: '1rem' },
  plyoRow: { display: 'flex', gap: '1rem' },
  plyoInput: { width: '100%', padding: '0.75rem', background: '#0A0A0A', border: '1px solid #333', color: '#FFF', marginTop: '0.5rem' },
  logBtn: { width: '100%', padding: '0.75rem', background: '#00FF7F', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' },
  plyoHistory: { backgroundColor: '#0F0F0F', padding: '1rem', border: '1px solid #222' },
  plyoLog: { padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A', fontSize: '0.8rem' },
  best: { textAlign: 'center', padding: '1rem', backgroundColor: '#111', border: '1px solid #FFD700', color: '#FFD700', fontWeight: 'bold' },
  prs: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  prItem: { display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#111', border: '1px solid #222' },
  footer: { textAlign: 'center', padding: '1rem', borderTop: '1px solid #222' },
  backLink: { color: '#00F0FF', textDecoration: 'none', fontSize: '0.8rem' },
};
