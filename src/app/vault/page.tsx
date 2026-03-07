'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// --- Types ---
interface Trade {
  id: string;
  date: string;
  ticker: string;
  type: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
}

interface VaultData {
  balance: number;
  trades: Trade[];
  totalPnl: number;
  winRate: number;
}

const SYNC_KEY = 'bluelock_vault';
const LOCAL_KEY = 'backup_vault';
const generateId = () => Math.random().toString(36).substring(2, 9);
const getToday = () => new Date().toISOString().split('T')[0];

export default function Vault() {
  const [data, setData] = useState<VaultData>({ balance: 10000, trades: [], totalPnl: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'syncing' | 'error' | 'local'>('idle');
  
  // Form State
  const [form, setForm] = useState({ ticker: '', type: 'LONG' as 'LONG' | 'SHORT', entry: '', exit: '', size: '' });
  const [depositAmount, setDepositAmount] = useState('');
  
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Load Data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/sync?key=${SYNC_KEY}`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setSaveStatus('saved');
          localStorage.setItem(LOCAL_KEY, JSON.stringify(json.data));
        } else {
          throw new Error("Empty");
        }
      } catch (e) {
        const local = localStorage.getItem(LOCAL_KEY);
        if (local) {
          setData(JSON.parse(local));
          setSaveStatus('local');
        } else {
          // Genesis: Default $10,000 starting capital
          setData({ balance: 10000, trades: [], totalPnl: 0, winRate: 0 });
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // 2. Persistence Layer (Auto-Save)
  const saveToCloud = useCallback(async (newData: VaultData) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SYNC_KEY, payload: newData })
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus('saved');
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newData));
        setTimeout(() => setSaveStatus('syncing'), 2000);
      } else throw new Error("API");
    } catch (e) {
      setSaveStatus('error');
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newData));
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaveStatus('syncing');
    saveTimeout.current = setTimeout(() => saveToCloud(data), 1000);
    return () => { if(saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [data, loading, saveToCloud]);

  // 3. Logic: Execute Trade
  const executeTrade = () => {
    const { ticker, type, entry, exit, size } = form;
    const e = parseFloat(entry), x = parseFloat(exit), s = parseFloat(size);
    if (!ticker || isNaN(e) || isNaN(x) || isNaN(s) || s <= 0) return;

    let pnl = 0;
    if (type === 'LONG') pnl = (x - e) * s;
    if (type === 'SHORT') pnl = (e - x) * s;

    const newTrade: Trade = {
      id: generateId(),
      date: getToday(),
      ticker: ticker.toUpperCase(),
      type,
      entry: e,
      exit: x,
      size: s,
      pnl
    };

    setData(prev => {
      const newTrades = [newTrade, ...prev.trades];
      const totalPnl = newTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = newTrades.filter(t => t.pnl > 0).length;
      const winRate = newTrades.length > 0 ? (wins / newTrades.length) * 100 : 0;
      
      return { 
        ...prev, 
        trades: newTrades, 
        totalPnl, 
        winRate,
        balance: prev.balance + pnl 
      };
    });

    setForm({ ticker: '', type: 'LONG', entry: '', exit: '', size: '' });
  };

  const adjustCapital = (amount: number) => {
    setData(prev => ({ ...prev, balance: prev.balance + amount }));
    setDepositAmount('');
  };

  const deleteTrade = (id: string) => {
    setData(prev => {
      const trade = prev.trades.find(t => t.id === id);
      if (!trade) return prev;
      
      const newTrades = prev.trades.filter(t => t.id !== id);
      const totalPnl = newTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = newTrades.filter(t => t.pnl > 0).length;
      const winRate = newTrades.length > 0 ? (wins / newTrades.length) * 100 : 0;

      return {
        ...prev,
        trades: newTrades,
        totalPnl,
        winRate,
        balance: prev.balance - trade.pnl // Reverse the P/L
      };
    });
  };

  if (loading) return <main style={s.main}><div style={s.loading}>ACCESSING VAULT...</div></main>;

  return (
    <main style={s.main}>
      <header style={s.header}>
        <div style={s.title}>CORE_06: THE VAULT</div>
        <div style={s.sub}>SINGULARITY PORTFOLIO</div>
      </header>

      {/* Status Bar */}
      <div style={s.statusBar}>
        <div style={s.statusInfo}>
          <span style={{...s.dot, backgroundColor: saveStatus === 'saved' ? '#00FF41' : saveStatus === 'error' ? '#FF1744' : '#FFB000'}} />
          <span style={s.statusText}>{saveStatus === 'saved' ? 'SYNCED' : saveStatus === 'saving' ? 'SYNCING' : 'LOCAL'}</span>
        </div>
        <button onClick={() => saveToCloud(data)} style={s.syncBtn}>FORCE SYNC</button>
      </div>

      {/* Capital Metrics */}
      <div style={s.metrics}>
        <div style={s.capitalCard}>
          <span style={s.label}>EQUITY</span>
          <span style={{...s.val, color: data.balance >= 10000 ? '#00FF41' : '#FF1744'}}>${data.balance.toFixed(2)}</span>
        </div>
        <div style={s.metricRow}>
          <div style={s.metric}><span style={s.mLabel}>P/L TOTAL</span><span style={{...s.mVal, color: data.totalPnl >= 0 ? '#00FF41' : '#FF1744'}}>${data.totalPnl.toFixed(2)}</span></div>
          <div style={s.metric}><span style={s.mLabel}>WIN RATE</span><span style={s.mVal}>{data.winRate.toFixed(1)}%</span></div>
          <div style={s.metric}><span style={s.mLabel}>TRADES</span><span style={s.mVal}>{data.trades.length}</span></div>
        </div>
      </div>

      <div style={s.content}>
        {/* Trade Execution Terminal */}
        <div style={s.card}>
          <div style={s.cardHeader}>EXECUTE TRADE</div>
          <div style={s.formRow}>
            <input style={{...s.input, flex: 1}} placeholder="TICKER" value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value})} />
            <select style={s.select} value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div style={s.formRow}>
            <input style={s.input} placeholder="ENTRY" type="number" value={form.entry} onChange={e => setForm({...form, entry: e.target.value})} />
            <input style={s.input} placeholder="EXIT" type="number" value={form.exit} onChange={e => setForm({...form, exit: e.target.value})} />
            <input style={s.input} placeholder="SIZE" type="number" value={form.size} onChange={e => setForm({...form, size: e.target.value})} />
          </div>
          <button onClick={executeTrade} style={s.execBtn}>EXECUTE</button>
        </div>

        {/* Capital Injection */}
        <div style={s.card}>
          <div style={s.cardHeader}>CAPITAL INJECTION</div>
          <div style={s.formRow}>
            <input style={{...s.input, flex: 1}} placeholder="AMOUNT" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            <button onClick={() => adjustCapital(parseFloat(depositAmount))} style={s.addBtn}>DEPOSIT</button>
          </div>
        </div>

        {/* Trade Log */}
        <div style={s.logContainer}>
          <div style={s.logHeader}>TRADE LOG</div>
          {data.trades.length === 0 ? <div style={s.empty}>NO TRADE HISTORY</div> : (
            data.trades.map(t => (
              <div key={t.id} style={{...s.tradeRow, borderLeftColor: t.pnl >= 0 ? '#00FF41' : '#FF1744'}}>
                <div style={s.tradeInfo}>
                  <span style={{color:'#FFF', fontWeight:'bold'}}>{t.ticker}</span>
                  <span style={{color:'#666', fontSize:'0.7rem'}}>{t.type} {t.size}@{t.entry}</span>
                </div>
                <div style={s.tradePnl}>
                  <span style={{color: t.pnl >= 0 ? '#00FF41' : '#FF1744'}}>${t.pnl.toFixed(2)}</span>
                  <button onClick={() => deleteTrade(t.id)} style={s.delBtn}>×</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer style={s.footer}>
        <Link href="/" style={s.link}>⟵ MAINFRAME</Link>
      </footer>
    </main>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  main: { minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFF', display: 'flex', flexDirection: 'column' },
  loading: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700' },
  header: { padding: '1.5rem', textAlign: 'center', borderBottom: '2px solid #FFD700' },
  title: { fontSize: '0.9rem', fontWeight: 'bold', color: '#FFD700', letterSpacing: '0.2em' },
  sub: { fontSize: '0.7rem', color: '#666', marginTop: '0.25rem', letterSpacing: '0.1em' },
  
  statusBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: '#111', borderBottom: '1px solid #222' },
  statusInfo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  statusText: { fontSize: '0.7rem', color: '#888' },
  syncBtn: { background: 'transparent', border: '1px solid #333', color: '#FFF', padding: '0.25rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer' },

  metrics: { padding: '1rem', backgroundColor: '#0A0A0A' },
  capitalCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' },
  label: { fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em' },
  val: { fontSize: '2.5rem', fontWeight: 'bold' },
  metricRow: { display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #222', paddingTop: '1rem' },
  metric: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  mLabel: { fontSize: '0.6rem', color: '#666' },
  mVal: { fontSize: '1rem', fontWeight: 'bold', color: '#FFF' },

  content: { flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' },
  card: { backgroundColor: '#111', border: '1px solid #222', padding: '1rem' },
  cardHeader: { fontSize: '0.7rem', color: '#FFD700', letterSpacing: '0.1em', marginBottom: '0.75rem' },
  formRow: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' },
  input: { background: '#0A0A0A', border: '1px solid #333', color: '#FFF', padding: '0.5rem', flex: 1 },
  select: { background: '#0A0A0A', border: '1px solid #333', color: '#FFF', padding: '0.5rem' },
  execBtn: { width: '100%', padding: '0.75rem', background: '#FFD700', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' },
  addBtn: { padding: '0.5rem 1rem', background: '#222', border: '1px solid #333', color: '#FFF', cursor: 'pointer' },
  
  logContainer: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  logHeader: { fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em' },
  empty: { textAlign: 'center', color: '#444', padding: '2rem', fontSize: '0.8rem' },
  tradeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '0.75rem', borderLeft: '3px solid' },
  tradeInfo: { display: 'flex', flexDirection: 'column' },
  tradePnl: { display: 'flex', alignItems: 'center', gap: '1rem' },
  delBtn: { background: 'none', border: 'none', color: '#FF1744', cursor: 'pointer', fontSize: '1rem' },
  
  footer: { textAlign: 'center', padding: '1rem', borderTop: '1px solid #222' },
  link: { color: '#00F0FF', textDecoration: 'none', fontSize: '0.8rem' },
};
