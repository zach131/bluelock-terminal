'use client';

import Link from 'next/link';
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
      {/* Sub-Nav */}
      <nav style={styles.nav}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            ...styles.link,
            borderBottom: path === l.href ? '2px solid #00FF41' : 'none',
            color: path === l.href ? '#00FF41' : '#666'
          }}>
            {l.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <Link href="/" style={styles.homeLink}>[MAINFRAME]</Link>
      </nav>
      
      {/* Content */}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#FFF', fontFamily: 'monospace' },
  nav: { display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #222', background: '#050505' },
  link: { padding: '5px 15px', fontSize: '0.8rem', letterSpacing: '1px', textDecoration: 'none' },
  homeLink: { fontSize: '0.7rem', color: '#666', textDecoration: 'none', border: '1px solid #333', padding: '2px 8px' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
};