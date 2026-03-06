'use client';

import { useState } from 'react';

// LINEAR SCALE LOGIC (Matching Main Engine)
// L1: 100=6.0, 99=5.9... (Grade - 40) / 10
// L2: 100=5.0, 99=4.9... (Grade - 50) / 10

export default function Calculator() {
  const [grade, setGrade] = useState(95);
  const [level, setLevel] = useState<'L1' | 'L2'>('L1');
  const [count, setCount] = useState(7);

  const calculateGPA = () => {
    if (level === 'L1') return (grade - 40) / 10;
    return (grade - 50) / 10;
  };

  const classGpa = calculateGPA();
  // Project Cumulative (Foundation 5.5 + Classes)
  const cumGpa = ((5.5 + (classGpa * count)) / (1 + count));

  return (
    <div style={styles.main}>
      <header style={styles.header}>
        <span style={styles.title}>SIMULATION ENGINE</span>
      </header>

      <div style={styles.grid}>
        {/* INPUTS */}
        <div style={styles.card}>
          <div style={styles.control}>
            <label style={styles.label}>CLASS AVERAGE (%)</label>
            <input 
              type="range" 
              min="70" 
              max="100" 
              value={grade} 
              onChange={e => setGrade(parseInt(e.target.value))} 
              style={styles.slider}
            />
            <span style={styles.sliderVal}>{grade}</span>
          </div>

          <div style={styles.control}>
            <label style={styles.label}>CLASS TIER</label>
            <div style={styles.btnGroup}>
              <button onClick={() => setLevel('L1')} style={{ ...styles.tierBtn, backgroundColor: level === 'L1' ? '#FFF' : '#111', color: level === 'L1' ? '#000' : '#FFF' }}>L1 (AP)</button>
              <button onClick={() => setLevel('L2')} style={{ ...styles.tierBtn, backgroundColor: level === 'L2' ? '#FFF' : '#111', color: level === 'L2' ? '#000' : '#FFF' }}>L2 (Reg)</button>
            </div>
          </div>

          <div style={styles.control}>
            <label style={styles.label}>NUMBER OF CLASSES (THIS TIER)</label>
            <input 
              type="number" 
              value={count} 
              onChange={e => setCount(parseInt(e.target.value) || 0)} 
              style={styles.input}
            />
          </div>
        </div>

        {/* OUTPUTS */}
        <div style={styles.card}>
          <div style={styles.resultRow}>
            <span style={styles.resLabel}>CLASS GPA VALUE</span>
            <span style={{ ...styles.resVal, color: classGpa >= 5.79 ? '#00FF41' : '#FFB000' }}>
              {classGpa.toFixed(2)}
            </span>
          </div>
          <div style={styles.divider} />
          <div style={styles.resultRow}>
            <span style={styles.resLabel}>PROJECTED CUMULATIVE</span>
            <span style={{ ...styles.resVal, fontSize: '2rem' }}>
              {cumGpa.toFixed(3)}
            </span>
          </div>
          <div style={styles.hint}>
            Based on 1.0 Credit Banked (5.5) + {count} Classes @ {grade}%
          </div>
        </div>
      </div>

      {/* INTERCEPT CHART */}
      <div style={styles.chart}>
        <div style={styles.chartHeader}>INTERCEPT ANALYSIS</div>
        <div style={styles.chartRow}>
          <span>Target 5.75</span>
          <span style={{ color: cumGpa >= 5.75 ? '#00FF41' : '#FF1744' }}>
            {cumGpa >= 5.75 ? 'ACHIEVED' : 'MISSED'}
          </span>
        </div>
        <div style={styles.chartRow}>
          <span>Required Avg for 5.75</span>
          <span style={{ color: '#FFF' }}>
            {((5.75 * (1 + count) - 5.5) / count).toFixed(2)} GPA
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between' },
  title: { fontSize: '1.2rem', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 },
  card: { background: '#111', border: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' },
  control: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '0.7rem', color: '#666', letterSpacing: '1px' },
  slider: { width: '100%' },
  sliderVal: { fontSize: '2rem', textAlign: 'right', color: '#00FF41' },
  btnGroup: { display: 'flex', gap: '10px' },
  tierBtn: { flex: 1, padding: '10px', cursor: 'pointer', fontFamily: 'monospace', border: '1px solid #333' },
  input: { background: '#000', border: '1px solid #333', color: '#FFF', padding: '10px', fontSize: '1rem', fontFamily: 'monospace' },
  resultRow: { display: 'flex', flexDirection: 'column', gap: '5px' },
  resLabel: { fontSize: '0.8rem', color: '#666' },
  resVal: { fontSize: '3rem', fontWeight: 'bold' },
  divider: { borderBottom: '1px solid #333', margin: '10px 0' },
  hint: { fontSize: '0.7rem', color: '#555', textAlign: 'right' },
  chart: { background: '#050505', border: '1px solid #222', padding: '15px' },
  chartHeader: { fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#FFF' },
  chartRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '5px' }
};
