'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Threat {
  id: string;
  name: string;
  subject: string;
  dueDate: string;
  status: 'ACTIVE' | 'NEUTRALIZED';
  level: 'S' | 'A' | 'B' | 'C';
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function calculateThreatLevel(dueDate: string): 'S' | 'A' | 'B' | 'C' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 'S'; // Critical
  if (diffDays <= 3) return 'A'; // High
  if (diffDays <= 7) return 'B'; // Medium
  return 'C'; // Low
}

function getThreatColor(level: 'S' | 'A' | 'B' | 'C'): string {
  switch (level) {
    case 'S': return '#FF1744'; // Red
    case 'A': return '#FF9100'; // Orange
    case 'B': return '#FFEA00'; // Yellow
    case 'C': return '#00E676'; // Green
    default: return '#FFF';
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ThreatEngine() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Load
  useEffect(() => {
    const stored = localStorage.getItem('bluelock_threats');
    if (stored) setThreats(JSON.parse(stored));
    setLoaded(true);
  }, []);

  // Save
  useEffect(() => {
    if (loaded) localStorage.setItem('bluelock_threats', JSON.stringify(threats));
  }, [threats, loaded]);

  const handleAddThreat = () => {
    if (!name || !dueDate) return;

    const newThreat: Threat = {
      id: Date.now().toString(),
      name,
      subject,
      dueDate,
      status: 'ACTIVE',
      level: calculateThreatLevel(dueDate),
    };

    setThreats(prev => [...prev, newThreat].sort((a, b) => {
      // Sort by Level priority
      const order = { S: 0, A: 1, B: 2, C: 3 };
      return order[a.level] - order[b.level];
    }));
    
    setName('');
    setSubject('');
    setDueDate('');
  };

  const handleNeutralize = (id: string) => {
    setThreats(prev => prev.filter(t => t.id !== id));
  };

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>CORE_01: THREAT ENGINE</div>
        <div style={styles.headerSubtitle}>ACADEMIC BATTLEFIELD</div>
      </header>

      <div style={styles.content}>
        
        {/* INPUT FORM */}
        <section style={styles.section}>
          <div style={styles.card}>
            <div style={styles.inputLabel}>IDENTIFY THREAT</div>
            <input
              type="text"
              placeholder="Assignment Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
            <input
              type="text"
              placeholder="Subject (Optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={styles.input}
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={styles.input}
            />
            <button onClick={handleAddThreat} style={styles.addButton}>
              LOG THREAT
            </button>
          </div>
        </section>

        {/* ACTIVE THREATS */}
        <section style={styles.section}>
          <div style={styles.statusHeader}>
            <span>ACTIVE THREATS</span>
            <span style={styles.count}>{threats.length}</span>
          </div>
          
          {loaded && threats.length === 0 && (
            <div style={styles.emptyState}>NO THREATS DETECTED.</div>
          )}

          <div style={styles.threatList}>
            {threats.map((threat) => (
              <div key={threat.id} style={{ ...styles.threatCard, borderLeftColor: getThreatColor(threat.level) }}>
                <div style={styles.threatTop}>
                  <span style={styles.threatName}>{threat.name}</span>
                  <span style={{ ...styles.levelBadge, color: getThreatColor(threat.level) }}>
                    {threat.level}-CLASS
                  </span>
                </div>
                <div style={styles.threatMeta}>
                  {threat.subject && <span>{threat.subject} | </span>}
                  <span>DUE: {new Date(threat.dueDate).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleNeutralize(threat.id)} style={styles.neutralizeBtn}>
                  NEUTRALIZE
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>

      <footer style={styles.footer}>
        <Link href="/" style={styles.backLink}>
          ⟵ RETURN TO MAINFRAME
        </Link>
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
  },
  header: {
    padding: '1rem',
    textAlign: 'center',
    borderBottom: '1px solid #FF1744',
    backgroundColor: '#0A0A0A',
  },
  headerTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#FF1744',
    letterSpacing: '0.2em',
  },
  headerSubtitle: {
    fontSize: '0.7rem',
    color: '#666',
    marginTop: '0.25rem',
    letterSpacing: '0.1em',
  },
  content: {
    flex: 1,
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  section: {
    marginBottom: '1.5rem',
  },
  card: {
    backgroundColor: '#111',
    border: '1px solid #333',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  inputLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#00F0FF',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  input: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #333',
    color: '#FFF',
    padding: '0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  addButton: {
    backgroundColor: '#FF1744',
    color: '#FFF',
    border: 'none',
    padding: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '0.1em',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    fontSize: '0.8rem',
    color: '#AAA',
  },
  count: {
    backgroundColor: '#FF1744',
    color: '#FFF',
    padding: '0.1rem 0.5rem',
    fontSize: '0.7rem',
  },
  emptyState: {
    textAlign: 'center',
    color: '#444',
    padding: '2rem',
    border: '1px dashed #333',
    fontSize: '0.8rem',
  },
  threatList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  threatCard: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderLeft: '4px solid', // Color set inline
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  threatTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threatName: {
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  levelBadge: {
    fontSize: '0.7rem',
    fontWeight: 'bold',
    padding: '0.2rem 0.4rem',
    border: '1px solid currentColor',
  },
  threatMeta: {
    fontSize: '0.75rem',
    color: '#888',
  },
  neutralizeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    color: '#00FF7F',
    border: '1px solid #00FF7F',
    padding: '0.4rem 0.8rem',
    fontSize: '0.7rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  footer: {
    textAlign: 'center',
    padding: '1rem',
    borderTop: '1px solid #222',
  },
  backLink: {
    color: '#00F0FF',
    textDecoration: 'none',
    fontSize: '0.8rem',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  },
};
