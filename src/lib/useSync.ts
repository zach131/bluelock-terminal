// src/lib/useSync.ts

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { SaveStatus } from "@/types";

interface UseSyncOptions<T> {
  cloudKey: string;
  defaultValue: T;
  debounceMs?: number;
}

type BroadcastMessage<T> =
  | { type: "heartbeat"; tabId: string }
  | { type: "release"; tabId: string }
  | { type: "write"; tabId: string; key: string; data: T }
  | { type: "saved"; tabId: string; key: string; data: T };

function generateTabId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

const HEARTBEAT_INTERVAL = 2000;
const STALE_TAB_THRESHOLD = 10_000;
const LEADER_CHECK_INTERVAL = 1000;
const LEADER_ELECTION_DELAY = 500;
const IDLE_DELAY = 2000;

export function useSync<T extends object>({
  cloudKey,
  defaultValue,
  debounceMs = 1000,
}: UseSyncOptions<T>) {
  const localKey = `blt_${cloudKey}`;

  // Memoize defaultValue by serialized content to avoid re-triggering effects
  const defaultValueSerialized = JSON.stringify(defaultValue);
  const stableDefaultValue = useMemo<T>(
    () => JSON.parse(defaultValueSerialized) as T,
    [defaultValueSerialized],
  );

  const [data, setDataInternal] = useState<T>(stableDefaultValue);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<T>(data);
  const dirtyRef = useRef(false);
  const skipNextEffectRef = useRef(0); // count-based instead of boolean flag
  const isLeaderRef = useRef(false);
  const tabIdRef = useRef(generateTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const knownTabsRef = useRef<Map<string, number>>(new Map());
  const leaderCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const hasBroadcastChannel = useRef(typeof BroadcastChannel !== "undefined");
  const loadingRef = useRef(true);
  const mountedRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const savingPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeout.current) {
      clearTimeout(idleTimeout.current);
      idleTimeout.current = null;
    }
  }, []);

  const scheduleIdleStatus = useCallback(() => {
    clearIdleTimeout();
    idleTimeout.current = setTimeout(() => {
      if (mountedRef.current) {
        setSaveStatus("idle");
      }
      idleTimeout.current = null;
    }, IDLE_DELAY);
  }, [clearIdleTimeout]);

  const broadcastWrite = useCallback(
    (newData: T) => {
      channelRef.current?.postMessage({
        type: "write",
        tabId: tabIdRef.current,
        key: cloudKey,
        data: newData,
      } satisfies BroadcastMessage<T>);
    },
    [cloudKey],
  );

  const saveToCloud = useCallback(
    async (dataToSave: T) => {
      clearIdleTimeout();
      if (mountedRef.current) setSaveStatus("saving");

      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: cloudKey, payload: dataToSave }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? "Save failed");
        }

        // Only clear dirty if data hasn't changed since we started saving
        const currentSerialized = JSON.stringify(dataRef.current);
        const savedSerialized = JSON.stringify(dataToSave);
        if (currentSerialized === savedSerialized) {
          dirtyRef.current = false;
        }

        if (mountedRef.current) {
          setSaveStatus("saved");
          scheduleIdleStatus();
        }

        localStorage.setItem(localKey, JSON.stringify(dataToSave));

        channelRef.current?.postMessage({
          type: "saved",
          tabId: tabIdRef.current,
          key: cloudKey,
          data: dataToSave,
        } satisfies BroadcastMessage<T>);
      } catch {
        if (mountedRef.current) setSaveStatus("error");
        // Persist locally as fallback
        try {
          localStorage.setItem(localKey, JSON.stringify(dataToSave));
        } catch {
          // localStorage might be full
        }
      }
    },
    [cloudKey, localKey, clearIdleTimeout, scheduleIdleStatus],
  );

  // Use a ref for scheduleSave to break the circular dependency chain
  const scheduleSaveRef = useRef<(dataToSave: T) => void>(() => {});

  useEffect(() => {
    scheduleSaveRef.current = (dataToSave: T) => {
      if (!isLeaderRef.current) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setSaveStatus("syncing");
      saveTimeout.current = setTimeout(() => {
        saveToCloud(dataToSave);
      }, debounceMs);
    };
  }, [saveToCloud, debounceMs]);

  const scheduleSave = useCallback((dataToSave: T) => {
    scheduleSaveRef.current(dataToSave);
  }, []);

  const evaluateLeadership = useCallback(() => {
    if (!hasBroadcastChannel.current) return;

    const now = Date.now();
    const myId = tabIdRef.current;

    for (const [id, lastSeen] of knownTabsRef.current.entries()) {
      if (now - lastSeen > STALE_TAB_THRESHOLD) {
        knownTabsRef.current.delete(id);
      }
    }

    const aliveIds = [myId, ...knownTabsRef.current.keys()].sort();
    const newIsLeader = aliveIds[0] === myId;

    if (newIsLeader !== isLeaderRef.current) {
      isLeaderRef.current = newIsLeader;

      if (newIsLeader) {
        // Became leader — pick up any pending dirty writes
        if (dirtyRef.current && !loadingRef.current) {
          scheduleSave(dataRef.current);
        }
      } else {
        // Lost leadership — cancel any pending saves
        if (saveTimeout.current) {
          clearTimeout(saveTimeout.current);
          saveTimeout.current = null;
        }
      }
    }
  }, [scheduleSave]);

  // BroadcastChannel setup and leader election
  useEffect(() => {
    if (!hasBroadcastChannel.current) {
      console.warn(
        "BroadcastChannel not available. Falling back to single-tab sync — multi-tab race conditions possible.",
      );
      isLeaderRef.current = true;
      return;
    }

    const channel = new BroadcastChannel(`blt_sync_${cloudKey}`);
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent<BroadcastMessage<T>>) => {
      const msg = event.data;
      if (!msg?.type || !msg?.tabId) return;
      if (msg.tabId === tabIdRef.current) return; // Ignore own messages

      switch (msg.type) {
        case "heartbeat": {
          knownTabsRef.current.set(msg.tabId, Date.now());
          evaluateLeadership();
          break;
        }

        case "release": {
          knownTabsRef.current.delete(msg.tabId);
          evaluateLeadership();
          break;
        }

        case "write": {
          if (msg.key === cloudKey) {
            skipNextEffectRef.current += 1;
            dataRef.current = msg.data;
            setDataInternal(msg.data);
            try {
              localStorage.setItem(localKey, JSON.stringify(msg.data));
            } catch {
              /* quota */
            }

            // Leader should save this data
            if (isLeaderRef.current) {
              dirtyRef.current = true;
              scheduleSave(msg.data);
            }
          }
          break;
        }

        case "saved": {
          if (msg.key === cloudKey) {
            const currentSerialized = JSON.stringify(dataRef.current);
            const savedSerialized = JSON.stringify(msg.data);

            if (currentSerialized === savedSerialized) {
              dirtyRef.current = false;
              if (mountedRef.current) {
                setSaveStatus("saved");
                scheduleIdleStatus();
              }
            }

            // Update local storage regardless
            try {
              localStorage.setItem(localKey, JSON.stringify(msg.data));
            } catch {
              /* quota */
            }

            // If our data matches, also update state to be safe
            if (!dirtyRef.current) {
              skipNextEffectRef.current += 1;
              dataRef.current = msg.data;
              setDataInternal(msg.data);
            }
          }
          break;
        }
      }
    };

    channel.addEventListener("message", handleMessage);

    const sendHeartbeat = () => {
      channel.postMessage({
        type: "heartbeat",
        tabId: tabIdRef.current,
      } satisfies BroadcastMessage<T>);
    };

    // Send initial heartbeat, then start interval
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL,
    );
    leaderCheckIntervalRef.current = setInterval(
      evaluateLeadership,
      LEADER_CHECK_INTERVAL,
    );

    // Don't assume leadership immediately — wait for election
    isLeaderRef.current = false;
    setTimeout(evaluateLeadership, LEADER_ELECTION_DELAY);

    const handleUnload = () => {
      channel.postMessage({
        type: "release",
        tabId: tabIdRef.current,
      } satisfies BroadcastMessage<T>);
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      handleUnload();
      channel.removeEventListener("message", handleMessage);
      channel.close();
      channelRef.current = null;
      window.removeEventListener("beforeunload", handleUnload);

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (leaderCheckIntervalRef.current) {
        clearInterval(leaderCheckIntervalRef.current);
        leaderCheckIntervalRef.current = null;
      }
      clearIdleTimeout();
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, [
    cloudKey,
    localKey,
    evaluateLeadership,
    clearIdleTimeout,
    scheduleIdleStatus,
    scheduleSave,
  ]);

  // Initial cloud load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const shouldFetch = !hasLoadedRef.current;
      hasLoadedRef.current = true;

      if (!shouldFetch) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      try {
        const res = await fetch(
          `/api/sync?key=${encodeURIComponent(cloudKey)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (json.success && json.data) {
          if (cancelled) return;
          skipNextEffectRef.current += 1;
          setDataInternal(json.data);
          dataRef.current = json.data;
          setSaveStatus("saved");
          try {
            localStorage.setItem(localKey, JSON.stringify(json.data));
          } catch {
            /* quota */
          }
        } else {
          throw new Error("Empty response");
        }
      } catch {
        if (cancelled) return;
        const local = readLocalStorage<T>(localKey);
        if (local) {
          skipNextEffectRef.current += 1;
          setDataInternal(local);
          dataRef.current = local;
          setSaveStatus("local");
        } else {
          skipNextEffectRef.current += 1;
          setDataInternal(stableDefaultValue);
          dataRef.current = stableDefaultValue;
        }
      }

      if (!cancelled) {
        setLoading(false);
        loadingRef.current = false;
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [cloudKey, localKey, stableDefaultValue]);

  // React to local data changes — schedule save if dirty
  useEffect(() => {
    if (loading) return;

    // Skip effects triggered by remote/load updates
    if (skipNextEffectRef.current > 0) {
      skipNextEffectRef.current -= 1;
      return;
    }

    dirtyRef.current = true;

    if (isLeaderRef.current) {
      scheduleSave(data);
    }
  }, [data, loading, scheduleSave]);

  const setData = useCallback(
    (value: T | ((prev: T) => T)) => {
      setDataInternal((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        dataRef.current = next;
        dirtyRef.current = true;
        broadcastWrite(next);
        return next;
      });
    },
    [broadcastWrite],
  );

  const update = useCallback(
    (updater: (prev: T) => T) => {
      setData(updater);
    },
    [setData],
  );

  const saveNow = useCallback(async () => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    // Avoid concurrent saves
    if (savingPromiseRef.current) {
      await savingPromiseRef.current;
    }
    const promise = saveToCloud(dataRef.current);
    savingPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      savingPromiseRef.current = null;
    }
  }, [saveToCloud]);

  return { data, loading, saveStatus, update, setData, saveNow };
}
