'use client';

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// BLUE LOCK TERMINAL - TYPES
// ═══════════════════════════════════════════════════════════════

interface EgoEntry {
  id: string;
  date: string;
  score: number;
  label: string;
  notes: string;
}

interface TradeEntry {
  id: string;
  date: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  result: 'WIN' | 'LOSS' | 'BREAKEVEN';
  pnl: number;
  notes: string;
}

interface DrillEntry {
  id: string;
  date: string;
  weapon: string;
  intensity: number;
  category: 'TRADING' | 'FITNESS' | 'SKILL' | 'MINDSET';
}

interface Settings {
  startingCapital: number;
  targetCapital: number;
  weeklyInjection: number;
  currentCapital: number;
}

// ═══════════════════════════════════════════════════════════════
// EGO LABEL LOGIC
// ═══════════════════════════════════════════════════════════════

function getEgoLabel(score: number): string {
  if (score <= 20) return 'DONKEY';
  if (score <= 40) return 'HALF-BAKED';
  if (score <= 55) return 'PUPPET';
  if (score <= 70) return 'HUNGRY';
  if (score <= 85) return 'EGOIST';
  if (score <= 95) return 'MONSTER';
  return 'DEVOUR';
}

function getEgoColor(score: number): string {
  if (score <= 20) return '#8B0000';
  if (score <= 40) return '#CD853F';
  if (score <= 55) return '#808080';
  if (score <= 70) return '#FF8C00';
  if (score <= 85) return '#00F0FF';
  if (score <= 95) return '#00FF7F';
  return '#FFD700';
}

// ═══════════════════════════════════════════════════════════════
// STORAGE UTILITIES
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  egoEntries: 'bluelock_ego',
  tradeEntries: 'bluelock_trades',
  drillEntries: 'bluelock_drills',
  settings: 'bluelock_settings',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

type Page = 'dashboard' | 'ego' | 'trades' | 'drills' | 'stats' | 'settings';

export default function BlueLockTerminal() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [egoEntries, setEgoEntries] = useState<EgoEntry[]>([]);
  const [tradeEntries, setTradeEntries] = useState<TradeEntry[]>([]);
  const [drillEntries, setDrillEntries] = useState<DrillEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({
    startingCapital: 4705,
    targetCapital: 10000,
    weeklyInjection: 60,
    currentCapital: 4705,
  });
  const [loaded, setLoaded] = useState(false);

  // Load data on mount - use lazy initialization pattern
  useEffect(() => {
    const ego = loadFromStorage(STORAGE_KEYS.egoEntries, [] as EgoEntry[]);
    const trades = loadFromStorage(STORAGE_KEYS.tradeEntries, [] as TradeEntry[]);
    const drills = loadFromStorage(STORAGE_KEYS.drillEntries, [] as DrillEntry[]);
    const storedSettings = loadFromStorage(STORAGE_KEYS.settings, {
      startingCapital: 4705,
      targetCapital: 10000,
      weeklyInjection: 60,
      currentCapital: 4705,
    } as Settings);
    
    // Batch updates using requestAnimationFrame to avoid cascading renders
    requestAnimationFrame(() => {
      setEgoEntries(ego);
      setTradeEntries(trades);
      setDrillEntries(drills);
      setSettings(storedSettings);
      setLoaded(true);
    });
  }, []);

  // Save data on change - memoized to prevent unnecessary saves
  const saveEgo = useCallback(() => {
    if (loaded) saveToStorage(STORAGE_KEYS.egoEntries, egoEntries);
  }, [egoEntries, loaded]);
  
  const saveTrades = useCallback(() => {
    if (loaded) saveToStorage(STORAGE_KEYS.tradeEntries, tradeEntries);
  }, [tradeEntries, loaded]);
  
  const saveDrills = useCallback(() => {
    if (loaded) saveToStorage(STORAGE_KEYS.drillEntries, drillEntries);
  }, [drillEntries, loaded]);
  
  const saveSettings = useCallback(() => {
    if (loaded) saveToStorage(STORAGE_KEYS.settings, settings);
  }, [settings, loaded]);

  useEffect(() => { saveEgo(); }, [saveEgo]);
  useEffect(() => { saveTrades(); }, [saveTrades]);
  useEffect(() => { saveDrills(); }, [saveDrills]);
  useEffect(() => { saveSettings(); }, [saveSettings]);

  // Calculate stats
  const latestEgo = egoEntries.length > 0 ? egoEntries[egoEntries.length - 1] : null;
  const previousEgo = egoEntries.length > 1 ? egoEntries[egoEntries.length - 2] : null;
  const egoTrend = latestEgo && previousEgo ? latestEgo.score - previousEgo.score : 0;

  const winRate = tradeEntries.length > 0 
    ? Math.round((tradeEntries.filter(t => t.result === 'WIN').length / tradeEntries.length) * 100) 
    : 0;

  const totalPnl = tradeEntries.reduce((sum, t) => sum + t.pnl, 0);

  const streak = (() => {
    let count = 0;
    for (let i = drillEntries.length - 1; i >= 0; i--) {
      if (drillEntries[i].intensity >= 5) count++;
      else break;
    }
    return count;
  })();

  const progressPercent = Math.min(100, Math.max(0, 
    ((settings.currentCapital - settings.startingCapital) / (settings.targetCapital - settings.startingCapital)) * 100
  ));

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTitle}>══════════ BLUE LOCK TERMINAL ══════════</div>
        <div style={styles.headerSubtitle}>DEVOUR OR BE DEVOURED</div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        {(['dashboard', 'ego', 'trades', 'drills', 'stats', 'settings'] as Page[]).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              ...styles.navButton,
              ...(currentPage === page ? styles.navButtonActive : {}),
            }}
          >
            {page.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div style={styles.content}>
        {!loaded ? (
          <div style={styles.loading}>INITIALIZING...</div>
        ) : (
          <>
            {currentPage === 'dashboard' && (
              <Dashboard
                latestEgo={latestEgo}
                egoTrend={egoTrend}
                settings={settings}
                progressPercent={progressPercent}
                streak={streak}
                tradeCount={tradeEntries.length}
                winRate={winRate}
              />
            )}
            {currentPage === 'ego' && (
              <EgoLog
                entries={egoEntries}
                onAdd={(entry) => setEgoEntries([...egoEntries, entry])}
              />
            )}
            {currentPage === 'trades' && (
              <TradeLog
                entries={tradeEntries}
                onAdd={(entry) => setTradeEntries([...tradeEntries, entry])}
                winRate={winRate}
                totalPnl={totalPnl}
              />
            )}
            {currentPage === 'drills' && (
              <WeaponDrills
                entries={drillEntries}
                onAdd={(entry) => setDrillEntries([...drillEntries, entry])}
                streak={streak}
              />
            )}
            {currentPage === 'stats' && (
              <Stats
                egoEntries={egoEntries}
                tradeEntries={tradeEntries}
                drillEntries={drillEntries}
                settings={settings}
              />
            )}
            {currentPage === 'settings' && (
              <SettingsPage
                settings={settings}
                onUpdate={setSettings}
                onReset={() => {
                  setEgoEntries([]);
                  setTradeEntries([]);
                  setDrillEntries([]);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        THE FIELD IS YOURS.
      </footer>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

function Dashboard({
  latestEgo,
  egoTrend,
  settings,
  progressPercent,
  streak,
  tradeCount,
  winRate,
}: {
  latestEgo: EgoEntry | null;
  egoTrend: number;
  settings: Settings;
  progressPercent: number;
  streak: number;
  tradeCount: number;
  winRate: number;
}) {
  return (
    <div style={styles.page}>
      {/* EGO STATUS */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>EGO STATUS</div>
        <div style={styles.card}>
          <div style={styles.egoScore}>
            <span style={{ ...styles.egoNumber, color: latestEgo ? getEgoColor(latestEgo.score) : '#666' }}>
              {latestEgo ? latestEgo.score : '--'}
            </span>
            <span style={styles.egoPercent}>%</span>
          </div>
          <div style={{ ...styles.egoLabel, color: latestEgo ? getEgoColor(latestEgo.score) : '#666' }}>
            {latestEgo ? latestEgo.label : 'NO DATA'}
          </div>
          <div style={styles.egoTrend}>
            {egoTrend !== 0 && (
              <span style={{ color: egoTrend > 0 ? '#00FF7F' : '#FF1744' }}>
                {egoTrend > 0 ? '▲' : '▼'} {Math.abs(egoTrend)}% from last entry
              </span>
            )}
          </div>
          {/* EGO Bar */}
          <div style={styles.barContainer}>
            <div 
              style={{
                ...styles.barFill,
                width: `${latestEgo?.score || 0}%`,
                backgroundColor: latestEgo ? getEgoColor(latestEgo.score) : '#333',
              }}
            />
          </div>
        </div>
      </section>

      {/* $10K MISSION */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>$10K MISSION</div>
        <div style={styles.card}>
          <div style={styles.progressHeader}>
            <span>PROGRESS</span>
            <span style={{ color: '#00F0FF' }}>{progressPercent.toFixed(1)}%</span>
          </div>
          <div style={styles.barContainer}>
            <div 
              style={{
                ...styles.barFill,
                width: `${progressPercent}%`,
                backgroundColor: '#00F0FF',
              }}
            />
          </div>
          <div style={styles.progressStats}>
            <div style={styles.progressStat}>
              <span style={styles.progressLabel}>CURRENT</span>
              <span style={styles.progressValue}>${settings.currentCapital.toLocaleString()}</span>
            </div>
            <div style={styles.progressStat}>
              <span style={styles.progressLabel}>TARGET</span>
              <span style={styles.progressValue}>${settings.targetCapital.toLocaleString()}</span>
            </div>
            <div style={styles.progressStat}>
              <span style={styles.progressLabel}>REMAINING</span>
              <span style={{ ...styles.progressValue, color: '#FFD700' }}>
                ${(settings.targetCapital - settings.currentCapital).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY'S STATS */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>TODAY&apos;S STATS</div>
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{streak}</div>
            <div style={styles.statLabel}>STREAK</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{tradeCount}</div>
            <div style={styles.statLabel}>TRADES</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{winRate}%</div>
            <div style={styles.statLabel}>WIN RATE</div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section style={styles.section}>
        <div style={styles.quickActions}>
          <div style={styles.motto}>
            &quot;THE MOMENT YOU&apos;RE SATISFIED IS THE MOMENT YOU LOSE.&quot;
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EGO LOG COMPONENT
// ═══════════════════════════════════════════════════════════════

function EgoLog({
  entries,
  onAdd,
}: {
  entries: EgoEntry[];
  onAdd: (entry: EgoEntry) => void;
}) {
  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const entry: EgoEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score,
      label: getEgoLabel(score),
      notes,
    };
    onAdd(entry);
    setScore(50);
    setNotes('');
  };

  return (
    <div style={styles.page}>
      <section style={styles.section}>
        <div style={styles.sectionTitle}>LOG EGO</div>
        <div style={styles.card}>
          {/* Slider */}
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}>
              <span>EGO LEVEL</span>
              <span style={{ ...styles.egoNumber, color: getEgoColor(score) }}>{score}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              style={styles.slider}
            />
            <div style={{ ...styles.egoLabel, color: getEgoColor(score), fontSize: '1.5rem' }}>
              {getEgoLabel(score)}
            </div>
          </div>

          {/* Label Reference */}
          <div style={styles.labelReference}>
            <div style={styles.labelRow}><span style={{ color: '#8B0000' }}>■</span> 0-20: DONKEY</div>
            <div style={styles.labelRow}><span style={{ color: '#CD853F' }}>■</span> 21-40: HALF-BAKED</div>
            <div style={styles.labelRow}><span style={{ color: '#808080' }}>■</span> 41-55: PUPPET</div>
            <div style={styles.labelRow}><span style={{ color: '#FF8C00' }}>■</span> 56-70: HUNGRY</div>
            <div style={styles.labelRow}><span style={{ color: '#00F0FF' }}>■</span> 71-85: EGOIST</div>
            <div style={styles.labelRow}><span style={{ color: '#00FF7F' }}>■</span> 86-95: MONSTER</div>
            <div style={styles.labelRow}><span style={{ color: '#FFD700' }}>■</span> 96-100: DEVOUR</div>
          </div>

          {/* Notes */}
          <textarea
            placeholder="What did you DEVOUR today?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.textarea}
          />

          {/* Submit */}
          <button onClick={handleSubmit} style={styles.submitButton}>
            LOG EGO
          </button>
        </div>
      </section>

      {/* History */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>RECENT ENTRIES</div>
        <div style={styles.card}>
          {entries.length === 0 ? (
            <div style={styles.emptyState}>NO ENTRIES YET. START TRACKING.</div>
          ) : (
            [...entries].reverse().slice(0, 7).map((entry) => (
              <div key={entry.id} style={styles.historyItem}>
                <div style={styles.historyHeader}>
                  <span style={{ color: getEgoColor(entry.score), fontWeight: 'bold' }}>
                    {entry.score}% - {entry.label}
                  </span>
                  <span style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
                {entry.notes && <div style={styles.historyNotes}>{entry.notes}</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRADE LOG COMPONENT
// ═══════════════════════════════════════════════════════════════

function TradeLog({
  entries,
  onAdd,
  winRate,
  totalPnl,
}: {
  entries: TradeEntry[];
  onAdd: (entry: TradeEntry) => void;
  winRate: number;
  totalPnl: number;
}) {
  const [ticker, setTicker] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [shares, setShares] = useState('1');
  const [result, setResult] = useState<'WIN' | 'LOSS' | 'BREAKEVEN'>('WIN');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const entryP = parseFloat(entryPrice) || 0;
    const exitP = parseFloat(exitPrice) || 0;
    const sh = parseInt(shares) || 1;
    const pnl = (exitP - entryP) * sh;

    const entry: TradeEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ticker: ticker.toUpperCase(),
      entryPrice: entryP,
      exitPrice: exitP,
      shares: sh,
      result,
      pnl,
      notes,
    };
    onAdd(entry);
    setTicker('');
    setEntryPrice('');
    setExitPrice('');
    setShares('1');
    setResult('WIN');
    setNotes('');
  };

  return (
    <div style={styles.page}>
      {/* Stats Summary */}
      <section style={styles.section}>
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{entries.length}</div>
            <div style={styles.statLabel}>TRADES</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ ...styles.statValue, color: winRate >= 50 ? '#00FF7F' : '#FF1744' }}>{winRate}%</div>
            <div style={styles.statLabel}>WIN RATE</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ ...styles.statValue, color: totalPnl >= 0 ? '#00FF7F' : '#FF1744' }}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </div>
            <div style={styles.statLabel}>TOTAL P/L</div>
          </div>
        </div>
      </section>

      {/* Trade Form */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>LOG TRADE</div>
        <div style={styles.card}>
          <div style={styles.formGrid}>
            <input
              type="text"
              placeholder="TICKER"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="ENTRY PRICE"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="EXIT PRICE"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="SHARES"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.resultButtons}>
            {(['WIN', 'LOSS', 'BREAKEVEN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResult(r)}
                style={{
                  ...styles.resultButton,
                  ...(result === r ? {
                    backgroundColor: r === 'WIN' ? '#00FF7F' : r === 'LOSS' ? '#FF1744' : '#FFD700',
                    color: '#000',
                  } : {}),
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Trade notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.textarea}
          />

          <button onClick={handleSubmit} style={styles.submitButton}>
            LOG TRADE
          </button>
        </div>
      </section>

      {/* Trade History */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>TRADE HISTORY</div>
        <div style={styles.card}>
          {entries.length === 0 ? (
            <div style={styles.emptyState}>NO TRADES YET. EXECUTE.</div>
          ) : (
            [...entries].reverse().map((entry) => (
              <div key={entry.id} style={styles.tradeItem}>
                <div style={styles.tradeHeader}>
                  <span style={styles.tradeTicker}>{entry.ticker}</span>
                  <span style={{
                    ...styles.tradeResult,
                    color: entry.result === 'WIN' ? '#00FF7F' : entry.result === 'LOSS' ? '#FF1744' : '#FFD700',
                  }}>
                    {entry.result}
                  </span>
                </div>
                <div style={styles.tradeDetails}>
                  <span>Entry: ${entry.entryPrice.toFixed(2)}</span>
                  <span>Exit: ${entry.exitPrice.toFixed(2)}</span>
                  <span style={{ color: entry.pnl >= 0 ? '#00FF7F' : '#FF1744' }}>
                    P/L: {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(2)}
                  </span>
                </div>
                <div style={styles.tradeDate}>{new Date(entry.date).toLocaleDateString()}</div>
                {entry.notes && <div style={styles.historyNotes}>{entry.notes}</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WEAPON DRILLS COMPONENT
// ═══════════════════════════════════════════════════════════════

function WeaponDrills({
  entries,
  onAdd,
  streak,
}: {
  entries: DrillEntry[];
  onAdd: (entry: DrillEntry) => void;
  streak: number;
}) {
  const [weapon, setWeapon] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [category, setCategory] = useState<'TRADING' | 'FITNESS' | 'SKILL' | 'MINDSET'>('TRADING');

  const handleSubmit = () => {
    if (!weapon.trim()) return;
    
    const entry: DrillEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weapon,
      intensity,
      category,
    };
    onAdd(entry);
    setWeapon('');
    setIntensity(5);
  };

  return (
    <div style={styles.page}>
      {/* Streak */}
      <section style={styles.section}>
        <div style={styles.streakDisplay}>
          <div style={styles.streakNumber}>{streak}</div>
          <div style={styles.streakLabel}>DAY STREAK</div>
        </div>
      </section>

      {/* Log Form */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>LOG WEAPON DRILL</div>
        <div style={styles.card}>
          <input
            type="text"
            placeholder="What weapon did you sharpen?"
            value={weapon}
            onChange={(e) => setWeapon(e.target.value)}
            style={styles.input}
          />

          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}>
              <span>INTENSITY</span>
              <span style={{ color: intensity >= 7 ? '#00FF7F' : intensity >= 4 ? '#FFD700' : '#FF1744' }}>
                {intensity}/10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.categoryButtons}>
            {(['TRADING', 'FITNESS', 'SKILL', 'MINDSET'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  ...styles.categoryButton,
                  ...(category === c ? styles.categoryButtonActive : {}),
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <button onClick={handleSubmit} style={styles.submitButton}>
            LOG DRILL
          </button>
        </div>
      </section>

      {/* History */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>RECENT DRILLS</div>
        <div style={styles.card}>
          {entries.length === 0 ? (
            <div style={styles.emptyState}>NO DRILLS YET. SHARPEN YOUR WEAPON.</div>
          ) : (
            [...entries].reverse().slice(0, 10).map((entry) => (
              <div key={entry.id} style={styles.drillItem}>
                <div style={styles.drillHeader}>
                  <span style={styles.drillWeapon}>{entry.weapon}</span>
                  <span style={styles.drillCategory}>{entry.category}</span>
                </div>
                <div style={styles.drillIntensity}>
                  {'█'.repeat(entry.intensity)}{'░'.repeat(10 - entry.intensity)} {entry.intensity}/10
                </div>
                <div style={styles.tradeDate}>{new Date(entry.date).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATS COMPONENT
// ═══════════════════════════════════════════════════════════════

function Stats({
  egoEntries,
  tradeEntries,
  drillEntries,
  settings,
}: {
  egoEntries: EgoEntry[];
  tradeEntries: TradeEntry[];
  drillEntries: DrillEntry[];
  settings: Settings;
}) {
  const avgEgo = egoEntries.length > 0
    ? Math.round(egoEntries.reduce((s, e) => s + e.score, 0) / egoEntries.length)
    : 0;

  const wins = tradeEntries.filter(t => t.result === 'WIN').length;
  const losses = tradeEntries.filter(t => t.result === 'LOSS').length;
  const totalPnl = tradeEntries.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins > 0
    ? tradeEntries.filter(t => t.result === 'WIN').reduce((s, t) => s + t.pnl, 0) / wins
    : 0;
  const avgLoss = losses > 0
    ? Math.abs(tradeEntries.filter(t => t.result === 'LOSS').reduce((s, t) => s + t.pnl, 0) / losses)
    : 0;

  const categoryStats = {
    TRADING: drillEntries.filter(d => d.category === 'TRADING').length,
    FITNESS: drillEntries.filter(d => d.category === 'FITNESS').length,
    SKILL: drillEntries.filter(d => d.category === 'SKILL').length,
    MINDSET: drillEntries.filter(d => d.category === 'MINDSET').length,
  };

  const handleExport = () => {
    const data = {
      egoEntries,
      tradeEntries,
      drillEntries,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bluelock-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      {/* EGO Stats */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>EGO STATISTICS</div>
        <div style={styles.card}>
          <div style={styles.statRow}>
            <span>Total Entries</span>
            <span style={styles.statRowValue}>{egoEntries.length}</span>
          </div>
          <div style={styles.statRow}>
            <span>Average EGO</span>
            <span style={{ ...styles.statRowValue, color: getEgoColor(avgEgo) }}>{avgEgo}%</span>
          </div>
          <div style={styles.statRow}>
            <span>Current Label</span>
            <span style={{ ...styles.statRowValue, color: getEgoColor(avgEgo) }}>{getEgoLabel(avgEgo)}</span>
          </div>
        </div>
      </section>

      {/* Trade Stats */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>TRADE STATISTICS</div>
        <div style={styles.card}>
          <div style={styles.statRow}>
            <span>Total Trades</span>
            <span style={styles.statRowValue}>{tradeEntries.length}</span>
          </div>
          <div style={styles.statRow}>
            <span>Wins / Losses</span>
            <span style={styles.statRowValue}>
              <span style={{ color: '#00FF7F' }}>{wins}</span> / <span style={{ color: '#FF1744' }}>{losses}</span>
            </span>
          </div>
          <div style={styles.statRow}>
            <span>Win Rate</span>
            <span style={styles.statRowValue}>{tradeEntries.length > 0 ? Math.round((wins / tradeEntries.length) * 100) : 0}%</span>
          </div>
          <div style={styles.statRow}>
            <span>Total P/L</span>
            <span style={{ ...styles.statRowValue, color: totalPnl >= 0 ? '#00FF7F' : '#FF1744' }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          </div>
          <div style={styles.statRow}>
            <span>Avg Win</span>
            <span style={{ ...styles.statRowValue, color: '#00FF7F' }}>+${avgWin.toFixed(2)}</span>
          </div>
          <div style={styles.statRow}>
            <span>Avg Loss</span>
            <span style={{ ...styles.statRowValue, color: '#FF1744' }}>-${avgLoss.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Drill Stats */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>WEAPON DRILLS</div>
        <div style={styles.card}>
          <div style={styles.statRow}>
            <span>Total Drills</span>
            <span style={styles.statRowValue}>{drillEntries.length}</span>
          </div>
          <div style={styles.statRow}>
            <span>Trading</span>
            <span style={styles.statRowValue}>{categoryStats.TRADING}</span>
          </div>
          <div style={styles.statRow}>
            <span>Fitness</span>
            <span style={styles.statRowValue}>{categoryStats.FITNESS}</span>
          </div>
          <div style={styles.statRow}>
            <span>Skill</span>
            <span style={styles.statRowValue}>{categoryStats.SKILL}</span>
          </div>
          <div style={styles.statRow}>
            <span>Mindset</span>
            <span style={styles.statRowValue}>{categoryStats.MINDSET}</span>
          </div>
        </div>
      </section>

      {/* Export */}
      <section style={styles.section}>
        <button onClick={handleExport} style={styles.exportButton}>
          EXPORT ALL DATA
        </button>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS COMPONENT
// ═══════════════════════════════════════════════════════════════

function SettingsPage({
  settings,
  onUpdate,
  onReset,
}: {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
  onReset: () => void;
}) {
  const [showReset, setShowReset] = useState(false);

  return (
    <div style={styles.page}>
      <section style={styles.section}>
        <div style={styles.sectionTitle}>CAPITAL SETTINGS</div>
        <div style={styles.card}>
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>STARTING CAPITAL</label>
            <input
              type="number"
              value={settings.startingCapital}
              onChange={(e) => onUpdate({ ...settings, startingCapital: parseInt(e.target.value) || 0 })}
              style={styles.settingInput}
            />
          </div>
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>TARGET CAPITAL</label>
            <input
              type="number"
              value={settings.targetCapital}
              onChange={(e) => onUpdate({ ...settings, targetCapital: parseInt(e.target.value) || 0 })}
              style={styles.settingInput}
            />
          </div>
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>WEEKLY INJECTION</label>
            <input
              type="number"
              value={settings.weeklyInjection}
              onChange={(e) => onUpdate({ ...settings, weeklyInjection: parseInt(e.target.value) || 0 })}
              style={styles.settingInput}
            />
          </div>
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>CURRENT CAPITAL</label>
            <input
              type="number"
              value={settings.currentCapital}
              onChange={(e) => onUpdate({ ...settings, currentCapital: parseInt(e.target.value) || 0 })}
              style={styles.settingInput}
            />
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionTitle}>DATA MANAGEMENT</div>
        <div style={styles.card}>
          {!showReset ? (
            <button onClick={() => setShowReset(true)} style={styles.dangerButton}>
              RESET ALL DATA
            </button>
          ) : (
            <div style={styles.resetConfirm}>
              <div style={styles.resetWarning}>THIS WILL DELETE ALL YOUR DATA. ARE YOU SURE?</div>
              <div style={styles.resetButtons}>
                <button onClick={() => { onReset(); setShowReset(false); }} style={styles.confirmButton}>
                  YES, RESET
                </button>
                <button onClick={() => setShowReset(false)} style={styles.cancelButton}>
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionTitle}>ABOUT</div>
        <div style={styles.card}>
          <div style={styles.aboutText}>
            <p><strong>BLUE LOCK TERMINAL</strong></p>
            <p>A tactical interface for your transformation.</p>
            <p style={styles.mottoText}>
              &quot;The world is a field. You are a striker. There is only: SCORE or BE ERASED.&quot;
            </p>
          </div>
        </div>
      </section>
    </div>
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
    borderBottom: '1px solid #00F0FF',
    backgroundColor: '#0A0A0A',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#00F0FF',
    letterSpacing: '0.2em',
  },
  headerSubtitle: {
    fontSize: '0.7rem',
    color: '#666',
    marginTop: '0.25rem',
    letterSpacing: '0.1em',
  },
  nav: {
    display: 'flex',
    overflowX: 'auto',
    backgroundColor: '#111',
    borderBottom: '1px solid #333',
    padding: '0.5rem',
    gap: '0.25rem',
  },
  navButton: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#666',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    backgroundColor: '#00F0FF',
    color: '#000',
    borderColor: '#00F0FF',
  },
  content: {
    flex: 1,
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    color: '#00F0FF',
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#00F0FF',
    letterSpacing: '0.1em',
  },
  card: {
    backgroundColor: '#111',
    border: '1px solid #00F0FF',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  // EGO Display
  egoScore: {
    textAlign: 'center',
    fontSize: '3rem',
    fontWeight: 'bold',
  },
  egoNumber: {
    fontSize: '4rem',
    fontWeight: 'bold',
  },
  egoPercent: {
    fontSize: '1.5rem',
    color: '#666',
  },
  egoLabel: {
    textAlign: 'center',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    letterSpacing: '0.2em',
  },
  egoTrend: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#666',
  },
  // Progress
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    marginBottom: '0.5rem',
  },
  progressStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  progressStat: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
  },
  progressLabel: {
    color: '#666',
  },
  progressValue: {
    color: '#00F0FF',
    fontWeight: 'bold',
  },
  // Bars
  barContainer: {
    height: '8px',
    backgroundColor: '#333',
    border: '1px solid #00F0FF',
  },
  barFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  statBox: {
    backgroundColor: '#111',
    border: '1px solid #00F0FF',
    padding: '1rem 0.5rem',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#00F0FF',
  },
  statLabel: {
    fontSize: '0.6rem',
    color: '#666',
    marginTop: '0.25rem',
    letterSpacing: '0.1em',
  },
  // Motto
  quickActions: {
    textAlign: 'center',
    padding: '1rem',
  },
  motto: {
    fontSize: '0.75rem',
    color: '#666',
    fontStyle: 'italic',
  },
  // Slider
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
  },
  slider: {
    width: '100%',
    height: '8px',
    appearance: 'none',
    backgroundColor: '#333',
    cursor: 'pointer',
  },
  // Label Reference
  labelReference: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.7rem',
    color: '#666',
    padding: '0.5rem',
    border: '1px solid #333',
  },
  labelRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  // Form Elements
  input: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #333',
    color: '#00F0FF',
    padding: '0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  textarea: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #333',
    color: '#FFFFFF',
    padding: '0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
  },
  // Buttons
  submitButton: {
    backgroundColor: '#00F0FF',
    color: '#000',
    border: 'none',
    padding: '1rem',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '0.1em',
  },
  exportButton: {
    backgroundColor: 'transparent',
    color: '#00F0FF',
    border: '1px solid #00F0FF',
    padding: '1rem',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    width: '100%',
  },
  dangerButton: {
    backgroundColor: 'transparent',
    color: '#FF1744',
    border: '1px solid #FF1744',
    padding: '1rem',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    width: '100%',
  },
  resetConfirm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center',
  },
  resetWarning: {
    color: '#FF1744',
    fontSize: '0.75rem',
    textAlign: 'center',
  },
  resetButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  confirmButton: {
    backgroundColor: '#FF1744',
    color: '#FFF',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #333',
    padding: '0.75rem 1.5rem',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  // Result Buttons
  resultButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  resultButton: {
    flex: 1,
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#666',
    padding: '0.75rem',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  // Category Buttons
  categoryButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.25rem',
  },
  categoryButton: {
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#666',
    padding: '0.5rem',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  categoryButtonActive: {
    backgroundColor: '#00F0FF',
    color: '#000',
    borderColor: '#00F0FF',
  },
  // History Items
  historyItem: {
    padding: '0.75rem 0',
    borderBottom: '1px solid #333',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  },
  historyDate: {
    color: '#666',
    fontSize: '0.7rem',
  },
  historyNotes: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '0.5rem',
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem',
    fontSize: '0.8rem',
  },
  // Trade Items
  tradeItem: {
    padding: '0.75rem 0',
    borderBottom: '1px solid #333',
  },
  tradeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  tradeTicker: {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#00F0FF',
  },
  tradeResult: {
    fontWeight: 'bold',
    fontSize: '0.8rem',
  },
  tradeDetails: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.75rem',
    color: '#888',
  },
  tradeDate: {
    fontSize: '0.7rem',
    color: '#666',
    marginTop: '0.25rem',
  },
  // Drill Items
  drillItem: {
    padding: '0.75rem 0',
    borderBottom: '1px solid #333',
  },
  drillHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  drillWeapon: {
    fontWeight: 'bold',
    color: '#00F0FF',
  },
  drillCategory: {
    fontSize: '0.7rem',
    color: '#666',
  },
  drillIntensity: {
    fontSize: '0.75rem',
    color: '#888',
    fontFamily: 'monospace',
  },
  // Streak Display
  streakDisplay: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#111',
    border: '2px solid #FFD700',
  },
  streakNumber: {
    fontSize: '4rem',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  streakLabel: {
    fontSize: '0.8rem',
    color: '#666',
    letterSpacing: '0.2em',
  },
  // Stat Rows
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #333',
    fontSize: '0.8rem',
  },
  statRowValue: {
    fontWeight: 'bold',
    color: '#00F0FF',
  },
  // Settings
  settingRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  settingLabel: {
    fontSize: '0.7rem',
    color: '#666',
    letterSpacing: '0.1em',
  },
  settingInput: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #333',
    color: '#00F0FF',
    padding: '0.75rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  // About
  aboutText: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#888',
    lineHeight: 1.6,
  },
  mottoText: {
    marginTop: '1rem',
    color: '#00F0FF',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center',
    padding: '1rem',
    fontSize: '0.7rem',
    color: '#333',
    borderTop: '1px solid #222',
    letterSpacing: '0.1em',
  },
};
