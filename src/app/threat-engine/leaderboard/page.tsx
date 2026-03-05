'use client';

import { useState, useEffect, useMemo } from 'react';

interface Rival {
  id: string;
  rank: number; // The specific rank slot they occupy
  name: string;
  gpa: number;
  isConfirmed: boolean; // True if entered by user, false if estimated
}

export default function Leaderboard() {
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [form, setForm] = useState({ rank: '', name: '', gpa: '' });

  // Load
  useEffect(() => {
    const stored = localStorage.getItem('bluelock_leaderboard_v2');
    if (stored) setRivals(JSON.parse(stored));
    else {
      // Default: User at Rank 70
      setRivals([
        { id: 'self', rank: 70, name: 'ZACH', gpa: 5.2, isConfirmed: true }
      ]);
    }
  }, []);

  // Save
  useEffect(() => {
    if (rivals.length > 0) localStorage.setItem('bluelock_leaderboard_v2', JSON.stringify(rivals));
  }, [rivals]);

  const addIntel = () => {
    const newRank = parseInt(form.rank);
    const newGpa = parseFloat(form.gpa);
    if (!form.name || isNaN(newRank) || isNaN(newGpa)) return;

    // Check if rank exists, if so, update it. Else add.
    setRivals(prev => {
      const exists = prev.find(r => r.rank === newRank);
      if (exists) {
        return prev.map(r => r.rank === newRank ? { ...r, name: form.name.toUpperCase(), gpa: newGpa, isConfirmed: true } : r);
      }
      return [...prev, { id: Date.now().toString(), rank: newRank, name: form.name.toUpperCase(), gpa: newGpa, isConfirmed: true }];
    });
    setForm({ rank: '', name: '', gpa: '' });
  };

  const removeIntel = (id: string) => {
    setRivals(prev => prev.filter(r => r.id !== id));
  };

  // THE MATH: LINEAR INTERPOLATION ENGINE
  const fullLeaderboard = useMemo(() => {
    // 1. Sort confirmed rivals by rank
    const confirmed = [...rivals].filter(r => r.isConfirmed).sort((a, b) => a.rank - b.rank);
    
    // 2. Generate 1-100 slots
    const list: Rival[] = [];
    for (let i = 1; i <= 100; i++) {
      const confirmedEntry = confirmed.find(r => r.rank === i);
      if (confirmedEntry) {
        list.push(confirmedEntry);
      } else {
        // Find nearest confirmed neighbors
        const upper = confirmed.find(r => r.rank > i);
        const lower = [...confirmed].reverse().find(r => r.rank < i);

        let estimatedGpa = 0;

        if (lower && upper) {
          // Interpolate between two known points
          const rankDiff = upper.rank - lower.rank;
          const gpaDiff = upper.gpa - lower.gpa;
          const step = gpaDiff / rankDiff;
          estimatedGpa = lower.gpa + (step * (i - lower.rank));
        } else if (lower) {
          // Extrapolate down (decay)
          estimatedGpa = lower.gpa - (0.005 * (i - lower.rank)); // Slow decay
        } else if (upper) {
          // Extrapolate up (growth)
          estimatedGpa = upper.gpa + (0.005 * (upper.rank - i)); // Growth
        } else {
          // No data at all (shouldn't happen if user is rank 70)
          estimatedGpa = 5.0; 
        }

        list.push({
          id: `est-${i}`,
          rank: i,
          name: 'ESTIMATED',
          gpa: parseFloat(estimatedGpa.toFixed(3)),
          isConfirmed: false
        });
      }
    }
    return list;
  }, [rivals]);

  return (
    <div style={styles.main}>
      {/* INPUT CONSOLE */}
      <div style={styles.console}>
        <div style={styles.consoleHeader}>INTEL ENTRY</div>
        <div style={styles.form}>
          <input
            type="number"
            placeholder="RANK"
            value={form.rank}
            onChange={e => setForm({ ...form, rank: e.target.value })}
            style={{ ...styles.input, width: '60px' }}
          />
          <input
            placeholder="NAME"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ ...styles.input, flex: 1 }}
          />
          <input
            placeholder="GPA"
            value={form.gpa}
            onChange={e => setForm({ ...form, gpa: e.target.value })}
            style={{ ...styles.input, width: '80px' }}
          />
          <button onClick={addIntel} style={styles.addBtn}>LOG</button>
        </div>
      </div>

      {/* LEADERBOARD LIST */}
      <div style={styles.list}>
        {fullLeaderboard.map((entry) => (
          <div key={entry.rank} style={styles.rowWrapper}>
            <div style={{
              ...styles.row,
              backgroundColor: entry.name === 'ZACH' ? '#0A1A0A' : '#000',
              borderBottomColor: entry.isConfirmed ? '#222' : '#111'
            }}>
              <div style={styles.rankBlock}>
                <span style={styles.rankNum}>{entry.rank}</span>
              </div>
              <div style={styles.nameBlock}>
                <span style={{ 
                  ...styles.nameText, 
                  color: entry.isConfirmed ? '#FFF' : '#555', // Grey for estimated
                  fontWeight: entry.isConfirmed ? 'bold' : 'normal'
                }}>
                  {entry.name}
                </span>
                {!entry.isConfirmed && <span style={styles.estTag}>EST</span>}
              </div>
              <div style={styles.gpaBlock}>
                <span style={{ 
                  ...styles.gpaText, 
                  color: entry.gpa >= 5.79 ? '#00FF41' : entry.gpa >= 5.5 ? '#FFB000' : '#666'
                }}>
                  {entry.gpa.toFixed(3)}
                </span>
              </div>
              
              {entry.isConfirmed && entry.name !== 'ZACH' && (
                <button onClick={() => removeIntel(entry.id)} style={styles.xBtn}>X</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  
  // CONSOLE
  console: { background: '#050505', padding: '10px', borderBottom: '1px solid #222' },
  consoleHeader: { fontSize: '0.7rem', color: '#00FF41', marginBottom: '8px', letterSpacing: '2px' },
  form: { display: 'flex', gap: '5px' },
  input: { background: '#000', border: '1px solid #333', color: '#FFF', padding: '8px', fontFamily: 'monospace' },
  addBtn: { background: '#00FF41', color: '#000', border: 'none', fontWeight: 'bold', padding: '0 15px', cursor: 'pointer' },

  // LIST
  list: { flex: 1, overflowY: 'auto' },
  
  rowWrapper: { borderBottom: '1px solid #111' },
  row: { display: 'flex', alignItems: 'center', padding: '8px 10px' },
  
  rankBlock: { width: '40px' },
  rankNum: { fontSize: '0.8rem', color: '#333', fontWeight: 'bold' },
  
  nameBlock: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  nameText: { fontSize: '0.9rem' },
  estTag: { fontSize: '0.5rem', color: '#333', border: '1px solid #333', padding: '1px 3px' },
  
  gpaBlock: { width: '70px', textAlign: 'right' },
  gpaText: { fontFamily: 'monospace', fontWeight: 'bold' },
  
  xBtn: { background: 'none', border: 'none', color: '#FF1744', marginLeft: '5px', cursor: 'pointer', fontSize: '0.8rem' }
};