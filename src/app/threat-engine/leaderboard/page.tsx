'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface Rival { id: string; rank: number; name: string; gpa: number; isConfirmed: boolean; }
interface LeaderboardData { rivals: Rival[]; }

const SYNC_KEY = 'bluelock_leaderboard';
const LOCAL_KEY = 'backup_leaderboard';

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData>({ rivals: [] });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'syncing' | 'error' | 'local'>('idle');
  const [form, setForm] = useState({ rank: '', name: '', gpa: '' });
  
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load (Cloud -> Local Fallback)
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/sync?key=${SYNC_KEY}`);
        const json = await res.json();
        if (json.success && json.data?.rivals) {
          setData(json.data);
          setSaveStatus('saved');
          localStorage.setItem(LOCAL_KEY, JSON.stringify(json.data));
        } else {
          throw new Error("Cloud empty");
        }
      } catch (e) {
        // Ghost Protocol: Load from Local
        const local = localStorage.getItem(LOCAL_KEY);
        if (local) {
          setData(JSON.parse(local));
          setSaveStatus('local');
        } else {
          // Genesis Object: Create Self
          setData({ rivals: [{ id: 'self', rank: 70, name: 'ZACH', gpa: 5.2, isConfirmed: true }] });
          setSaveStatus('idle');
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // 2. Persistence Layer (Auto-Save + Manual)
  const saveToCloud = useCallback(async (newData: LeaderboardData) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SYNC_KEY, payload: newData })
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus('saved');
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newData));
        setTimeout(() => setSaveStatus('syncing'), 2000);
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      // Ghost Protocol: Save Locally
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newData));
      localStorage.setItem(`${SYNC_KEY}_pending`, 'true');
    }
  }, []);

  // Debounced Auto-Save
  useEffect(() => {
    if (loading) return;
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    setSaveStatus('syncing'); // Indicate change waiting
    saveTimeout.current = setTimeout(() => {
      saveToCloud(data);
    }, 1000);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [data, loading, saveToCloud]);

  const addIntel = () => {
    const newRank = parseInt(form.rank), newGpa = parseFloat(form.gpa);
    if (!form.name || isNaN(newRank) || isNaN(newGpa)) return;
    
    setData(prev => {
      const exists = prev.rivals.find(r => r.rank === newRank);
      let newRivals: Rival[];
      if (exists) {
        newRivals = prev.rivals.map(r => r.rank === newRank ? { ...r, name: form.name.toUpperCase(), gpa: newGpa, isConfirmed: true } : r);
      } else {
        newRivals = [...prev.rivals, { id: Date.now().toString(), rank: newRank, name: form.name.toUpperCase(), gpa: newGpa, isConfirmed: true }];
      }
      return { rivals: newRivals };
    });
    
    setForm({ rank: '', name: '', gpa: '' });
  };

  const removeIntel = (id: string) => {
    setData(prev => ({ rivals: prev.rivals.filter(r => r.id !== id) }));
  };

  const fullLeaderboard = useMemo(() => {
    const confirmed = [...data.rivals].filter(r => r.isConfirmed).sort((a, b) => a.rank - b.rank);
    const list: Rival[] = [];
    for (let i = 1; i <= 100; i++) {
      const confirmedEntry = confirmed.find(r => r.rank === i);
      if (confirmedEntry) { list.push(confirmedEntry); }
      else {
        const upper = confirmed.find(r => r.rank > i);
        const lower = [...confirmed].reverse().find(r => r.rank < i);
        let estimatedGpa = 0;
        if (lower && upper) { estimatedGpa = lower.gpa + ((upper.gpa - lower.gpa) / (upper.rank - lower.rank)) * (i - lower.rank); }
        else if (lower) { estimatedGpa = lower.gpa - 0.005 * (i - lower.rank); }
        else if (upper) { estimatedGpa = upper.gpa + 0.005 * (upper.rank - i); }
        else { estimatedGpa = 5.0; }
        list.push({ id: `est-${i}`, rank: i, name: 'ESTIMATED', gpa: parseFloat(estimatedGpa.toFixed(3)), isConfirmed: false });
      }
    }
    return list;
  }, [data.rivals]);

  if (loading) return <div style={s.main}>CONNECTING...</div>;

  return (
    <div style={s.main}>
      <div style={s.console}>
        <div style={s.consoleHeader}>
          <span>INTEL ENTRY</span>
          {/* Status Indicator */}
          <span style={{
            fontSize: '0.6rem',
            color: saveStatus === 'saved' ? '#00FF41' : saveStatus === 'saving' ? '#FFB000' : saveStatus === 'local' ? '#2979FF' : '#FF1744'
          }}>
            {saveStatus === 'saved' ? '● CLOUD SYNCED' : saveStatus === 'saving' ? '● SYNCING...' : saveStatus === 'local' ? '● LOCAL MODE' : '○ DIRTY'}
          </span>
        </div>
        <div style={s.form}>
          <input type="number" placeholder="#" value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})} style={{...s.input,width:'60px'}} />
          <input placeholder="NAME" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...s.input,flex:1}} />
          <input type="number" step="0.001" placeholder="GPA" value={form.gpa} onChange={e=>setForm({...form,gpa:e.target.value})} style={{...s.input,width:'80px'}} />
          <button onClick={addIntel} style={s.addBtn}>LOG</button>
        </div>
        {/* Manual Save Button */}
        <button onClick={() => saveToCloud(data)} disabled={saveStatus === 'saving'} style={{
          ...s.saveBtn,
          opacity: saveStatus === 'saving' ? 0.5 : 1,
          borderColor: saveStatus === 'saved' ? '#00FF41' : '#333'
        }}>
          {saveStatus === 'saving' ? 'SYNCING...' : 'FORCE SYNC'}
        </button>
      </div>
      
      <div style={s.confirmed}>
        <div style={s.secTitle}>CONFIRMED [{data.rivals.length}]</div>
        {data.rivals.sort((a,b)=>a.rank-b.rank).map(e => (
          <div key={e.id} style={{...s.confRow, background: e.name==='ZACH'?'#0A1A0A':'#111', borderLeftColor: e.name==='ZACH'?'#00FF41':'#FF1744'}}>
            <span style={{color:'#666'}}>#{e.rank}</span>
            <span style={{flex:1, color: e.name==='ZACH'?'#00FF41':'#FFF'}}>{e.name}</span>
            <span style={{color: e.gpa>=5.75?'#00FF41':e.gpa>=5.5?'#FFB000':'#666'}}>{e.gpa.toFixed(3)}</span>
            {e.name!=='ZACH' && <button onClick={()=>removeIntel(e.id)} style={s.xBtn}>×</button>}
          </div>
        ))}
      </div>
      
      <div style={s.list}>
        <div style={s.listHeader}>RANKINGS 1-50</div>
        {fullLeaderboard.slice(0,50).map(e => (
          <div key={e.rank} style={{...s.row, background: e.name==='ZACH'?'#0A1A0A':'transparent'}}>
            <span style={{color:'#333',width:'30px'}}>{e.rank}</span>
            <span style={{flex:1, color: e.isConfirmed?(e.name==='ZACH'?'#00FF41':'#FFF'):'#444', fontWeight: e.isConfirmed?'bold':'normal'}}>{e.name}</span>
            <span style={{color: e.gpa>=5.75?'#00FF41':e.gpa>=5.5?'#FFB000':'#444'}}>{e.gpa.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A0A' },
  console: { background: '#050505', padding: '10px 15px', borderBottom: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '10px' },
  consoleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  form: { display: 'flex', gap: '8px' },
  input: { background: '#000', border: '1px solid #333', color: '#FFF', padding: '10px', fontSize: '0.85rem' },
  addBtn: { background: '#FF1744', color: '#FFF', border: 'none', fontWeight: 'bold', padding: '0 20px', cursor: 'pointer' },
  saveBtn: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid', color: '#FFF', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
  confirmed: { background: '#0F0F0F', padding: '10px 15px', borderBottom: '1px solid #222' },
  secTitle: { fontSize: '0.65rem', color: '#666', marginBottom: '10px' },
  confRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderLeft: '3px solid', marginBottom: '5px' },
  xBtn: { background: 'none', border: 'none', color: '#FF1744', cursor: 'pointer', fontSize: '1rem', padding: '0 5px' },
  list: { flex: 1, overflowY: 'auto', padding: '0 15px 15px' },
  listHeader: { fontSize: '0.65rem', color: '#444', padding: '10px 0', position: 'sticky', top: 0, background: '#0A0A0A' },
  row: { display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #111', fontSize: '0.8rem' },
};
