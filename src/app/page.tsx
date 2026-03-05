'use client';

import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// BLUE LOCK TERMINAL - MAINFRAME LAUNCHER
// ═══════════════════════════════════════════════════════════════

const CORES = [
  { id: 'threat-engine', name: 'THREAT ENGINE', sub: 'Academics', color: '#FF1744', path: '/threat-engine' },
  { id: 'biological-ledger', name: 'BIOLOGICAL LEDGER', sub: 'Iron/Plyometrics', color: '#00FF7F', path: '/biological-ledger' },
  { id: 'overclock', name: 'OVERCLOCK', sub: 'Sleep/Recovery', color: '#2979FF', path: '/overclock' },
  { id: 'visage', name: 'VISAGE', sub: 'Looksmax', color: '#D500F9', path: '/visage' },
  { id: 'aura', name: 'AURA', sub: 'Style/Presence', color: '#00E5FF', path: '/aura' },
  { id: 'vault', name: 'THE VAULT', sub: 'Portfolio', color: '#FFD700', path: '/vault' },
  { id: 'neural-link', name: 'NEURAL LINK', sub: 'Psych/Anime', color: '#651FFF', path: '/neural-link' },
  { id: 'architecture', name: 'ARCHITECTURE', sub: 'Coding', color: '#00B0FF', path: '/architecture' },
  { id: 'chessboard', name: 'CHESSBOARD', sub: 'Social Map', color: '#FFAB00', path: '/chessboard' },
];

export default function Mainframe() {
  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>BL</div>
        <div style={styles.headerTitle}>BLUE LOCK MAINFRAME</div>
        <div style={styles.headerSubtitle}>SELECT YOUR WEAPON</div>
      </header>

      {/* The Grid */}
      <div style={styles.gridContainer}>
        {CORES.map((core) => (
          <Link href={core.path} key={core.id} style={styles.coreCardLink}>
            <div style={{ ...styles.coreCard, borderColor: core.color }}>
              <div style={{ ...styles.coreName, color: core.color }}>{core.name}</div>
              <div style={styles.coreSub}>{core.sub}</div>
              <div style={styles.coreId}>{core.id.toUpperCase()}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        EVOLVE OR DISAPPEAR.
      </footer>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    fontFamily: '"Orbitron", system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    padding: '2rem 1rem 1rem 1rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logo: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#00F0FF',
    border: '2px solid #00F0FF',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
  },
  headerTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '0.2em',
    marginTop: '0.5rem',
  },
  headerSubtitle: {
    fontSize: '0.7rem',
    color: '#666',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    padding: '1rem',
    width: '100%',
    maxWidth: '600px',
    boxSizing: 'border-box',
  },
  coreCardLink: {
    textDecoration: 'none',
  },
  coreCard: {
    backgroundColor: '#111',
    border: '1px solid #333',
    padding: '1rem 0.5rem',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    textAlign: 'center',
  },
  coreName: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    lineHeight: 1.1,
  },
  coreSub: {
    fontSize: '0.6rem',
    color: '#666',
    textTransform: 'uppercase',
  },
  coreId: {
    fontSize: '0.5rem',
    color: '#333',
    marginTop: '0.5rem',
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '0.7rem',
    color: '#333',
    letterSpacing: '0.1em',
  },
};
