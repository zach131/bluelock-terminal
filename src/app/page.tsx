'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link'; // Import Link

// ... (Keep existing constants: CORRECT_PASSWORD, SESSION_KEY, CORES) ...
const CORRECT_PASSWORD = 'bluelock'; 
const SESSION_KEY = 'bluelock_session';

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

// ... (Keep PasswordGate component exactly as is) ...
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'authenticated');
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword('');
    }
  };

  return (
    <div style={styles.gateContainer}>
      <div style={styles.gridOverlay} />
      <div style={styles.scanLine} />
      <div style={{
        ...styles.gateCard,
        animation: shake ? 'shake 0.5s ease-in-out' : 'none',
      }}>
        <div style={styles.logo}>
          <span style={styles.logoText}>BL</span>
        </div>
        <h1 style={styles.gateTitle}>BLUE LOCK TERMINAL</h1>
        <p style={styles.gateSubtitle}>AUTHENTICATION REQUIRED</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="ENTER PASSWORD"
            autoFocus
            style={{
              ...styles.passwordInput,
              borderColor: error ? '#FF1744' : '#333',
            }}
          />
          <button type="submit" style={styles.submitBtn}>ACCESS</button>
        </form>
        {error && <p style={styles.errorText}>ACCESS DENIED</p>}
        <p style={styles.hint}>
          {password.length === 0 ? '████████' : '█'.repeat(password.length) + '█'.repeat(8 - password.length)}
        </p>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

// Main Dashboard Component
function Mainframe() {
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.logo}><span style={styles.logoText}>BL</span></div>
        <div style={styles.headerTitle}>BLUE LOCK MAINFRAME</div>
        <div style={styles.headerSubtitle}>SELECT YOUR WEAPON</div>
      </header>
      <div style={styles.gridContainer}>
        {CORES.map((core) => (
          // CHANGED: <a> to <Link> to prevent page reload killing save processes
          <Link href={core.path} key={core.id} style={styles.coreCardLink}>
            <div style={{ ...styles.coreCard, borderColor: core.color }}>
              <div style={{ ...styles.coreName, color: core.color }}>{core.name}</div>
              <div style={styles.coreSub}>{core.sub}</div>
              <div style={styles.coreId}>{core.id.toUpperCase()}</div>
            </div>
          </Link>
        ))}
      </div>
      <footer style={styles.footer}>
        <div>EVOLVE OR DISAPPEAR.</div>
        <button onClick={handleLogout} style={styles.logoutBtn}>[LOCK TERMINAL]</button>
      </footer>
    </main>
  );
}

// ... (Keep Page component exactly as is) ...
export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    const timer = setTimeout(() => {
      setIsAuthenticated(session === 'authenticated');
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlock = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  if (!mounted) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>INITIALIZING...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

  return <Mainframe />;
}

const styles: { [key: string]: React.CSSProperties } = {
  // ... (Keep existing styles) ...
  loadingContainer: { minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#00F0FF', fontSize: '0.8rem', letterSpacing: '0.3em' },
  gateContainer: { minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  gridOverlay: { position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)`, backgroundSize: '50px 50px', pointerEvents: 'none' },
  scanLine: { position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)', animation: 'scan 3s linear infinite' },
  gateCard: { backgroundColor: '#111', border: '1px solid #00F0FF', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', zIndex: 1, minWidth: '320px', maxWidth: '90vw' },
  logo: { width: '80px', height: '80px', border: '3px solid #00F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '2rem', fontWeight: 'bold', color: '#00F0FF', textShadow: '0 0 20px #00F0FF' },
  gateTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: '#FFF', letterSpacing: '0.2em', textAlign: 'center' },
  gateSubtitle: { fontSize: '0.7rem', color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' },
  passwordInput: { background: '#0A0A0A', border: '2px solid #333', color: '#00FF41', padding: '1rem', fontSize: '1rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.3em', outline: 'none' },
  submitBtn: { background: '#00F0FF', color: '#000', border: 'none', padding: '1rem', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.2em', cursor: 'pointer' },
  errorText: { color: '#FF1744', fontSize: '0.8rem', letterSpacing: '0.2em', textShadow: '0 0 10px #FF1744' },
  hint: { color: '#222', fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: '0.5em' },
  main: { minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  header: { padding: '2rem 1rem 1rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  headerTitle: { fontSize: '1rem', fontWeight: 'bold', color: '#FFF', letterSpacing: '0.2em', marginTop: '0.5rem' },
  headerSubtitle: { fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '1rem', width: '100%', maxWidth: '600px' },
  coreCardLink: { textDecoration: 'none' },
  coreCard: { backgroundColor: '#111', border: '2px solid #333', padding: '1rem 0.5rem', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s' },
  coreName: { fontSize: '0.75rem', fontWeight: 'bold', lineHeight: 1.1 },
  coreSub: { fontSize: '0.55rem', color: '#666', textTransform: 'uppercase' },
  coreId: { fontSize: '0.45rem', color: '#333', marginTop: '0.5rem' },
  footer: { textAlign: 'center', padding: '2rem', fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', display: 'flex', flexDirection: 'column', gap: '1rem' },
  logoutBtn: { background: 'transparent', border: '1px solid #333', color: '#666', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem' },
};

