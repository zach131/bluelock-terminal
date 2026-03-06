'use client';

import { usePathname } from 'next/navigation';

export default function ThreatLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  
  const links = [
    { href: '/threat-engine', label: 'TRACKER' },
    { href: '/threat-engine/calculator', label: 'CALCULATOR' },
    { href: '/threat-engine/leaderboard', label: 'LEADERBOARD' },
  ];

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navBrand}>THREAT ENGINE</div>
        <div style={styles.navLinks}>
          {links.map(l => (
            <a key={l.href} href={l.href} style={{
              ...styles.link,
              borderBottom: path === l.href ? '2px solid #FF1744' : 'none',
              color: path === l.href ? '#FF1744' : '#666'
            }}>
              {l.label}
            </a>
          ))}
        </div>
        <a href="/" style={styles.homeLink}>[MAINFRAME]</a>
      </nav>
      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0A0A0A', color: '#FFF' },
  nav: { display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #222', background: '#050505', gap: '1rem' },
  navBrand: { fontSize: '0.8rem', fontWeight: 'bold', color: '#FF1744', letterSpacing: '0.1em' },
  navLinks: { display: 'flex', flex: 1 },
  link: { padding: '8px 15px', fontSize: '0.75rem', letterSpacing: '1px', textDecoration: 'none' },
  homeLink: { fontSize: '0.7rem', color: '#666', textDecoration: 'none', border: '1px solid #333', padding: '4px 10px' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
};
