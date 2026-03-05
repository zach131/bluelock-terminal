'use client';

import Link from 'next/link';

export default function Vault() {
  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>CORE_06: THE VAULT</div>
        <div style={styles.headerSubtitle}>SINGULARITY PORTFOLIO</div>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.statusAlert}>SYSTEM ONLINE</div>
          <p style={styles.text}>
            Tracking capital accumulation and trade execution.
          </p>
          <div style={styles.placeholderBox}>
            <span style={styles.placeholderText}>P/L CHART / TRADE LOG</span>
          </div>
        </div>
      </div>

      <footer style={styles.footer}>
        <Link href="/" style={styles.backLink}>
          ⟵ RETURN TO MAINFRAME
        </Link>
      </footer>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: { minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', fontFamily: '"Orbitron", system-ui, sans-serif', display: 'flex', flexDirection: 'column' },
  header: { padding: '1rem', textAlign: 'center', borderBottom: '1px solid #FFD700', backgroundColor: '#0A0A0A' },
  headerTitle: { fontSize: '0.9rem', fontWeight: 'bold', color: '#FFD700', letterSpacing: '0.2em' },
  headerSubtitle: { fontSize: '0.7rem', color: '#666', marginTop: '0.25rem', letterSpacing: '0.1em' },
  content: { flex: 1, padding: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  card: { backgroundColor: '#111', border: '1px solid #333', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' },
  statusAlert: { color: '#00FF7F', fontSize: '0.8rem', letterSpacing: '0.2em', marginBottom: '1rem' },
  text: { color: '#AAA', fontSize: '0.9rem', lineHeight: 1.6 },
  placeholderBox: { marginTop: '1rem', height: '200px', border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F0F' },
  placeholderText: { color: '#444', fontSize: '0.8rem' },
  footer: { textAlign: 'center', padding: '1rem', borderTop: '1px solid #222' },
  backLink: { color: '#00F0FF', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer' },
};
