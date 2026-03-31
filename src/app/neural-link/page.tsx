"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSync } from "@/lib/useSync";
import { awardXp } from "@/lib/globalXp";
import { XP_VALUES } from "@/lib/constants";
import {
  createDefaultNeuralState,
  getActiveCharacters,
  getIntegratedCharacters,
  findEmptySlot,
  traitProgress,
  characterTotalXp,
} from "@/lib/neural";
import {
  TRAIT_META,
  VALID_TRAITS,
  type NeuralState,
  type Character,
  type TraitID,
  type Quality,
} from "@/types/neural";

const SYNC_KEY = "bluelock_neural_link";

const COMMANDS = [
  {
    cmd: 'summon "Name" from "Source"',
    desc: "Add a character to an active slot",
  },
  {
    cmd: 'observe "Quality" as TRAIT',
    desc: "Extract a quality from selected character",
  },
  { cmd: "dismiss", desc: "Archive selected character (keeps XP)" },
  { cmd: "remove [n]", desc: "Delete quality #n from selected character" },
  { cmd: "switch [1|2|3]", desc: "Select a different active slot" },
  { cmd: "list", desc: "Show all integrated (archived) characters" },
  { cmd: "clear", desc: "Clear the log" },
  { cmd: "help", desc: "Show this reference" },
];

const TRAIT_KEYS = VALID_TRAITS.map((t) => `${t} = ${TRAIT_META[t].name}`);

function parseArgs(raw: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  for (const ch of raw) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === " " && !inQuote) {
      if (current) args.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

function RadarChart({ traits }: { traits: Record<TraitID, number> }) {
  const traitKeys = VALID_TRAITS;
  const n = traitKeys.length;
  const angleStep = (2 * Math.PI) / n;
  const cx = 100;
  const cy = 100;
  const r = 75;
  const maxLevel = 10;

  const points = traitKeys.map((key, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const { level } = traitProgress(traits[key]);
    const pr = (Math.min(level, maxLevel) / maxLevel) * r;
    return {
      x: cx + pr * Math.cos(angle),
      y: cy + pr * Math.sin(angle),
      lx: cx + (r + 22) * Math.cos(angle),
      ly: cy + (r + 22) * Math.sin(angle),
      color: TRAIT_META[key].color,
      key,
    };
  });

  return (
    <svg width={200} height={200} viewBox="20 15 160 170">
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r * s}
          fill="none"
          stroke="var(--border)"
          strokeWidth={0.5}
        />
      ))}
      {traitKeys.map((_, i) => {
        const a = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        );
      })}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(168, 85, 247, 0.1)"
        stroke="var(--purple-500)"
        strokeWidth={1.5}
      />
      {points.map((p) => (
        <g key={p.key}>
          <circle cx={p.x} cy={p.y} r={3} fill={p.color} />
          <text
            x={p.lx}
            y={p.ly}
            fill={p.color}
            fontSize="7"
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {TRAIT_META[p.key].name}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function NeuralLinkPage() {
  const { data, loading, update } = useSync<NeuralState>({
    cloudKey: SYNC_KEY,
    defaultValue: createDefaultNeuralState(),
  });

  const [cmd, setCmd] = useState("");
  const [logs, setLogs] = useState<{ type: string; msg: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback(
    (type: string, msg: string) =>
      setLogs((prev) => [...prev.slice(-5), { type, msg }]),
    [],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showHelp) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showHelp]);

  const selectedChar = selectedId
    ? (data.characters.find((c) => c.id === selectedId) ?? null)
    : null;

  const handleCmd = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const args = parseArgs(trimmed);
      const command = args[0].toLowerCase();

      if (command === "help") {
        setShowHelp(true);
        return;
      }

      if (command === "clear") {
        setLogs([]);
        return;
      }

      if (command === "summon") {
        const nameIdx = args.findIndex((a) => a.toLowerCase() === "from");
        const name = nameIdx > 1 ? args.slice(1, nameIdx).join(" ") : args[1];
        const source =
          nameIdx !== -1 && args[nameIdx + 1]
            ? args.slice(nameIdx + 1).join(" ")
            : "Unknown";

        if (!name) {
          addLog("err", 'SYNTAX: summon "Name" from "Source"');
          return;
        }

        update((prev) => {
          const slot = findEmptySlot(prev);
          if (slot === -1) {
            addLog("err", "ALL SLOTS FULL — dismiss someone first");
            return prev;
          }

          const newChar: Character = {
            id: Date.now().toString(),
            name,
            source,
            qualities: [],
            status: "ACTIVE",
            slot: (slot + 1) as 1 | 2 | 3,
          };

          const newSlots = [...prev.activeSlots] as NeuralState["activeSlots"];
          newSlots[slot] = newChar.id;

          addLog("ok", `SUMMONED: ${name} → SLOT ${slot + 1}`);
          return {
            ...prev,
            characters: [...prev.characters, newChar],
            activeSlots: newSlots,
          };
        });
        return;
      }

      if (command === "observe") {
        if (!selectedChar) {
          addLog("err", "SELECT A CHARACTER FIRST");
          return;
        }

        const asIdx = args.findIndex((a) => a.toLowerCase() === "as");
        if (asIdx === -1 || asIdx <= 1) {
          addLog("err", 'SYNTAX: observe "Quality" as TRAIT');
          return;
        }

        const qualityText = args.slice(1, asIdx).join(" ");
        const traitInput = args[asIdx + 1]?.toUpperCase() as TraitID;

        if (!qualityText) {
          addLog("err", "MISSING QUALITY TEXT");
          return;
        }

        if (!VALID_TRAITS.includes(traitInput)) {
          addLog(
            "err",
            `INVALID TRAIT: ${args[asIdx + 1] || ""} — use: ${VALID_TRAITS.join(", ")}`,
          );
          return;
        }

        const xp = XP_VALUES.NEURAL_OBSERVE;

        const newQuality: Quality = {
          id: Date.now().toString(),
          text: qualityText,
          trait: traitInput,
          xp,
          date: new Date().toISOString(),
        };

        update((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === selectedChar.id
              ? { ...c, qualities: [...c.qualities, newQuality] }
              : c,
          ),
          traits: {
            ...prev.traits,
            [traitInput]: prev.traits[traitInput] + xp,
          },
        }));

        // UPDATED: Use awardXp for MIND
        awardXp(xp, "MIND");
        addLog(
          "ok",
          `OBSERVED: "${qualityText}" → ${TRAIT_META[traitInput].name} +${xp}XP`,
        );
        return;
      }

      if (command === "dismiss") {
        if (!selectedChar) {
          addLog("err", "SELECT A CHARACTER FIRST");
          return;
        }

        const name = selectedChar.name;

        update((prev) => {
          const newSlots = [...prev.activeSlots] as NeuralState["activeSlots"];
          if (selectedChar.slot) {
            newSlots[selectedChar.slot - 1] = null;
          }

          // NEW (FIXED)
          awardXp(XP_VALUES.NEURAL_COMPLETE, "MIND");

          return {
            ...prev,
            characters: prev.characters.map((c) =>
              c.id === selectedChar.id
                ? { ...c, status: "INTEGRATED" as const, slot: undefined }
                : c,
            ),
            activeSlots: newSlots,
          };
        });

        setSelectedId(null);
        addLog("ok", `INTEGRATED: ${name} +${XP_VALUES.NEURAL_COMPLETE}XP`);
        return;
      }

      if (command === "remove") {
        if (!selectedChar) {
          addLog("err", "SELECT A CHARACTER FIRST");
          return;
        }

        const idx = parseInt(args[1]) - 1;
        if (isNaN(idx) || idx < 0 || idx >= selectedChar.qualities.length) {
          addLog("err", `SYNTAX: remove [1-${selectedChar.qualities.length}]`);
          return;
        }

        const removed = selectedChar.qualities[idx];

        update((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === selectedChar.id
              ? { ...c, qualities: c.qualities.filter((_, i) => i !== idx) }
              : c,
          ),
          traits: {
            ...prev.traits,
            [removed.trait]: Math.max(
              0,
              prev.traits[removed.trait] - removed.xp,
            ),
          },
        }));

        addLog("info", `REMOVED: "${removed.text}"`);
        return;
      }

      if (command === "switch") {
        const slot = parseInt(args[1]);
        if (isNaN(slot) || slot < 1 || slot > 3) {
          addLog("err", "SYNTAX: switch [1|2|3]");
          return;
        }

        const charId = data.activeSlots[slot - 1];
        if (!charId) {
          addLog("err", `SLOT ${slot} IS EMPTY`);
          return;
        }

        setSelectedId(charId);
        const char = data.characters.find((c) => c.id === charId);
        addLog("info", `SELECTED: ${char?.name || "Unknown"} (SLOT ${slot})`);
        return;
      }

      if (command === "list") {
        const integrated = getIntegratedCharacters(data);
        if (integrated.length === 0) {
          addLog("info", "NO INTEGRATED CHARACTERS");
          return;
        }
        integrated.forEach((c) =>
          addLog("info", `  ${c.name} — ${c.qualities.length} qualities`),
        );
        return;
      }

      addLog("err", `UNKNOWN: ${command} — type "help"`);
    },
    [selectedChar, data, update, addLog],
  );

  const activeChars = getActiveCharacters(data);
  const integrated = getIntegratedCharacters(data);

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={{ color: "var(--purple-500)" }}>▸</span> CONNECTING...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.radarWrap}>
          <RadarChart traits={data.traits} />
        </div>
        <div style={styles.traitStats}>
          {VALID_TRAITS.map((t) => {
            const { level, inLevel, needed, percent } = traitProgress(
              data.traits[t],
            );
            return (
              <div key={t} style={styles.traitRow}>
                <span
                  style={{
                    color: TRAIT_META[t].color,
                    fontWeight: 600,
                    width: "65px",
                    fontSize: "0.65rem",
                  }}
                >
                  {TRAIT_META[t].name}
                </span>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    width: "35px",
                    fontSize: "0.65rem",
                  }}
                >
                  Lv.{level}
                </span>
                <div style={styles.miniBarOuter}>
                  <div
                    style={{
                      ...styles.miniBarInner,
                      width: `${percent}%`,
                      background: TRAIT_META[t].color,
                    }}
                  />
                </div>
                <span
                  style={{
                    color: "var(--text-muted)",
                    width: "55px",
                    textAlign: "right",
                    fontSize: "0.55rem",
                  }}
                >
                  {inLevel}/{needed}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.slotsSection}>
        <div style={styles.sectionLabel}>ACTIVE LINKS</div>
        <div style={styles.slotsGrid}>
          {[0, 1, 2].map((i) => {
            const char = activeChars.find((c) => c.slot === i + 1);
            const isSelected = char?.id === selectedId;
            return (
              <div
                key={i}
                onClick={() =>
                  char
                    ? setSelectedId(selectedId === char.id ? null : char.id)
                    : null
                }
                style={{
                  ...styles.slotCard,
                  borderColor: isSelected
                    ? "var(--purple-500)"
                    : "var(--border)",
                  background: isSelected
                    ? "var(--bg-elevated)"
                    : "var(--bg-surface)",
                  cursor: char ? "pointer" : "default",
                }}
              >
                {char ? (
                  <>
                    <div style={styles.slotName}>{char.name}</div>
                    <div style={styles.slotSource}>{char.source}</div>
                    <div style={styles.slotMeta}>
                      {char.qualities.length} qualities ·{" "}
                      {characterTotalXp(char)} XP
                    </div>
                  </>
                ) : (
                  <div style={styles.slotEmpty}>
                    <span style={{ opacity: 0.25, fontSize: "0.8rem" }}>
                      SLOT {i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: "0.55rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      EMPTY
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedChar && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <div>
              <span style={styles.detailName}>{selectedChar.name}</span>
              <span style={styles.detailSource}>
                from {selectedChar.source}
              </span>
            </div>
            <span style={styles.detailXp}>
              {characterTotalXp(selectedChar)} XP
            </span>
          </div>

          <div style={styles.qualitiesHeader}>
            EXTRACTED QUALITIES [{selectedChar.qualities.length}]
          </div>

          {selectedChar.qualities.length === 0 ? (
            <div style={styles.emptyQualities}>
              No qualities extracted yet.
              <br />
              <span style={{ opacity: 0.5 }}>observe "Quality" as TRAIT</span>
            </div>
          ) : (
            <div style={styles.qualitiesList}>
              {selectedChar.qualities.map((q, idx) => (
                <div key={q.id} style={styles.qualityItem}>
                  <span style={styles.qualityIndex}>{idx + 1}</span>
                  <span
                    style={{
                      ...styles.qualityBadge,
                      background: TRAIT_META[q.trait].color,
                    }}
                  >
                    {q.trait}
                  </span>
                  <span style={styles.qualityText}>{q.text}</span>
                  <span style={styles.qualityXp}>+{q.xp}</span>
                  <button
                    onClick={() => handleCmd(`remove ${idx + 1}`)}
                    style={styles.qualityRemove}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.detailActions}>
            <button
              onClick={() => handleCmd("dismiss")}
              style={styles.dismissBtn}
            >
              DISMISS (Archive)
            </button>
          </div>
        </div>
      )}

      <div style={styles.archiveSection}>
        <div
          style={styles.archiveToggle}
          onClick={() => setShowArchive(!showArchive)}
        >
          <span>INTEGRATED [{integrated.length}]</span>
          <span
            style={{
              transform: showArchive ? "rotate(90deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            ▸
          </span>
        </div>
        {showArchive && (
          <div style={styles.archiveList}>
            {integrated.length === 0 ? (
              <div style={styles.archiveEmpty}>
                No integrated characters yet.
              </div>
            ) : (
              integrated.map((c) => (
                <div key={c.id} style={styles.archiveItem}>
                  <span style={styles.archiveName}>{c.name}</span>
                  <span style={styles.archiveSource}>{c.source}</span>
                  <span style={styles.archiveMeta}>
                    {c.qualities.length}q · {characterTotalXp(c)}XP
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={styles.log}>
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              color:
                l.type === "err"
                  ? "var(--red-500)"
                  : l.type === "ok"
                    ? "var(--green-500)"
                    : "var(--text-muted)",
            }}
          >
            &gt; {l.msg}
          </div>
        ))}
      </div>

      <footer style={styles.footer}>
        <span style={{ color: "var(--purple-500)" }}>▸</span>
        <input
          ref={inputRef}
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCmd(cmd);
              setCmd("");
            }
          }}
          placeholder={
            selectedChar
              ? 'observe "Quality" as TRAIT | help'
              : 'summon "Name" from "Source" | help'
          }
          style={styles.input}
        />
        <button
          onClick={() => setShowHelp(true)}
          style={styles.helpBtn}
          title="Commands"
        >
          ?
        </button>
      </footer>

      {showHelp && (
        <div style={styles.overlay} onClick={() => setShowHelp(false)}>
          <div style={styles.helpModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.helpHeader}>
              <span>NEURAL LINK — COMMAND REFERENCE</span>
              <button
                onClick={() => setShowHelp(false)}
                style={styles.helpClose}
              >
                ×
              </button>
            </div>
            <div style={styles.helpBody}>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>COMMANDS</div>
                {COMMANDS.map((c, i) => (
                  <div key={i} style={styles.helpRow}>
                    <code style={styles.helpCmd}>{c.cmd}</code>
                    <span style={styles.helpDesc}>{c.desc}</span>
                  </div>
                ))}
              </div>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>TRAITS</div>
                <div style={styles.helpKeyGrid}>
                  {TRAIT_KEYS.map((k, i) => (
                    <div key={i} style={styles.helpKeyRow}>
                      <code
                        style={{
                          ...styles.helpKey,
                          color: TRAIT_META[k.split(" = ")[0] as TraitID].color,
                        }}
                      >
                        {k.split(" = ")[0]}
                      </code>
                      <span style={styles.helpKeyName}>
                        {k.split(" = ")[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>WORKFLOW</div>
                <div style={styles.helpStep}>
                  <span style={styles.helpStepNum}>1</span>
                  <div>
                    <code style={styles.helpCmd}>summon "Toji" from "JJK"</code>
                    <div style={styles.helpDesc}>Fills an empty slot</div>
                  </div>
                </div>
                <div style={styles.helpStep}>
                  <span style={styles.helpStepNum}>2</span>
                  <div>
                    <span style={styles.helpDesc}>
                      Click the character card to select them
                    </span>
                  </div>
                </div>
                <div style={styles.helpStep}>
                  <span style={styles.helpStepNum}>3</span>
                  <div>
                    <code style={styles.helpCmd}>
                      observe "Calm under pressure" as MEN
                    </code>
                    <div style={styles.helpDesc}>
                      Logs quality, awards +{XP_VALUES.NEURAL_OBSERVE} XP
                    </div>
                  </div>
                </div>
                <div style={styles.helpStep}>
                  <span style={styles.helpStepNum}>4</span>
                  <div>
                    <code style={styles.helpCmd}>dismiss</code>
                    <div style={styles.helpDesc}>
                      Archives character, awards +{XP_VALUES.NEURAL_COMPLETE} XP
                    </div>
                  </div>
                </div>
              </div>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>EXAMPLES</div>
                <div style={styles.helpExample}>
                  <code style={styles.helpCmd}>
                    summon "Sanji" from "One Piece"
                  </code>
                  <span style={styles.helpDesc}>
                    Add Sanji to next open slot
                  </span>
                </div>
                <div style={styles.helpExample}>
                  <code style={styles.helpCmd}>
                    observe "Never abandons crew" as COD
                  </code>
                  <span style={styles.helpDesc}>Extract a CODE quality</span>
                </div>
                <div style={styles.helpExample}>
                  <code style={styles.helpCmd}>
                    observe "Relentless training" as DRV
                  </code>
                  <span style={styles.helpDesc}>Extract a DRIVE quality</span>
                </div>
                <div style={styles.helpExample}>
                  <code style={styles.helpCmd}>remove 2</code>
                  <span style={styles.helpDesc}>
                    Delete quality #2 from selected character
                  </span>
                </div>
                <div style={styles.helpExample}>
                  <code style={styles.helpCmd}>switch 3</code>
                  <span style={styles.helpDesc}>
                    Select the character in slot 3
                  </span>
                </div>
              </div>
              <div style={styles.helpSection}>
                <div style={styles.helpSectionTitle}>TIPS</div>
                <div style={styles.helpTip}>
                  3 active slots max — dismiss to free a slot
                </div>
                <div style={styles.helpTip}>
                  Dismissed characters keep all their XP in your traits
                </div>
                <div style={styles.helpTip}>
                  Click the × on a quality to remove it (XP refunded)
                </div>
                <div style={styles.helpTip}>
                  Each observation earns +{XP_VALUES.NEURAL_OBSERVE} global XP
                </div>
                <div style={styles.helpTip}>
                  Dismissing earns +{XP_VALUES.NEURAL_COMPLETE} global XP
                </div>
                <div style={styles.helpTip}>
                  Radar chart grows as trait levels increase
                </div>
                <div style={styles.helpTip}>
                  Integrated characters appear in the archive below
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--bg-primary)",
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
    display: "flex",
    gap: "var(--space-lg)",
    padding: "var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
    alignItems: "flex-start",
  },
  radarWrap: {
    flexShrink: 0,
  },
  traitStats: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-sm)",
    minWidth: 0,
  },
  traitRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
  },
  miniBarOuter: {
    flex: 1,
    height: "4px",
    background: "var(--bg-primary)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  miniBarInner: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },
  slotsSection: {
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
  },
  sectionLabel: {
    fontSize: "0.55rem",
    color: "var(--text-muted)",
    letterSpacing: "0.12em",
    marginBottom: "var(--space-sm)",
    fontWeight: 600,
  },
  slotsGrid: {
    display: "flex",
    gap: "var(--space-md)",
  },
  slotCard: {
    flex: 1,
    padding: "var(--space-md)",
    border: "1px solid",
    borderRadius: "var(--radius-md)",
    transition: "all 0.15s",
    minHeight: "70px",
  },
  slotName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    marginBottom: "2px",
    color: "var(--text-primary)",
  },
  slotSource: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    marginBottom: "var(--space-xs)",
  },
  slotMeta: {
    fontSize: "0.55rem",
    color: "var(--text-secondary)",
  },
  slotEmpty: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    minHeight: "40px",
  },
  detailPanel: {
    flex: 1,
    overflowY: "auto",
    padding: "var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    minHeight: 0,
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "var(--space-lg)",
  },
  detailName: {
    fontSize: "1.1rem",
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    color: "var(--purple-500)",
    display: "block",
    marginBottom: "2px",
  },
  detailSource: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
  },
  detailXp: {
    fontSize: "0.75rem",
    color: "var(--green-500)",
    fontWeight: 600,
    fontFamily: "var(--font-display)",
  },
  qualitiesHeader: {
    fontSize: "0.55rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    marginBottom: "var(--space-sm)",
    fontWeight: 600,
  },
  qualitiesList: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-xs)",
  },
  qualityItem: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    padding: "var(--space-sm) var(--space-md)",
    background: "var(--bg-surface)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    fontSize: "0.8rem",
  },
  qualityIndex: {
    color: "var(--text-muted)",
    fontSize: "0.6rem",
    width: "16px",
    textAlign: "right",
    flexShrink: 0,
  },
  qualityBadge: {
    padding: "2px 6px",
    borderRadius: "2px",
    fontSize: "0.5rem",
    fontWeight: 700,
    color: "#000",
    flexShrink: 0,
    letterSpacing: "0.05em",
  },
  qualityText: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  qualityXp: {
    color: "var(--green-500)",
    fontSize: "0.65rem",
    flexShrink: 0,
  },
  qualityRemove: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: "0 2px",
    lineHeight: 1,
    flexShrink: 0,
    transition: "color 0.15s",
  },
  emptyQualities: {
    textAlign: "center",
    padding: "var(--space-xl)",
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    lineHeight: 1.8,
  },
  detailActions: {
    marginTop: "var(--space-lg)",
    display: "flex",
    justifyContent: "flex-end",
  },
  dismissBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    padding: "var(--space-sm) var(--space-md)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s",
  },
  archiveSection: {
    borderTop: "1px solid var(--border)",
    background: "var(--bg-surface)",
  },
  archiveToggle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-sm) var(--space-lg)",
    cursor: "pointer",
    fontSize: "0.55rem",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    userSelect: "none",
  },
  archiveList: {
    padding: "0 var(--space-lg) var(--space-sm)",
  },
  archiveEmpty: {
    color: "var(--text-muted)",
    fontSize: "0.7rem",
    padding: "var(--space-sm) 0",
  },
  archiveItem: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    padding: "var(--space-xs) 0",
    fontSize: "0.75rem",
    borderBottom: "1px solid var(--border)",
  },
  archiveName: {
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  archiveSource: {
    color: "var(--text-muted)",
    fontSize: "0.65rem",
    flex: 1,
  },
  archiveMeta: {
    color: "var(--text-muted)",
    fontSize: "0.6rem",
  },
  log: {
    height: "36px",
    fontSize: "0.6rem",
    padding: "2px var(--space-lg)",
    overflow: "hidden",
    borderTop: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    background: "var(--bg-primary)",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    padding: "var(--space-sm) var(--space-lg)",
    background: "var(--bg-input)",
    borderTop: "1px solid var(--border)",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    outline: "none",
  },
  helpBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s",
    flexShrink: 0,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  helpModal: {
    width: "90%",
    maxWidth: "520px",
    maxHeight: "80vh",
    background: "var(--bg-surface)",
    border: "1px solid var(--purple-500)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 0 20px rgba(168,85,247,0.2)",
  },
  helpHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    fontSize: "0.65rem",
    color: "var(--purple-500)",
    letterSpacing: "0.12em",
    fontWeight: 600,
    fontFamily: "var(--font-display)",
  },
  helpClose: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  helpBody: {
    overflowY: "auto",
    padding: "var(--space-lg)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-lg)",
  },
  helpSection: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-sm)",
  },
  helpSectionTitle: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    letterSpacing: "0.12em",
    fontWeight: 600,
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--space-xs)",
  },
  helpRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
    padding: "var(--space-xs) 0",
  },
  helpCmd: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.7rem",
    color: "var(--green-500)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
  },
  helpDesc: {
    color: "var(--text-secondary)",
    fontSize: "0.7rem",
  },
  helpKeyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "var(--space-xs)",
  },
  helpKeyRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
  },
  helpKey: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.65rem",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    minWidth: "32px",
    textAlign: "center",
  },
  helpKeyName: {
    color: "var(--text-secondary)",
    fontSize: "0.65rem",
  },
  helpStep: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-sm)",
    padding: "var(--space-xs) 0",
  },
  helpStepNum: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--purple-500)",
    color: "#000",
    fontSize: "0.6rem",
    fontWeight: 700,
    borderRadius: "50%",
    flexShrink: 0,
  },
  helpExample: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "var(--space-sm)",
    background: "var(--bg-primary)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
  },
  helpTip: {
    color: "var(--text-muted)",
    fontSize: "0.7rem",
    paddingLeft: "var(--space-md)",
  },
};
