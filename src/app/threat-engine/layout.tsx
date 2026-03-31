// src/app/threat-engine/layout.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/threat-engine", label: "TRACKER" },
  { href: "/threat-engine/calculator", label: "CALCULATOR" },
  { href: "/threat-engine/leaderboard", label: "RIVALS" },
];

export default function ThreatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <nav style={styles.nav}>
        <span style={styles.brand}>THREAT ENGINE</span>
        <div style={styles.links}>
          {NAV.map((link) => {
            const active = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  ...styles.link,
                  color: active ? "var(--threat)" : "var(--text-muted)",
                  borderBottom: active
                    ? "2px solid var(--threat)"
                    : "2px solid transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-lg)",
    padding: "0 var(--space-lg)",
    height: "40px",
    minHeight: "40px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
    fontSize: "0.75rem",
  },
  brand: {
    color: "var(--threat)",
    fontWeight: 700,
    letterSpacing: "0.1em",
    fontFamily: "var(--font-display)",
    fontSize: "0.7rem",
  },
  links: {
    display: "flex",
    gap: "var(--space-lg)",
  },
  link: {
    textDecoration: "none",
    paddingBottom: "10px",
    paddingTop: "10px",
    letterSpacing: "0.08em",
    transition: "color 0.15s",
  },
};
