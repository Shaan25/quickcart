"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Platform } from "../lib/types";

export interface BasketEntry {
  groupId: string;
  productName: string;
  category: string;
  quantity: number;
  platforms: Partial<Record<Platform, { price: number; availability: boolean }>>;
}

interface BasketContextValue {
  items: BasketEntry[];
  addItem: (entry: Omit<BasketEntry, "quantity">) => void;
  removeItem: (groupId: string) => void;
  updateQty: (groupId: string, qty: number) => void;
  clearBasket: () => void;
  totalCount: number;
}

const BasketContext = createContext<BasketContextValue | null>(null);
const STORAGE_KEY = "quickcart_basket";

function load(): BasketEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BasketEntry[]) : [];
  } catch {
    return [];
  }
}

function save(items: BasketEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketEntry[]>(load);

  const addItem = useCallback((entry: Omit<BasketEntry, "quantity">) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.groupId === entry.groupId);
      const next = exists
        ? prev.map((i) => i.groupId === entry.groupId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...entry, quantity: 1 }];
      save(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((groupId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.groupId !== groupId);
      save(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((groupId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => { const next = prev.filter((i) => i.groupId !== groupId); save(next); return next; });
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) => i.groupId === groupId ? { ...i, quantity: qty } : i);
      save(next);
      return next;
    });
  }, []);

  const clearBasket = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <BasketContext.Provider value={{ items, addItem, removeItem, updateQty, clearBasket, totalCount }}>
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within BasketProvider");
  return ctx;
}
