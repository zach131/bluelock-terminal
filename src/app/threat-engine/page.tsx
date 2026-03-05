'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

type SubjectID = 'alg' | 'csp' | 'aphu' | 'bio' | 'eng' | 'spa' | 'band';

interface ClassData {
  id: SubjectID;
  name: string;
  level: 'AP' | 'Regular';
  formative: number[];
  summative: number[];
}

interface LogEntry {
  type: 'success' | 'error' | 'info' | 'breach';
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS (KHS 6.0 SCALE)
// ═══════════════════════════════════════════════════════════════

// GPA Map: [Min, Max, BasePoints]
const GPA_SCALE = [
  [97, 100, 4.0], [93, 96, 3.8], [90, 92, 3.6], 
  [87, 89, 3.4], [83, 86, 3.2], [80, 82, 3.0],
  [77, 79, 2.8], [73, 76, 2.6], [70, 72, 2.4], 
  [0, 69, 0.0]
];

const SUBJECT_MAP: { [key: string]: { name: string; id: SubjectID; level: 'AP' | 'Regular' } } = {
  'm': { name: 'Algebra II', id: 'alg', level: 'Regular' },
  'cs': { name: 'AP CSP', id: 'csp', level: 'AP' },
  'h': { name: 'AP Human', id: 'aphu', level: 'AP' },
  'b': { name: 'Biology', id: 'bio', level: 'Regular' },
  'e': { name: 'English 1', id: 'eng', level: 'Regular' },
  's': { name: 'Spanish 2', id: 'spa', level: 'Regular' },
  'vb': { name: 'Varsity Band', id: 'band', level: 'Regular' },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAverage(arr: number[]): number {
  if (arr.length === 0) return 100; // Assume perfect if empty
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateClassGrade(formative: number[], summative: number[]): number {
  const fAvg = getAverage(formative);
  const sAvg = getAverage(summative);
  return (fAvg * 0.3) + (sAvg * 0.7);
}

function getBaseGPA(grade: number): number {
  for (const [min, max, points] of GPA_SCALE) {
    if (grade >= min && grade <= max) return points;
  }
  return 0;
}

function calculateWeightedGPA(classes: ClassData[]): number {
  let totalPoints = 0;
  let count = 0;

  classes.forEach(cls => {
    const grade = calculateClassGrade(cls.formative, cls.summative);
    let base = getBaseGPA(grade);
    
    // Apply Weight: AP gets +1.0 (Total 5.0 scale max usually, user mentioned 6.0 array? 
    // KHS is typically 6.0 for AP 100s? Let's stick to standard weighted: AP +1)
    // Adjusting for "The 6.0 Array" request: If 100 in AP = 6.0.
    // Base 4.0 + 2.0 weight? Or Base 5.0 + 1.0? 
    // Logic: Standard GPA scale (4.0 base). AP adds 2.0 weight? Or is the scale just higher?
    // LET'S ASSUME: 100 in Regular = 5.0 (as per user GPA 5.20). 100 in AP = 6.0.
    
    if (cls.level === 'AP') base += 2.0; // Making 100 = 6.0
    else base += 1.0; // Making 100 = 5.0
    
    totalPoints += base;
    count++;
  });

  return count > 0 ? totalPoints / count : 0;
}

function calculateDebt(grade: number): number {
  return 97 - grade;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ThreatEngine() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([{ type: 'info', message: 'SYSTEM READY.' }]);
  const [breach, setBreach] = useState<{ status: boolean; recovery: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init
  useEffect(() => {
    const stored = localStorage.getItem('bluelock_threat_data');
    if (stored) {
      setClasses(JSON.parse(stored));
    } else {
      // Default Setup
      const defaults: ClassData[] = [
        { id: 'alg', name: 'Algebra II', level: 'Regular', formative: [], summative: [] },
        { id: 'csp', name: 'AP CSP', level: 'AP', formative: [], summative: [] },
        { id: 'aphu', name: 'AP Human', level: 'AP', formative: [], summative: [] },
        { id: 'bio', name: 'Biology', level: 'Regular', formative: [], summative: [] },
        { id: 'eng', name: 'English 1', level: 'Regular', formative: [], summative: [] },
        { id: 'spa', name: 'Spanish 2', level: 'Regular', formative: [], summative: [] },
        { id: 'band', name: 'Varsity Band', level: 'Regular', formative: [], summative: [] },
      ];
      setClasses(defaults);
    }
  }, []);

  // Save
  useEffect(() => {
    if (classes.length > 0) {
      localStorage.setItem('bluelock_threat_data', JSON.stringify(classes));
    }
  }, [classes]);

  // Focus input on keypress
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        if (e.key !== 'Enter') inputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Command Parser
  const handleCommand = (raw: string) => {
    const input = raw.trim().toLowerCase();
    if (!input) return;

    // ADD COMMAND: +m q 95
    if (input.startsWith('+')) {
      const parts = input.split(' ');
      const subKey = parts[0].substring(1); // m
      const type = parts[1]; // q or t
      const grade = parseInt(parts[2]);

      if (!SUBJECT_MAP[subKey] || !type || isNaN(grade)) {
        addLog('error', 'SYNTAX ERROR. Format: +[sub] [q/t] [grade]');
        return;
      }

      const target = SUBJECT_MAP[subKey];
      const isSummative = type === 't';
      const arrKey = isSummative ? 'summative' : 'formative';

      setClasses(prev => prev.map(c => {
        if (c.id === target.id) {
          return { ...c, [arrKey]: [...c[arrKey], grade] };
        }
        return c;
      }));

      addLog('success', `LOGGED: ${target.name} ${isSummative ? 'SUMM' : 'FORM'} -> ${grade}`);

      // BREACH DETECTION
      if (grade < 97) {
        const recovery = Math.ceil((97 - (grade * 0.3)) / 0.7);
        setBreach({ status: true, recovery: `REQUIRE ${recovery}% ON NEXT SUMMATIVE TO STABILIZE.` });
        addLog('breach', `SYSTEM BREACH: GRADE < 97. NEUTRALIZE IMMEDIATELY.`);
      } else {
        setBreach(null);
      }
    } 
    // ROI COMMAND
    else if (input === 'roi') {
      // Sort by highest "Debt" (opportunity)
      const sorted = [...classes].sort((a, b) => {
        const debtA = calculateDebt(calculateClassGrade(a.formative, a.summative));
        const debtB = calculateDebt(calculateClassGrade(b.formative, b.summative));
        return debtB - debtA; // Highest debt first
      });
      setClasses(sorted);
      addLog('info', 'STACK RE-ORDERED: HIGH PRIORITY TARGETS AT TOP.');
    }
    // CLEAR COMMAND
    else if (input === 'clear') {
      setLogs([{ type: 'info', message: 'TERMINAL CLEARED.' }]);
      setBreach(null);
    }
    else {
      addLog('error', 'UNKNOWN COMMAND.');
    }
    setCmd('');
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-5), { type, message }]);
  };

  // CALCULATIONS
  const gpa = calculateWeightedGPA(classes);
  // Velocity calculation would require historical data snapshot. 
  // Simulated for now based on simple logic:
  const velocity = gpa > 5.0 ? '+0.02' : '-0.01'; 

  return (
    <main style={styles.main}>
      {/* TOP HUD (10%) */}
      <header style={styles.hud}>
        <div style={styles.hudBox}>
          <span style={styles.hudLabel}>RANK</span>
          <span style={styles.hudValue}>70</span>
        </div>
        <div style={styles.hudBox}>
          <span style={styles.hudLabel}>GPA</span>
          <span style={{ ...styles.hudValue, color: '#00FF41' }}>{gpa.toFixed(2)}</span>
        </div>
        <div style={styles.hudBox}>
          <span style={styles.hudLabel}>VELOCITY</span>
          <span style={{ ...styles.hudValue, color: velocity.startsWith('+') ? '#00FF41' : '#FFB000' }}>{velocity}</span>
        </div>
      </header>

      {/* CENTRAL STACK */}
      <div style={styles.stack}>
        <div style={styles.stackHeader}>
          <span style={{ flex: 1 }}>SUBJECT</span>
          <span style={{ width: '60px', textAlign: 'right' }}>AVG</span>
          <span style={{ width: '60px', textAlign: 'right' }}>DEBT</span>
        </div>
        <div style={styles.stackBody}>
          {classes.map((cls) => {
            const avg = calculateClassGrade(cls.formative, cls.summative);
            const debt = calculateDebt(avg);
            const isBreach = avg < 90;
            return (
              <div key={cls.id} style={styles.stackRow}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cls.level === 'AP' && <span style={styles.apBadge}>AP</span>}
                  <span style={{ color: isBreach ? '#FFB000' : '#FFF' }}>{cls.name}</span>
                </div>
                <span style={{ ...styles.stackData, color: avg >= 97 ? '#00FF41' : '#FFF' }}>
                  {avg.toFixed(1)}
                </span>
                <span style={{ ...styles.stackData, color: debt <= 0 ? '#00FF41' : '#FFB000' }}>
                  {debt > 0 ? `-${debt.toFixed(1)}` : '0.0'}
                </span>
              </div>
            );
          })}
        </div>

        {/* BREACH ALERT */}
        {breach && (
          <div style={styles.breachAlert}>
            <div style={styles.breachHeader}>SYSTEM BREACH</div>
            <div>{breach.recovery}</div>
            <button 
              onClick={() => setBreach(null)} 
              style={styles.breachBtn}
            >
              ACKNOWLEDGED
            </button>
          </div>
        )}
      </div>

      {/* LOG OUTPUT */}
      <div style={styles.logContainer}>
        {logs.map((log, i) => (
          <div key={i} style={{ ...styles.logText, color: log.type === 'error' ? '#FFB000' : log.type === 'breach' ? '#FF1744' : '#666' }}>
            {`> ${log.message}`}
          </div>
        ))}
      </div>

      {/* BOTTOM BAR (COMMAND LINE) */}
      <footer style={styles.footer}>
        <div style={styles.prompt}>{'>'}</div>
        <input
          ref={inputRef}
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommand(cmd)}
          placeholder="ENTER COMMAND (+m q 95)"
          style={styles.input}
        />
        <Link href="/" style={styles.homeLink}>[HOME]</Link>
      </footer>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES (GHOST UI)
// ═══════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    height: '100vh',
    backgroundColor: '#000000', // Pure Black
    color: '#FFFFFF',
    fontFamily: '"Orbitron", monospace',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '10px',
  },
  // HUD
  hud: {
    height: '10%',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #333',
    paddingBottom: '10px',
  },
  hudBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  hudLabel: {
    fontSize: '0.7rem',
    color: '#666',
    letterSpacing: '2px',
  },
  hudValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginTop: '5px',
  },
  // STACK
  stack: {
    flex: 1,
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #333',
    backgroundColor: '#050505',
  },
  stackHeader: {
    display: 'flex',
    padding: '10px',
    borderBottom: '1px solid #333',
    fontSize: '0.7rem',
    color: '#666',
    letterSpacing: '1px',
  },
  stackBody: {
    flex: 1,
    overflowY: 'auto', // Just in case, but designed to fit 7 classes
  },
  stackRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px 10px',
    borderBottom: '1px solid #222',
  },
  apBadge: {
    fontSize: '0.6rem',
    padding: '2px 4px',
    backgroundColor: '#FFB000',
    color: '#000',
    fontWeight: 'bold',
  },
  stackData: {
    width: '60px',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  // BREACH
  breachAlert: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    border: '2px solid #FF1744',
    padding: '20px',
    textAlign: 'center',
    width: '90%',
    maxWidth: '400px',
    zIndex: 10,
  },
  breachHeader: {
    color: '#FF1744',
    fontWeight: 'bold',
    marginBottom: '10px',
    letterSpacing: '2px',
  },
  breachBtn: {
    marginTop: '15px',
    background: 'transparent',
    border: '1px solid #FF1744',
    color: '#FFF',
    padding: '5px 15px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // LOGS
  logContainer: {
    height: '80px',
    overflowY: 'auto',
    marginTop: '10px',
    fontSize: '0.75rem',
    color: '#666',
    borderBottom: '1px solid #333',
    paddingBottom: '5px',
  },
  logText: {
    fontFamily: 'monospace',
  },
  // FOOTER
  footer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '10px',
    borderTop: '1px solid #333',
    paddingTop: '10px',
  },
  prompt: {
    color: '#00FF41',
    marginRight: '5px',
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FFF',
    fontFamily: 'monospace',
    fontSize: '1rem',
    outline: 'none',
  },
  homeLink: {
    fontSize: '0.7rem',
    color: '#666',
    textDecoration: 'none',
    marginLeft: '10px',
    border: '1px solid #333',
    padding: '2px 5px',
  },
};
