'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type View = 'gate' | 'mainframe' | 'threat' | 'biological' | 'overclock' | 'visage' | 'aura' | 'vault' | 'neural' | 'architecture' | 'chessboard';

interface TradingViewTab {
  id: string;
  title: string;
  symbol: string;
  interval: string;
  indicators: string;
}

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
  tabs: TradingViewTab[];
  trades: Trade[];
  balance: number;
  totalPnl: number;
  winRate: number;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CORRECT_PASSWORD = 'bluelock';
const SESSION_KEY = 'bluelock_session';

const CORES = [
  { id: 'threat', name: 'THREAT ENGINE', sub: 'Academics', color: '#FF1744' },
  { id: 'biological', name: 'BIOLOGICAL LEDGER', sub: 'Iron/Plyometrics', color: '#00FF7F' },
  { id: 'overclock', name: 'OVERCLOCK', sub: 'Sleep/Recovery', color: '#2979FF' },
  { id: 'visage', name: 'VISAGE', sub: 'Looksmax', color: '#D500F9' },
  { id: 'aura', name: 'AURA', sub: 'Style/Presence', color: '#00E5FF' },
  { id: 'vault', name: 'THE VAULT', sub: 'Portfolio', color: '#FFD700' },
  { id: 'neural', name: 'NEURAL LINK', sub: 'Psych/Anime', color: '#651FFF' },
  { id: 'architecture', name: 'ARCHITECTURE', sub: 'Coding', color: '#00B0FF' },
  { id: 'chessboard', name: 'CHESSBOARD', sub: 'Social Map', color: '#FFAB00' },
];

const DEFAULT_TABS: TradingViewTab[] = [
  { id: '1', title: 'SPY', symbol: 'AMEX:SPY', interval: 'D', indicators: '' },
  { id: '2', title: 'QQQ', symbol: 'NASDAQ:QQQ', interval: 'D', indicators: '' },
  { id: '3', title: 'AAPL', symbol: 'NASDAQ:AAPL', interval: 'D', indicators: '' },
  { id: '4', title: 'TSLA', symbol: 'NASDAQ:TSLA', interval: 'D', indicators: '' },
  { id: '5', title: 'NVDA', symbol: 'NASDAQ:NVDA', interval: 'D', indicators: '' },
  { id: '6', title: 'BTC', symbol: 'BINANCE:BTCUSDT', interval: 'D', indicators: '' },
  { id: '7', title: 'ETH', symbol: 'BINANCE:ETHUSDT', interval: 'D', indicators: '' },
  { id: '8', title: 'META', symbol: 'NASDAQ:META', interval: 'D', indicators: '' },
  { id: '9', title: 'AMZN', symbol: 'NASDAQ:AMZN', interval: 'D', indicators: '' },
  { id: '10', title: 'GOOGL', symbol: 'NASDAQ:GOOGL', interval: 'D', indicators: '' },
];

// ═══════════════════════════════════════════════════════════════
// TRADINGVIEW WIDGET COMPONENT
// ═══════════════════════════════════════════════════════════════

declare global {
  interface Window {
    TradingView: any;
  }
}

function TradingViewWidget({ symbol, interval }: { symbol: string; interval: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    const containerId = `tv_${symbol.replace(':', '_')}_${Date.now()}`;
    const containerDiv = document.createElement('div');
    containerDiv.id = containerId;
    containerDiv.style.width = '100%';
    containerDiv.style.height = '100%';
    containerRef.current.appendChild(containerDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval,
          timezone: 'America/New_York',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0A0A0A',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          backgroundColor: '#0A0A0A',
          gridColor: '#1A1A1A',
          overrides: {
            'paneProperties.background': '#0A0A0A',
            'paneProperties.vertGridProperties.color': '#1A1A1A',
            'paneProperties.horzGridProperties.color': '#1A1A1A',
          },
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (widgetRef.current) {
        widgetRef.current = null;
      }
    };
  }, [symbol, interval]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        backgroundColor: '#0A0A0A',
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// VAULT COMPONENT (WITH TRADINGVIEW TABS)
// ═══════════════════════════════════════════════════════════════

function VaultModule({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<VaultData>({
    tabs: DEFAULT_TABS,
    trades: [],
    balance: 10000,
    totalPnl: 0,
    winRate: 0,
  });
  const [activeTab, setActiveTab] = useState('1');
  const [editTab, setEditTab] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', symbol: '', interval: 'D' });
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeForm, setTradeForm] = useState({
    ticker: '',
    type: 'LONG' as 'LONG' | 'SHORT',
    entry: '',
    exit: '',
    size: '',
  });

  const currentTab = data.tabs.find(t => t.id === activeTab) || data.tabs[0];

  const updateTab = (id: string, updates: Partial<TradingViewTab>) => {
    setData(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const startEditTab = (tab: TradingViewTab) => {
    setEditTab(tab.id);
    setEditForm({ title: tab.title, symbol: tab.symbol, interval: tab.interval });
  };

  const saveEditTab = () => {
    if (editTab) {
      updateTab(editTab, editForm);
      setEditTab(null);
    }
  };

  const executeTrade = () => {
    const { ticker, type, entry, exit, size } = tradeForm;
    const e = parseFloat(entry);
    const x = parseFloat(exit);
    const s = parseFloat(size);

    if (!ticker || isNaN(e) || isNaN(x) || isNaN(s)) return;

    let pnl = type === 'LONG' ? (x - e) * s : (e - x) * s;

    const newTrade: Trade = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      ticker: ticker.toUpperCase(),
      type,
      entry: e,
      exit: x,
      size: s,
      pnl,
    };

    setData(prev => {
      const newTrades = [newTrade, ...prev.trades];
      const wins = newTrades.filter(t => t.pnl > 0).length;
      return {
        ...prev,
        trades: newTrades,
        totalPnl: newTrades.reduce((sum, t) => sum + t.pnl, 0),
        winRate: newTrades.length > 0 ? (wins / newTrades.length) * 100 : 0,
        balance: prev.balance + pnl,
      };
    });

    setTradeForm({ ticker: '', type: 'LONG', entry: '', exit: '', size: '' });
    setShowTradeForm(false);
  };

  const deleteTrade = (id: string) => {
    setData(prev => {
      const trade = prev.trades.find(t => t.id === id);
      if (!trade) return prev;
      const newTrades = prev.trades.filter(t => t.id !== id);
      const wins = newTrades.filter(t => t.pnl > 0).length;
      return {
        ...prev,
        trades: newTrades,
        totalPnl: newTrades.reduce((sum, t) => sum + t.pnl, 0),
        winRate: newTrades.length > 0 ? (wins / newTrades.length) * 100 : 0,
        balance: prev.balance - trade.pnl,
      };
    });
  };

  return (
    <div style={s.module}>
      {/* Header */}
      <header style={{ ...s.moduleHeader, borderBottomColor: '#FFD700' }}>
        <button onClick={onBack} style={s.backBtn}>⟵</button>
        <div style={s.moduleTitleWrap}>
          <div style={{ ...s.moduleTitle, color: '#FFD700' }}>THE VAULT</div>
          <div style={s.moduleSub}>TRADING TERMINAL</div>
        </div>
        <div style={s.balance}>
          <span style={s.balanceLabel}>EQUITY</span>
          <span style={{ ...s.balanceVal, color: data.balance >= 10000 ? '#00FF7F' : '#FF1744' }}>
            ${data.balance.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Tab Bar */}
      <div style={s.tabBar}>
        <div style={s.tabList}>
          {data.tabs.map((tab, i) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => startEditTab(tab)}
              style={{
                ...s.tab,
                borderBottomColor: activeTab === tab.id ? '#FFD700' : 'transparent',
                color: activeTab === tab.id ? '#FFD700' : '#666',
              }}
            >
              <span style={s.tabNum}>{i + 1}</span>
              <span>{tab.title}</span>
            </div>
          ))}
        </div>
        <div style={s.tabActions}>
          <button onClick={() => setShowTradeForm(!showTradeForm)} style={s.tradeBtn}>
            {showTradeForm ? 'CANCEL' : '+ TRADE'}
          </button>
        </div>
      </div>

      {/* Edit Tab Modal */}
      {editTab && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <div style={s.modalTitle}>EDIT TAB</div>
            <input
              placeholder="TITLE"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              style={s.modalInput}
            />
            <input
              placeholder="SYMBOL (e.g. NASDAQ:AAPL)"
              value={editForm.symbol}
              onChange={e => setEditForm({ ...editForm, symbol: e.target.value })}
              style={s.modalInput}
            />
            <select
              value={editForm.interval}
              onChange={e => setEditForm({ ...editForm, interval: e.target.value })}
              style={s.modalSelect}
            >
              <option value="1">1m</option>
              <option value="5">5m</option>
              <option value="15">15m</option>
              <option value="60">1H</option>
              <option value="240">4H</option>
              <option value="D">Daily</option>
              <option value="W">Weekly</option>
            </select>
            <div style={s.modalActions}>
              <button onClick={() => setEditTab(null)} style={s.modalCancel}>CANCEL</button>
              <button onClick={saveEditTab} style={s.modalSave}>SAVE</button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Form */}
      {showTradeForm && (
        <div style={s.tradeForm}>
          <div style={s.tradeFormRow}>
            <input
              placeholder="TICKER"
              value={tradeForm.ticker}
              onChange={e => setTradeForm({ ...tradeForm, ticker: e.target.value })}
              style={{ ...s.tradeInput, flex: 1 }}
            />
            <select
              value={tradeForm.type}
              onChange={e => setTradeForm({ ...tradeForm, type: e.target.value as any })}
              style={s.tradeSelect}
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div style={s.tradeFormRow}>
            <input
              placeholder="ENTRY"
              type="number"
              value={tradeForm.entry}
              onChange={e => setTradeForm({ ...tradeForm, entry: e.target.value })}
              style={s.tradeInput}
            />
            <input
              placeholder="EXIT"
              type="number"
              value={tradeForm.exit}
              onChange={e => setTradeForm({ ...tradeForm, exit: e.target.value })}
              style={s.tradeInput}
            />
            <input
              placeholder="SIZE"
              type="number"
              value={tradeForm.size}
              onChange={e => setTradeForm({ ...tradeForm, size: e.target.value })}
              style={s.tradeInput}
            />
          </div>
          <button onClick={executeTrade} style={s.execBtn}>EXECUTE TRADE</button>
        </div>
      )}

      {/* Chart Area */}
      <div style={s.chartArea}>
        <TradingViewWidget symbol={currentTab.symbol} interval={currentTab.interval} />
      </div>

      {/* Bottom Stats */}
      <div style={s.statsBar}>
        <div style={s.stat}>
          <span style={s.statLabel}>P/L</span>
          <span style={{ ...s.statVal, color: data.totalPnl >= 0 ? '#00FF7F' : '#FF1744' }}>
            ${data.totalPnl.toFixed(2)}
          </span>
        </div>
        <div style={s.stat}>
          <span style={s.statLabel}>WIN RATE</span>
          <span style={s.statVal}>{data.winRate.toFixed(1)}%</span>
        </div>
        <div style={s.stat}>
          <span style={s.statLabel}>TRADES</span>
          <span style={s.statVal}>{data.trades.length}</span>
        </div>
      </div>

      {/* Trade Log (Collapsible) */}
      {data.trades.length > 0 && (
        <div style={s.tradeLog}>
          <div style={s.tradeLogHeader}>RECENT TRADES</div>
          {data.trades.slice(0, 5).map(t => (
            <div key={t.id} style={{ ...s.tradeRow, borderLeftColor: t.pnl >= 0 ? '#00FF7F' : '#FF1744' }}>
              <span style={{ fontWeight: 'bold' }}>{t.ticker}</span>
              <span style={{ color: '#666', fontSize: '0.7rem' }}>{t.type} {t.size}@{t.entry}</span>
              <span style={{ color: t.pnl >= 0 ? '#00FF7F' : '#FF1744' }}>
                {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
              </span>
              <button onClick={() => deleteTrade(t.id)} style={s.delBtn}>×</button>
            </div>
          ))}
        </div>
      )}

      <footer style={s.footer}>
        <span style={{ color: '#444' }}>DOUBLE-CLICK TAB TO EDIT</span>
        <span style={{ color: '#666' }}>|</span>
        <span style={{ color: '#444' }}>KEYS 1-9 TO SWITCH</span>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PLACEHOLDER MODULE
// ═══════════════════════════════════════════════════════════════

function PlaceholderModule({ 
  id, 
  name, 
  sub, 
  color, 
  onBack 
}: { 
  id: string; 
  name: string; 
  sub: string; 
  color: string; 
  onBack: () => void;
}) {
  return (
    <div style={s.module}>
      <header style={{ ...s.moduleHeader, borderBottomColor: color }}>
        <button onClick={onBack} style={s.backBtn}>⟵</button>
        <div style={s.moduleTitleWrap}>
          <div style={{ ...s.moduleTitle, color }}>{name}</div>
          <div style={s.moduleSub}>{sub}</div>
        </div>
      </header>
      <div style={s.placeholder}>
        <div style={s.placeholderIcon}>◆</div>
        <div style={s.placeholderText}>SYSTEM INITIALIZING</div>
        <div style={s.placeholderSub}>Module under construction</div>
      </div>
      <footer style={s.footer}>
        <span style={{ color: '#333' }}>IN DEVELOPMENT</span>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD GATE
// ═══════════════════════════════════════════════════════════════

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === CORRECT_PASSWORD) {
      localStorage.setItem(SESSION_KEY, 'authenticated');
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword('');
    }
  };

  return (
    <div style={s.gate}>
      <div style={s.gridOverlay} />
      <div style={s.scanLine} />
      <div style={{ ...s.gateCard, animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}>
        <div style={s.logo}>
          <span style={s.logoText}>BL</span>
        </div>
        <h1 style={s.gateTitle}>BLUE LOCK TERMINAL</h1>
        <p style={s.gateSubtitle}>AUTHENTICATION REQUIRED</p>
        <form onSubmit={handleSubmit} style={s.form}>
          <input
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="ENTER PASSWORD"
            autoFocus
            style={{ ...s.passwordInput, borderColor: error ? '#FF1744' : '#333' }}
          />
          <button type="submit" style={s.submitBtn}>ACCESS</button>
        </form>
        {error && <p style={s.errorText}>ACCESS DENIED</p>}
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes scan {
          0% { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAINFRAME
// ═══════════════════════════════════════════════════════════════

function Mainframe({ onSelectModule, onLogout }: { 
  onSelectModule: (id: View) => void; 
  onLogout: () => void;
}) {
  return (
    <div style={s.mainframe}>
      <header style={s.mainHeader}>
        <div style={s.logo}>
          <span style={s.logoText}>BL</span>
        </div>
        <div style={s.mainTitle}>BLUE LOCK MAINFRAME</div>
        <div style={s.mainSub}>SELECT YOUR WEAPON</div>
      </header>
      <div style={s.grid}>
        {CORES.map(core => (
          <div
            key={core.id}
            onClick={() => onSelectModule(core.id as View)}
            style={{ ...s.coreCard, borderColor: core.color }}
          >
            <div style={{ ...s.coreName, color: core.color }}>{core.name}</div>
            <div style={s.coreSub}>{core.sub}</div>
            <div style={s.coreId}>{core.id.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <footer style={s.mainFooter}>
        <div>EVOLVE OR DISAPPEAR.</div>
        <button onClick={onLogout} style={s.logoutBtn}>[LOCK TERMINAL]</button>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [view, setView] = useState<View>('gate');
  const [mounted, setMounted] = useState(false);

  // Check session on mount
  useEffect(() => {
    const checkSession = () => {
      const session = localStorage.getItem(SESSION_KEY);
      if (session === 'authenticated') {
        setView('mainframe');
      }
      setMounted(true);
    };
    // Use microtask to avoid synchronous setState
    Promise.resolve().then(checkSession);
  }, []);

  // Keyboard shortcuts for tab switching in vault
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // This will be handled inside VaultModule
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setView('gate');
  }, []);

  if (!mounted) {
    return <div style={s.loading}>INITIALIZING...</div>;
  }

  if (view === 'gate') {
    return <PasswordGate onUnlock={() => setView('mainframe')} />;
  }

  if (view === 'mainframe') {
    return (
      <Mainframe 
        onSelectModule={setView} 
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'vault') {
    return <VaultModule onBack={() => setView('mainframe')} />;
  }

  // Placeholder modules
  const core = CORES.find(c => c.id === view);
  if (core) {
    return (
      <PlaceholderModule
        id={core.id}
        name={core.name}
        sub={core.sub}
        color={core.color}
        onBack={() => setView('mainframe')}
      />
    );
  }

  return <div>Unknown view</div>;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const s: Record<string, React.CSSProperties> = {
  // Loading
  loading: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#00F0FF',
    fontSize: '0.8rem',
    letterSpacing: '0.3em',
  },

  // Gate
  gate: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)',
    animation: 'scan 3s linear infinite',
  },
  gateCard: {
    backgroundColor: '#111',
    border: '1px solid #00F0FF',
    padding: '3rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    zIndex: 1,
    minWidth: '320px',
    maxWidth: '90vw',
  },
  logo: {
    width: '80px',
    height: '80px',
    border: '3px solid #00F0FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#00F0FF',
    textShadow: '0 0 20px #00F0FF',
  },
  gateTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '0.2em',
    textAlign: 'center',
  },
  gateSubtitle: {
    fontSize: '0.7rem',
    color: '#666',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
  },
  passwordInput: {
    background: '#0A0A0A',
    border: '2px solid #333',
    color: '#00FF41',
    padding: '1rem',
    fontSize: '1rem',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: '0.3em',
    outline: 'none',
  },
  submitBtn: {
    background: '#00F0FF',
    color: '#000',
    border: 'none',
    padding: '1rem',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    letterSpacing: '0.2em',
    cursor: 'pointer',
  },
  errorText: {
    color: '#FF1744',
    fontSize: '0.8rem',
    letterSpacing: '0.2em',
    textShadow: '0 0 10px #FF1744',
  },

  // Mainframe
  mainframe: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  mainHeader: {
    padding: '2rem 1rem 1rem 1rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  mainTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '0.2em',
    marginTop: '0.5rem',
  },
  mainSub: {
    fontSize: '0.7rem',
    color: '#666',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    padding: '1rem',
    width: '100%',
    maxWidth: '600px',
  },
  coreCard: {
    backgroundColor: '#111',
    border: '2px solid #333',
    padding: '1rem 0.5rem',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  coreName: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    lineHeight: 1.1,
  },
  coreSub: {
    fontSize: '0.55rem',
    color: '#666',
    textTransform: 'uppercase',
  },
  coreId: {
    fontSize: '0.45rem',
    color: '#333',
    marginTop: '0.5rem',
  },
  mainFooter: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '0.7rem',
    color: '#333',
    letterSpacing: '0.1em',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: 'auto',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#666',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.7rem',
  },

  // Module Base
  module: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFF',
    display: 'flex',
    flexDirection: 'column',
  },
  moduleHeader: {
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    borderBottom: '2px solid',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#00F0FF',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  moduleTitleWrap: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    letterSpacing: '0.2em',
  },
  moduleSub: {
    fontSize: '0.65rem',
    color: '#666',
    marginTop: '0.25rem',
  },
  balance: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: '0.6rem',
    color: '#666',
  },
  balanceVal: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    padding: '1rem',
    borderTop: '1px solid #222',
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
  },

  // Vault - Tabs
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderBottom: '1px solid #222',
    overflow: 'hidden',
  },
  tabList: {
    display: 'flex',
    flex: 1,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    borderBottom: '2px solid',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  tabNum: {
    fontSize: '0.6rem',
    color: '#444',
    fontFamily: 'monospace',
  },
  tabActions: {
    padding: '0.5rem',
    borderLeft: '1px solid #222',
  },
  tradeBtn: {
    background: 'transparent',
    border: '1px solid #FFD700',
    color: '#FFD700',
    padding: '0.5rem 1rem',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  // Vault - Chart
  chartArea: {
    flex: 1,
    minHeight: '400px',
    maxHeight: '500px',
    position: 'relative',
  },

  // Vault - Stats
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '1rem',
    backgroundColor: '#050505',
    borderTop: '1px solid #222',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  statLabel: {
    fontSize: '0.6rem',
    color: '#666',
  },
  statVal: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#FFF',
  },

  // Vault - Trade Form
  tradeForm: {
    backgroundColor: '#111',
    padding: '1rem',
    borderBottom: '1px solid #FFD700',
  },
  tradeFormRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  tradeInput: {
    background: '#0A0A0A',
    border: '1px solid #333',
    color: '#FFF',
    padding: '0.75rem',
    flex: 1,
    fontSize: '0.85rem',
  },
  tradeSelect: {
    background: '#0A0A0A',
    border: '1px solid #333',
    color: '#FFF',
    padding: '0.75rem',
    fontSize: '0.85rem',
  },
  execBtn: {
    width: '100%',
    padding: '0.75rem',
    background: '#FFD700',
    color: '#000',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },

  // Vault - Trade Log
  tradeLog: {
    backgroundColor: '#050505',
    padding: '0.5rem 1rem',
    maxHeight: '150px',
    overflowY: 'auto',
  },
  tradeLogHeader: {
    fontSize: '0.65rem',
    color: '#666',
    marginBottom: '0.5rem',
  },
  tradeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem',
    backgroundColor: '#111',
    marginBottom: '0.25rem',
    borderLeft: '3px solid',
    fontSize: '0.8rem',
  },
  delBtn: {
    background: 'none',
    border: 'none',
    color: '#FF1744',
    cursor: 'pointer',
    fontSize: '1rem',
    marginLeft: 'auto',
  },

  // Vault - Modal
  modal: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#111',
    border: '1px solid #FFD700',
    padding: '1.5rem',
    width: '90%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalTitle: {
    fontSize: '0.8rem',
    color: '#FFD700',
    letterSpacing: '0.2em',
  },
  modalInput: {
    background: '#0A0A0A',
    border: '1px solid #333',
    color: '#FFF',
    padding: '0.75rem',
    fontSize: '0.9rem',
  },
  modalSelect: {
    background: '#0A0A0A',
    border: '1px solid #333',
    color: '#FFF',
    padding: '0.75rem',
    fontSize: '0.9rem',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  modalCancel: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #333',
    color: '#666',
    padding: '0.75rem',
    cursor: 'pointer',
  },
  modalSave: {
    flex: 1,
    background: '#FFD700',
    border: 'none',
    color: '#000',
    padding: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  // Placeholder
  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '2rem',
  },
  placeholderIcon: {
    fontSize: '3rem',
    color: '#222',
  },
  placeholderText: {
    fontSize: '0.9rem',
    color: '#444',
    letterSpacing: '0.2em',
  },
  placeholderSub: {
    fontSize: '0.7rem',
    color: '#333',
  },
};
