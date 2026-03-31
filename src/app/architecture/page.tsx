'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSync } from '@/lib/useSync';
import { awardXp } from '@/lib/globalXp';
import { XP_VALUES } from '@/lib/constants';

// --- Types ---

type ProjectType = "FRONTEND" | "BACKEND" | "SYSTEM" | "ART" | "OTHER";
type Difficulty = 1 | 2 | 3 | 4 | 5;
type CommitType = "FEATURE" | "FIX" | "REFACTOR" | "DOCS";

interface Project {
  id: string;
  name: string;
  type: ProjectType;
  difficulty: Difficulty;
  linesOfCode: number; // Estimated
  date: string;
  xpAwarded: number;
}

interface Commit {
  id: string;
  message: string;
  type: CommitType;
  date: string;
  xpAwarded: number;
}

interface ArchitectureData {
  projects: Project[];
  commits: Commit[];
}

const DEFAULT_DATA: ArchitectureData = {
  projects: [],
  commits: [],
};

const SYNC_KEY = 'bluelock_architecture';

// --- Constants ---
const PROJECT_TYPES: ProjectType[] = ["FRONTEND", "BACKEND", "SYSTEM", "ART", "OTHER"];
const DIFFICULTY_LABELS = ["Trivial", "Simple", "Moderate", "Complex", "God Mode"];
const COMMIT_TYPES: CommitType[] = ["FEATURE", "FIX", "REFACTOR", "DOCS"];

export default function Architecture() {
  const { data, loading, update } = useSync<ArchitectureData>({
    cloudKey: SYNC_KEY,
    defaultValue: DEFAULT_DATA,
  });

  const [view, setView] = useState<'projects' | 'commits'>('projects');

  // Form State
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<ProjectType>("FRONTEND");
  const [pDiff, setPDiff] = useState<Difficulty>(3);
  const [pLoc, setPLoc] = useState('');

  const [cMsg, setCMsg] = useState('');
  const [cType, setCType] = useState<CommitType>("FEATURE");

  // --- Logic ---

  const calculateProjectXp = (diff: Difficulty, loc: number): number => {
    // Base: 20. Diff Multiplier: x10. Loc Bonus: +1 per 100 lines.
    const base = 20;
    const diffMultiplier = diff * 10;
    const locBonus = Math.floor(loc / 100);
    return base + diffMultiplier + locBonus;
  };

  const calculateCommitXp = (type: CommitType): number => {
    switch (type) {
      case "FEATURE": return 15;
      case "FIX": return 10;
      case "REFACTOR": return 12;
      case "DOCS": return 5;
      default: return 5;
    }
  };

  const addProject = useCallback(() => {
    if (!pName.trim()) return;
    const loc = parseInt(pLoc) || 0;
    const xp = calculateProjectXp(pDiff, loc);

    const newProject: Project = {
      id: Date.now().toString(),
      name: pName.trim(),
      type: pType,
      difficulty: pDiff,
      linesOfCode: loc,
      date: new Date().toISOString(),
      xpAwarded: xp,
    };

    update(prev => ({ ...prev, projects: [newProject, ...prev.projects] }));
    awardXp(xp, "BUILD");

    // Reset
    setPName('');
    setPLoc('');
    setPDiff(3);
  }, [pName, pType, pDiff, pLoc, update]);

  const addCommit = useCallback(() => {
    if (!cMsg.trim()) return;
    const xp = calculateCommitXp(cType);

    const newCommit: Commit = {
      id: Date.now().toString(),
      message: cMsg.trim(),
      type: cType,
      date: new Date().toISOString(),
      xpAwarded: xp,
    };

    update(prev => ({ ...prev, commits: [newCommit, ...prev.commits] }));
    awardXp(xp, "BUILD");

    setCMsg('');
  }, [cMsg, cType, update]);

  // --- Stats ---
  const stats = useMemo(() => {
    const totalLoc = data.projects.reduce((sum, p) => sum + p.linesOfCode, 0);
    const totalProjects = data.projects.length;
    const totalCommits = data.commits.length;

    // Velocity: Commits in last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyCommits = data.commits.filter(c => new Date(c.date).getTime() > weekAgo).length;

    // Structure: Feature/Fix ratio
    const features = data.commits.filter(c => c.type === "FEATURE").length;
    const fixes = data.commits.filter(c => c.type === "FIX").length;
    const integrity = fixes > 0 ? Math.round((features / fixes) * 100) : 100;

    return { totalLoc, totalProjects, totalCommits, weeklyCommits, integrity };
  }, [data]);

  if (loading) return <div style={s.loading}>LOADING BLUEPRINT...</div>;

  return (
    <div style={s.main}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.title}>CORE_08: ARCHITECTURE</div>
        <div style={s.sub}>EMPIRE CONSTRUCTION INTERFACE</div>
      </header>

      {/* Stats HUD */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <span style={s.statVal}>{stats.totalProjects}</span>
          <span style={s.statLabel}>PROJECTS</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statVal}>{stats.totalCommits}</span>
          <span style={s.statLabel}>COMMITS</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statVal}>{stats.weeklyCommits}</span>
          <span style={s.statLabel}>VELOCITY</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statVal}>{stats.integrity}%</span>
          <span style={s.statLabel}>STRUCTURE</span>
        </div>
      </div>

      {/* View Toggle */}
      <nav style={s.nav}>
        <button onClick={() => setView('projects')} style={{ ...s.navBtn, borderBottom: view === 'projects' ? '2px solid #00b0ff' : 'none', color: view === 'projects' ? '#00b0ff' : '#555' }}>
          BLUEPRINTS
        </button>
        <button onClick={() => setView('commits')} style={{ ...s.navBtn, borderBottom: view === 'commits' ? '2px solid #00b0ff' : 'none', color: view === 'commits' ? '#00b0ff' : '#555' }}>
          LOGS
        </button>
      </nav>

      {/* Content */}
      <div style={s.content}>

        {view === 'projects' && (
          <div style={s.view}>
            {/* Input Form */}
            <div style={s.form}>
              <div style={s.formRow}>
                <input placeholder="PROJECT NAME" value={pName} onChange={e => setPName(e.target.value)} style={s.inputLong} />
                <select value={pType} onChange={e => setPType(e.target.value as ProjectType)} style={s.select}>
                  {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={s.formRow}>
                <select value={pDiff} onChange={e => setPDiff(Number(e.target.value) as Difficulty)} style={s.select}>
                  {DIFFICULTY_LABELS.map((l, i) => <option key={i} value={i + 1}>{l} ({i + 1})</option>)}
                </select>
                <input placeholder="LINES OF CODE (est.)" type="number" value={pLoc} onChange={e => setPLoc(e.target.value)} style={s.inputShort} />
              </div>
              <div style={s.calcRow}>
                <span style={s.calcLabel}>PREDICTED XP:</span>
                <span style={s.calcVal}>{calculateProjectXp(pDiff, parseInt(pLoc) || 0)}</span>
              </div>
              <button onClick={addProject} style={s.submitBtn}>CONSTRUCT PROJECT</button>
            </div>

            {/* List */}
            <div style={s.list}>
              {data.projects.map(p => (
                <div key={p.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <span style={s.cardTitle}>{p.name}</span>
                    <span style={{ ...s.badge, background: '#0af3', color: '#0af' }}>{p.type}</span>
                  </div>
                  <div style={s.cardMeta}>
                    <span>DIFFICULTY: {p.difficulty}</span>
                    <span>LOC: {p.linesOfCode}</span>
                    <span style={s.xpTag}>+{p.xpAwarded} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'commits' && (
          <div style={s.view}>
            <div style={s.form}>
              <div style={s.formRow}>
                <input placeholder="COMMIT MESSAGE" value={cMsg} onChange={e => setCMsg(e.target.value)} style={s.inputLong} />
                <select value={cType} onChange={e => setCType(e.target.value as CommitType)} style={s.select}>
                  {COMMIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={s.calcRow}>
                <span style={s.calcLabel}>PREDICTED XP:</span>
                <span style={s.calcVal}>{calculateCommitXp(cType)}</span>
              </div>
              <button onClick={addCommit} style={s.submitBtn}>LOG COMMIT</button>
            </div>

            <div style={s.list}>
              {data.commits.map(c => (
                <div key={c.id} style={s.cardSmall}>
                  <span style={s.commitMsg}>{c.message}</span>
                  <span style={{ ...s.badge, background: c.type === 'FEATURE' ? '#0af3' : '#fff3', color: c.type === 'FEATURE' ? '#0af' : '#fff' }}>{c.type}</span>
                  <span style={s.xpTagSmall}>+{c.xpAwarded} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <footer style={s.footer}>
        <Link href="/" style={s.backLink}>⟵ MAINFRAME</Link>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', color: '#fff' },
  loading: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' },

  header: { padding: '1.5rem 1rem', textAlign: 'center', borderBottom: '1px solid #333', background: 'linear-gradient(180deg, rgba(0,176,255,0.05) 0%, transparent 100%)' },
  title: { fontSize: '1rem', fontWeight: 800, color: '#00b0ff', letterSpacing: '0.2em', fontFamily: 'var(--font-display)' },
  sub: { fontSize: '0.6rem', color: '#666', letterSpacing: '0.1em', marginTop: '0.25rem' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#222', borderBottom: '1px solid #222' },
  statCard: { background: '#0a0a0a', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  statVal: { fontSize: '1.5rem', fontWeight: 700, color: '#00b0ff', fontFamily: 'var(--font-display)' },
  statLabel: { fontSize: '0.5rem', color: '#555', letterSpacing: '0.1em' },

  nav: { display: 'flex', borderBottom: '1px solid #222' },
  navBtn: { flex: 1, padding: '0.75rem', background: 'none', border: 'none', fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s' },

  content: { flex: 1, overflowY: 'auto', padding: '1rem' },
  view: { display: 'flex', flexDirection: 'column', gap: '1rem' },

  form: { background: '#111', border: '1px solid #333', padding: '1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  formRow: { display: 'flex', gap: '0.5rem' },
  inputLong: { flex: 1, background: '#0a0a0a', border: '1px solid #333', padding: '0.5rem', color: '#fff', fontSize: '0.8rem' },
  inputShort: { width: '100px', background: '#0a0a0a', border: '1px solid #333', padding: '0.5rem', color: '#fff', fontSize: '0.8rem' },
  select: { background: '#0a0a0a', border: '1px solid #333', color: '#888', padding: '0.5rem', fontSize: '0.7rem' },
  calcRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#888' },
  calcLabel: { letterSpacing: '0.05em' },
  calcVal: { color: '#00b0ff', fontWeight: 700, fontSize: '0.9rem' },
  submitBtn: { background: '#00b0ff', color: '#000', border: 'none', padding: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', fontSize: '0.75rem' },

  list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  card: { background: '#111', border: '1px solid #333', padding: '1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  cardSmall: { background: '#111', border: '1px solid #333', padding: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#fff' },
  cardMeta: { display: 'flex', gap: '1rem', fontSize: '0.65rem', color: '#666' },
  commitMsg: { flex: 1, fontSize: '0.8rem', color: '#ccc' },
  badge: { padding: '0.15rem 0.4rem', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.05em' },
  xpTag: { color: '#00b0ff', fontWeight: 700, marginLeft: 'auto' },
  xpTagSmall: { color: '#00b0ff', fontWeight: 600, fontSize: '0.7rem', marginLeft: 'auto' },

  footer: { textAlign: 'center', padding: '1rem', borderTop: '1px solid #222' },
  backLink: { color: '#00b0ff', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.05em' },
};
