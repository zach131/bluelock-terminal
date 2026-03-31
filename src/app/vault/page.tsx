// src/app/vault/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSync } from "@/lib/useSync";

interface Trade {
  id: string;
  date: string;
  ticker: string;
  type: "LONG" | "SHORT";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
}

interface VaultData {
  trades: Trade[];
  balance: number;
}

const DEFAULT_DATA: VaultData = {
  trades: [],
  balance: 10000,
};

const SYNC_KEY = "bluelock_vault";

const WATCHLIST = [
  { label: "AAPL", symbol: "NASDAQ:AAPL" },
  { label: "TSLA", symbol: "NASDAQ:TSLA" },
  { label: "BTC", symbol: "BINANCE:BTCUSDT" },
];

function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const div = document.createElement("div");
    div.style.height = "100%";
    div.style.width = "100%";
    containerRef.current.appendChild(div);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        // @ts-ignore
        new window.TradingView.widget({
          symbol,
          interval: "D",
          theme: "dark",
          style: "1",
          container_id: div,
          autosize: true,
          hide_side_toolbar: false,
          allow_symbol_change: true,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        minHeight: "300px",
        background: "#0A0A0A",
      }}
    />
  );
}

export default function Vault() {
  const { data, loading, update } = useSync<VaultData>({
    cloudKey: SYNC_KEY,
    defaultValue: DEFAULT_DATA,
  });

  const [symbol, setSymbol] = useState(WATCHLIST[0].symbol);
  const [showTrade, setShowTrade] = useState(false);
  const [form, setForm] = useState({
    ticker: "",
    type: "LONG" as "LONG" | "SHORT",
    entry: "",
    exit: "",
    size: "",
  });

  const executeTrade = () => {
    const { ticker, type, entry, exit, size } = form;
    const e = parseFloat(entry);
    const x = parseFloat(exit);
    const s = parseFloat(size);

    if (!ticker || isNaN(e) || isNaN(x) || isNaN(s)) return;

    const pnl = type === "LONG" ? (x - e) * s : (e - x) * s;

    const newTrade: Trade = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      ticker: ticker.toUpperCase(),
      type,
      entry: e,
      exit: x,
      size: s,
      pnl,
    };

    update((prev) => ({
      trades: [newTrade, ...prev.trades],
      balance: prev.balance + pnl,
    }));

    setShowTrade(false);
    setForm({ ticker: "", type: "LONG", entry: "", exit: "", size: "" });
  };

  const deleteTrade = (id: string) => {
    update((prev) => {
      const trade = prev.trades.find((t) => t.id === id);
      if (!trade) return prev;
      return {
        trades: prev.trades.filter((t) => t.id !== id),
        balance: prev.balance - trade.pnl,
      };
    });
  };

  const totalPnl = data.trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = data.trades.filter((t) => t.pnl > 0).length;
  const winRate =
    data.trades.length > 0 ? (wins / data.trades.length) * 100 : 0;

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={{ color: "#FFD700" }}>▸</span> CONNECTING...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.title}>THE VAULT</span>
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>EQUITY</span>
            <span
              style={{
                ...styles.statValue,
                color:
                  data.balance >= 10000 ? "var(--green-500)" : "var(--red-500)",
              }}
            >
              ${data.balance.toFixed(2)}
            </span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>P&L</span>
            <span
              style={{
                ...styles.statValue,
                color: totalPnl >= 0 ? "var(--green-500)" : "var(--red-500)",
              }}
            >
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>WIN RATE</span>
            <span style={styles.statValue}>{winRate.toFixed(1)}%</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>TRADES</span>
            <span style={styles.statValue}>{data.trades.length}</span>
          </div>
        </div>
      </header>

      <div style={styles.toolbar}>
        <div style={styles.watchlist}>
          {WATCHLIST.map((w) => (
            <button
              key={w.symbol}
              onClick={() => setSymbol(w.symbol)}
              style={{
                ...styles.watchBtn,
                borderColor: symbol === w.symbol ? "#FFD700" : "var(--border)",
                color: symbol === w.symbol ? "#FFD700" : "var(--text-muted)",
                background:
                  symbol === w.symbol ? "rgba(255,215,0,0.1)" : "transparent",
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTrade(!showTrade)}
          style={styles.tradeBtn}
        >
          {showTrade ? "×" : "+ TRADE"}
        </button>
      </div>

      {showTrade && (
        <div style={styles.formRow}>
          <input
            placeholder="TICKER"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value })}
            style={styles.formInput}
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value as "LONG" | "SHORT",
              })
            }
            style={styles.formSelect}
          >
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
          <input
            placeholder="ENTRY"
            type="number"
            value={form.entry}
            onChange={(e) => setForm({ ...form, entry: e.target.value })}
            style={styles.formSmall}
          />
          <input
            placeholder="EXIT"
            type="number"
            value={form.exit}
            onChange={(e) => setForm({ ...form, exit: e.target.value })}
            style={styles.formSmall}
          />
          <input
            placeholder="SIZE"
            type="number"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            style={styles.formSmall}
          />
          <button onClick={executeTrade} style={styles.execBtn}>
            EXEC
          </button>
        </div>
      )}

      <div style={styles.chartArea}>
        <TradingViewWidget symbol={symbol} />
      </div>

      <div style={styles.tradeLog}>
        {data.trades.length === 0 ? (
          <div style={styles.emptyLog}>
            No trades yet. Click + TRADE to start.
          </div>
        ) : (
          data.trades.map((t) => (
            <div key={t.id} style={styles.tradeRow}>
              <div style={styles.tradeInfo}>
                <span style={styles.tradeTicker}>{t.ticker}</span>
                <span
                  style={{
                    ...styles.tradeType,
                    color:
                      t.type === "LONG" ? "var(--green-500)" : "var(--red-500)",
                  }}
                >
                  {t.type}
                </span>
                <span style={styles.tradeDate}>{t.date}</span>
              </div>
              <div style={styles.tradeNumbers}>
                <span style={styles.tradeEntry}>
                  {t.entry} → {t.exit}
                </span>
                <span
                  style={{
                    ...styles.tradePnl,
                    color: t.pnl >= 0 ? "var(--green-500)" : "var(--red-500)",
                  }}
                >
                  {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                </span>
                <button
                  onClick={() => deleteTrade(t.id)}
                  style={styles.tradeDelete}
                  title="Remove trade"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#0A0A0A",
    overflow: "hidden",
  },
  loading: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
  },
  header: {
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    background: "#050505",
  },
  title: {
    color: "#FFD700",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "0.15em",
    display: "block",
    marginBottom: "var(--space-sm)",
  },
  statsRow: {
    display: "flex",
    gap: "var(--space-lg)",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
  },
  statLabel: {
    fontSize: "0.5rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    marginBottom: "2px",
  },
  statValue: {
    fontSize: "1rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    color: "var(--text-primary)",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-sm) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    background: "#050505",
  },
  watchlist: {
    display: "flex",
    gap: "var(--space-sm)",
  },
  watchBtn: {
    border: "1px solid",
    padding: "4px 10px",
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s",
  },
  tradeBtn: {
    background: "#FFD700",
    color: "#000",
    border: "none",
    padding: "6px 14px",
    fontSize: "0.7rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.05em",
  },
  formRow: {
    display: "flex",
    gap: "var(--space-sm)",
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    background: "#050505",
    flexWrap: "wrap",
  },
  formInput: {
    flex: 1,
    minWidth: "80px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "6px 10px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    borderRadius: "var(--radius-sm)",
    outline: "none",
  },
  formSelect: {
    width: "80px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "6px 10px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    borderRadius: "var(--radius-sm)",
  },
  formSmall: {
    width: "70px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "6px 10px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    borderRadius: "var(--radius-sm)",
    outline: "none",
  },
  execBtn: {
    background: "#FFD700",
    color: "#000",
    border: "none",
    padding: "6px 16px",
    fontSize: "0.7rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
  },
  chartArea: {
    flex: 1,
    minHeight: "300px",
  },
  tradeLog: {
    height: "140px",
    overflowY: "auto",
    borderTop: "1px solid var(--border)",
    background: "#050505",
  },
  emptyLog: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
  },
  tradeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px var(--space-lg)",
    borderBottom: "1px solid var(--border)",
  },
  tradeInfo: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
  },
  tradeTicker: {
    fontSize: "0.8rem",
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    color: "var(--text-primary)",
  },
  tradeType: {
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  tradeDate: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
  },
  tradeNumbers: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
  },
  tradeEntry: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
  tradePnl: {
    fontSize: "0.8rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
  },
  tradeDelete: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
};
