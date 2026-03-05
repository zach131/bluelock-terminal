'use client';

import { useState, useEffect } from 'react';

interface Rival {
  id: string;
  name: string;
  gpa: number;
  tier: 'L1' | 'L2' | 'UNKNOWN';
}

export default function Leaderboard() {
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [form, setForm] = useState({ name: '', gpa: '', tier: 'L1' });

  useEffect(() => {
    const stored = localStorage.getItem('bluelock_leaderboard');
    if (stored) setRivals(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('bluelock_leaderboard', JSON.stringify(rivals));
  }, [rivals]);

  const addRival = () => {
    if (!form.name || !form.gpa) return;
    const newRival: Rival = {
      id: Date.now().toString(),
      name: form.name.toUpperCase(),
      gpa: parseFloat(form.gpa),
      tier: form.tier as 'L1' | 'L2'
    };
    setRivals(prev => [...prev, newRival].sort((a, b) => b.gpa - a.gpa));
    setForm({ name: '', gpa: '', tier: 'L1' });
  };

  const removeRival = (id: string) => {
    setRivals(prev => prev.filter(r => r.id !== id));
  };

  // Calculate "Self" position (Assume current user GPA is pulled from Tracker, 
  // but for now we allow manual entry or just track others)
  // We will highlight the user manually if they add themselves as "ZACH".

  return (
    <div style={styles.main}>
      <header style={styles.header}>
        <span style={styles.title}>RIVAL HIERARCHY</span>
        <span style={styles.sub}>SORTED BY THREAT LEVEL</span>
      </header>

      {/* INPUT */}
      <div style={styles.inputRow}>
        <input 
          placeholder="NAME" 
          value={form.name} 
          onChange={e => setForm({ ...form, name: e.target.value })} 
          style={styles.input}
        />
        <input 
          placeholder="GPA (5.8)" 
          value={form.gpa} 
          onChange={e => setForm({ ...form, gpa: e.target.value })} 
          style={{ ...styles.input, width: '80px' }}
        />
        <select 
          value={form.tier} 
          onChange={e => setForm({ ...form, tier: e.target.value })}
          style={styles.select}
        >
          <option value="L1">L1</option>
          <option value="L2">L2</option>
        </select>
        <button onClick={addRival} style={styles.addBtn}>+</button>
      </div>

      {/* LIST */}
      <div style={styles.list}>
        {rivals.map((r, i) => (
          <div key={r.id} style={styles.row}>
            <div style={styles.rank}>#{i + 1}</div>
            <div style={styles.ident}>
              <span style={styles.rivalName}>{r.name}</span>
              <span style={styles.rivalTier}>{r.tier}</span>
            </div>
            <div style={{ ...styles.gpaVal, color: r.gpa >= 5.79 ? '#00FF41' : '#FFB000' }}>
              {r.gpa.toFixed(3)}
            </div>
            <button onClick={() => removeRival(r.id)} style={styles.delBtn}>X</button>
          </div>
        ))}
        {rivals.length === 0 && (
          <div style={styles.empty}>NO RIVALS DETECTED. ADD TARGETS.</div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' },
  header: { marginBottom: '20px' },
  title: { fontSize: '1.2rem', fontWeight: 'bold', color: '#FFF' },
  sub: { fontSize: '0.7rem', color: '#666', marginLeft: '10px' },
  inputRow: { display: 'flex', gap: '5px', marginBottom: '20px' },
  input: { background: '#111', border: '1px solid #333', color: '#FFF', padding: '8px', flex: 1, fontFamily: 'monospace' },
  select: { background: '#111', border: '1px solid #333', color: '#FFF', padding: '8px', fontFamily: 'monospace' },
  addBtn: { background: '#00FF41', color: '#000', border: 'none', fontWeight: 'bold', width: '40px', cursor: 'pointer' },
  list: { flex: 1, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #111' },
  rank: { fontSize: '1.5rem', fontWeight: 'bold', color: '#333', width: '50px' },
  ident: { flex: 1, display: 'flex', flexDirection: 'column' },
  rivalName: { fontSize: '1rem', color: '#FFF' },
  rivalTier: { fontSize: '0.6rem', color: '#666' },
  gpaVal: { fontSize: '1.2rem', fontWeight: 'bold', width: '80px', textAlign: 'right' },
  delBtn: { background: 'none', border: 'none', color: '#FF1744', marginLeft: '10px', cursor: 'pointer' },
  empty: { textAlign: 'center', color: '#444', marginTop: '50px' }
};