"use client";

import { useCallback, useEffect, useState } from "react";
import { pairKey } from "@/lib/languages";

export type HistoryItem = {
  id: string;
  source: string;
  target: string;
  from: string;
  to: string;
  at: string;
  favorite?: boolean;
};

const HISTORY_KEY = "gb-history-v1";
const CONV_KEY = "gb-conversation-v1";
const PINS_KEY = "gb-pinned-pairs-v1";

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const persist = (next: HistoryItem[]) => {
    setItems(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const add = useCallback(
    (e: Omit<HistoryItem, "id" | "at" | "favorite">) => {
      persist([
        { ...e, id: crypto.randomUUID(), at: new Date().toISOString(), favorite: false },
        ...items,
      ].slice(0, 200));
    },
    [items]
  );

  const toggleFavorite = (id: string) =>
    persist(items.map((h) => (h.id === id ? { ...h, favorite: !h.favorite } : h)));

  const clear = () => persist([]);
  const exportJson = (filenamePrefix = "history") => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filenamePrefix}-${Date.now()}.json`;
    a.click();
  };

  return { items, add, toggleFavorite, clear, exportJson };
}

export function useConversation() {
  const [messages, setMessages] = useState<
    Array<{ speaker: "a" | "b"; from: string; to: string; source: string; target: string; at: string }>
  >([]);
  useEffect(() => {
    try {
      setMessages(JSON.parse(localStorage.getItem(CONV_KEY) || "[]"));
    } catch {
      setMessages([]);
    }
  }, []);
  const push = (m: Omit<(typeof messages)[0], "at">) => {
    const next = [...messages, { ...m, at: new Date().toISOString() }];
    setMessages(next);
    localStorage.setItem(CONV_KEY, JSON.stringify(next));
  };
  const clear = () => {
    setMessages([]);
    localStorage.removeItem(CONV_KEY);
  };
  return { messages, push, clear };
}

export function usePinnedPairs() {
  const [pins, setPins] = useState<string[]>([]);
  useEffect(() => {
    try {
      setPins(JSON.parse(localStorage.getItem(PINS_KEY) || "[]"));
    } catch {
      setPins([]);
    }
  }, []);
  const togglePin = (from: string, to: string) => {
    const key = pairKey(from, to);
    const next = pins.includes(key) ? pins.filter((p) => p !== key) : [...pins, key];
    setPins(next);
    localStorage.setItem(PINS_KEY, JSON.stringify(next));
  };
  const isPinned = (from: string, to: string) => pins.includes(pairKey(from, to));
  return { pins, togglePin, isPinned };
}
