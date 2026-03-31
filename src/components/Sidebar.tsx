// src/components/Sidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { levelFromXp, xpProgressPercent } from "@/lib/xp";

const NAV = [
  { href: "/", label: "DASH", icon: "◈" },
  { href: "/profile", label: "WEAPON", icon: "⚡" }, // ADDED THIS LINE
  { href: "/threat-engine", label: "GRADES", icon: "▸" },
  { href: "/threat-engine/leaderboard", label: "RIVALS", icon: "⚔" },
  { href: "/biological-ledger", label: "BODY", icon: "▪" },
  { href: "/overclock", label: "CLOCK", icon: "◉" },
  { href: "/neural-link", label: "NEURAL", icon: "◇" },
  { href: "/vault", label: "VAULT", icon: "◆" },
  { href: "/architecture", label: "BUILD", icon: "⬡" },
  { href: "/chessboard", label: "PLAN", icon: "△" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [xp, setXp] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setXp(parseInt(localStorage.getItem("blt_xp") || "0"));
    const handler = (e: Event) => setXp((e as CustomEvent).detail.xp);
    window.addEventListener("blt-xp-update", handler);
    return () => window.removeEventListener("blt-xp-update", handler);
  }, []);

  const level = levelFromXp(xp);
  const progress = xpProgressPercent(xp, level);

  return (
    <>
      {/* Mobile Menu Button */}
      <button onClick={() => setIsOpen(!isOpen)} className="mobile-menu-btn">
        {isOpen ? "×" : "☰"}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 199,
          }}
        />
      )}

      <aside
        className={`sidebar-desktop ${isOpen ? "open" : ""}`}
        style={styles.sidebar}
      >
        <div style={styles.logo}>
          <span style={styles.logoIcon}>BL</span>
        </div>
        <nav style={styles.nav}>
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                style={{
                  ...styles.navItem,
                  color: active ? "var(--green-500)" : "var(--text-muted)",
                  background: active ? "var(--bg-elevated)" : "transparent",
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div style={styles.xpSection}>
          <span style={styles.xpLevel}>LVL {level}</span>
          <div style={styles.xpBarOuter}>
            <div style={{ ...styles.xpBarInner, width: `${progress}%` }} />
          </div>
          <span style={styles.xpText}>{xp} XP</span>
        </div>
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "56px",
    background: "var(--bg-surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font-mono)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-md) 0",
    borderBottom: "1px solid var(--border)",
  },
  logoIcon: {
    color: "var(--green-500)",
    fontSize: "0.9rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "var(--space-sm) 0",
    gap: "2px",
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "var(--space-sm) 0",
    textDecoration: "none",
    transition: "all 0.15s",
  },
  navIcon: { fontSize: "0.85rem", lineHeight: 1 },
  navLabel: { fontSize: "0.4rem", letterSpacing: "0.08em", fontWeight: 500 },
  xpSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    padding: "var(--space-sm) var(--space-xs)",
    borderTop: "1px solid var(--border)",
  },
  xpLevel: {
    color: "var(--green-500)",
    fontSize: "0.6rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
  },
  xpBarOuter: {
    width: "100%",
    height: "3px",
    background: "var(--bg-primary)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  xpBarInner: {
    height: "100%",
    background: "var(--green-500)",
    borderRadius: "2px",
    transition: "width 0.5s ease",
  },
  xpText: { color: "var(--text-muted)", fontSize: "0.4rem" },
};
