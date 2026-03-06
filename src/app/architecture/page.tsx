'use client';

export default function Architecture() {
  return (
    <main style={s.main}>
      <header style={{...s.header, borderBottomColor: '#00B0FF'}}>
        <div style={{...s.title, color: '#00B0FF'}}>CORE_08: ARCHITECTURE</div>
        <div style={s.sub}>DEVELOPMENT MATRIX</div>
      </header>
      <div style={s.content}>
        <div style={s.card}>
          <div style={s.status}>SYSTEM ONLINE</div>
          <p style={s.text}>Tracking coding hours, features shipped, and skills acquired.</p>
          <div style={s.box}><span style={s.boxText}>COMMIT HISTORY / SKILL TREE</span></div>
        </div>
      </div>
      <footer style={s.footer}><a href="/" style={s.link}>⟵ MAINFRAME</a></footer>
    </main>
  );
}

const s: {[key:string]:React.CSSProperties} = {
  main: { minHeight: '100vh', background: '#0A0A0A', color: '#FFF', display: 'flex', flexDirection: 'column' },
  header: { padding: '1.5rem', textAlign: 'center', borderBottom: '2px solid' },
  title: { fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.2em' },
  sub: { fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' },
  content: { flex: 1, padding: '1rem', maxWidth: '600px', margin: '0 auto' },
  card: { background: '#111', border: '1px solid #222', padding: '1.5rem', textAlign: 'center' },
  status: { color: '#00FF7F', fontSize: '0.8rem', letterSpacing: '0.2em' },
  text: { color: '#888', fontSize: '0.85rem', lineHeight: 1.6 },
  box: { marginTop: '1rem', height: '150px', border: '1px dashed #222', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0F0F' },
  boxText: { color: '#333', fontSize: '0.7rem' },
  footer: { textAlign: 'center', padding: '1rem', borderTop: '1px solid #222' },
  link: { color: '#00F0FF', textDecoration: 'none', fontSize: '0.8rem' },
};
