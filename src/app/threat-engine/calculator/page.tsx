'use client';

import { useState } from 'react';

const GPA_SCALE: [number, number, number][] = [[97,100,4.0],[93,96,3.8],[90,92,3.6],[87,89,3.4],[83,86,3.2],[80,82,3.0],[77,79,2.8],[73,76,2.6],[70,72,2.4],[0,69,0.0]];

export default function Calculator() {
  const [grade, setGrade] = useState(95);
  const [level, setLevel] = useState<'L1' | 'L2'>('L1');
  const [count, setCount] = useState(7);
  const [bankedGpa, setBankedGpa] = useState(5.5);
  const [bankedCredits, setBankedCredits] = useState(1);

  const getBase = (g: number): number => { for (const [min, max, pts] of GPA_SCALE) if (g >= min && g <= max) return pts; return 0; };
  const classGpa = getBase(grade) + (level === 'L1' ? 2.0 : 1.0);
  const cumGpa = ((bankedGpa * bankedCredits) + (classGpa * count)) / (bankedCredits + count);
  const requiredForTarget = (target: number) => ((target * (bankedCredits + count)) - (bankedGpa * bankedCredits)) / count;

  return (
    <div style={s.main}>
      <header style={s.header}><span style={s.title}>SIMULATION ENGINE</span><span style={s.subtitle}>GPA PROJECTION</span></header>
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.secTitle}>INPUT</div>
          <div style={s.ctrl}><label style={s.lbl}>AVG %</label><input type="range" min="70" max="100" value={grade} onChange={e=>setGrade(parseInt(e.target.value))} style={s.slider} /><span style={s.sliderVal}>{grade}%</span></div>
          <div style={s.ctrl}><label style={s.lbl}>TIER</label><div style={s.btnGrp}><button onClick={()=>setLevel('L1')} style={{...s.tierBtn, background: level==='L1'?'#FF1744':'#111', color: level==='L1'?'#FFF':'#666'}}>L1</button><button onClick={()=>setLevel('L2')} style={{...s.tierBtn, background: level==='L2'?'#666':'#111', color: level==='L2'?'#FFF':'#666'}}>L2</button></div></div>
          <div style={s.ctrl}><label style={s.lbl}>CLASSES</label><input type="number" value={count} onChange={e=>setCount(Math.max(1,parseInt(e.target.value)||1))} style={s.numInput} /></div>
          <div style={s.div} />
          <div style={s.ctrl}><label style={s.lbl}>BANKED GPA</label><input type="number" step="0.001" value={bankedGpa} onChange={e=>setBankedGpa(parseFloat(e.target.value)||0)} style={s.numInput} /></div>
          <div style={s.ctrl}><label style={s.lbl}>BANKED CREDITS</label><input type="number" value={bankedCredits} onChange={e=>setBankedCredits(Math.max(0,parseInt(e.target.value)||0))} style={s.numInput} /></div>
        </div>
        <div style={s.card}>
          <div style={s.secTitle}>OUTPUT</div>
          <div style={s.resRow}><span style={s.resLbl}>CLASS GPA</span><span style={{...s.resVal, color: classGpa>=5.5?'#00FF41':classGpa>=4?'#FFB000':'#FF1744'}}>{classGpa.toFixed(2)}</span></div>
          <div style={s.div} />
          <div style={s.resRow}><span style={s.resLbl}>CUMULATIVE</span><span style={{...s.resVal, fontSize:'2.5rem', color: cumGpa>=5.75?'#00FF41':cumGpa>=5?'#FFB000':'#FF1744'}}>{cumGpa.toFixed(3)}</span></div>
          <div style={s.hint}>{bankedCredits} cr @ {bankedGpa.toFixed(2)} + {count} @ {grade}%</div>
        </div>
      </div>
      <div style={s.analysis}>
        <div style={s.analysisHeader}>TARGETS</div>
        {[5.0,5.25,5.5,5.75,6.0].map(t => { const req = requiredForTarget(t); const ok = req <= classGpa && req >= 0; return <div key={t} style={s.targetRow}><span>Target {t.toFixed(2)}</span><span style={{color: ok?'#00FF41':'#FF1744'}}>{req<0?'EXCEEDED':req>6?'IMPOSSIBLE':`Req: ${req.toFixed(2)}`}</span></div>; })}
      </div>
    </div>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  main: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' },
  header: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  title: { fontSize: '1rem', fontWeight: 'bold', color: '#FF1744', letterSpacing: '0.1em' },
  subtitle: { fontSize: '0.7rem', color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  card: { background: '#111', border: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  secTitle: { fontSize: '0.7rem', color: '#666', letterSpacing: '0.2em', marginBottom: '0.5rem' },
  ctrl: { display: 'flex', flexDirection: 'column', gap: '8px' },
  lbl: { fontSize: '0.65rem', color: '#888', letterSpacing: '1px' },
  slider: { width: '100%', accentColor: '#FF1744' },
  sliderVal: { fontSize: '1.5rem', color: '#FF1744', fontWeight: 'bold' },
  btnGrp: { display: 'flex', gap: '10px' },
  tierBtn: { flex: 1, padding: '10px', cursor: 'pointer', border: '1px solid #333' },
  numInput: { background: '#0A0A0A', border: '1px solid #333', color: '#FFF', padding: '10px', fontSize: '1rem' },
  div: { borderBottom: '1px solid #222', margin: '5px 0' },
  resRow: { display: 'flex', flexDirection: 'column', gap: '5px' },
  resLbl: { fontSize: '0.75rem', color: '#666' },
  resVal: { fontSize: '2rem', fontWeight: 'bold' },
  hint: { fontSize: '0.65rem', color: '#555', textAlign: 'right', marginTop: '0.5rem' },
  analysis: { background: '#0A0A0A', border: '1px solid #222', padding: '15px' },
  analysisHeader: { fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '15px', color: '#FF1744', letterSpacing: '0.1em' },
  targetRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#111', marginBottom: '5px', fontSize: '0.8rem' },
};
