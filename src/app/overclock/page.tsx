'use client';

// ═══════════════════════════════════════════════════════════════
// OVERCLOCK - Sleep/Recovery Module
// ═══════════════════════════════════════════════════════════════

export default function Overclock() {
  return (
    <main style={styles.main}>
      <header style={{ ...styles.header, borderBottomColor: '#2979FF' }}>
        <div style={{ ...styles.headerTitle, color: '#2979FF' }}>CORE_03: OVERCLOCK</div>
        <div style={styles.headerSubtitle}>RESTORATION PROTOCOL</div>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.statusAlert}>SYSTEM ONLINE</div>
          <p style={styles.text}>
            Monitoring sleep cycles and recovery metrics to maximize hardware efficiency.
            Track your rest quality, sleep duration, and recovery patterns.
          </p>
          <div style={styles.placeholderBox}>
            <span style={styles.placeholderText}>SLEEP LOG / RECOVERY METRICS</span>
          </div>
          <div style={styles.features}>
            <div style={styles.feature}>• Sleep duration tracking</div>
            <div style={styles.feature}>• Sleep quality scoring</div>
            <div style={styles.feature}>• Recovery optimization</div>
            <div style={styles.feature}>• Circadian rhythm mapping</div>
          </div>
        </div>
      </div>

      <footer style={styles.footer}>
        <a href="/" style={styles.backLink}>⟵ RETURN TO MAINFRAME</a>
      </footer>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: { minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', display: 'flex', flexDirection: 'column' },
  header: { padding: '1.5rem', textAlign: 'center', borderBottom: '2px solid' },
  headerTitle: { fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.2em' },
  headerSubtitle: { fontSize: '0.7rem', color: '#666', marginTop: '0.25rem', letterSpacing: '0.1em' },
  content: { flex: 1, padding: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  card: { backgroundColor: '#111', border: '1px solid #222', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' },
  statusAlert: { color: '#00FF7F', fontSize: '0.8rem', letterSpacing: '0.2em' },
  text: { color: '#888', fontSize: '0.85rem', lineHeight: 1.6 },
  placeholderBox: { marginTop: '1rem', height: '150px', border: '1px dashed #222', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F0F' },
  placeholderText: { color: '#333', fontSize: '0.7rem' },
  features: { textAlign: 'left', marginTop: '1rem' },
  feature: { color: '#555', fontSize: '0.75rem', padding: '0.25rem 0' },
  footer: { textAlign: 'center', padding: '1rem', borderTop: '1px solid #222' },
  backLink: { color: '#00F0FF', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.1em' },
};
