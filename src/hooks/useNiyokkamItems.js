/**
 * useNiyokkamItems.js
 *
 * React hook managing the list of NiyokkamItem objects.
 * Optionally persists to localStorage so progress survives page refresh.
 *
 * Shape of each item:
 *   { id: string, date: string, content: string }
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "niyokkam_items";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @returns {{
 *   items: Array<{id:string, date:string, content:string}>,
 *   addItem: (date:string, content:string) => void,
 *   updateItem: (id:string, patch:{date?:string,content?:string}) => void,
 *   removeItem: (id:string) => void,
 *   clearItems: () => void,
 * }}
 */
export function useNiyokkamItems() {
  const [items, setItems] = useState(() => loadFromStorage());

  // Sync to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage quota exceeded — silently ignore
    }
  }, [items]);

  const addItem = useCallback((date, content) => {
    setItems((prev) => [...prev, { id: generateId(), date, content }]);
  }, []);

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  return { items, addItem, updateItem, removeItem, clearItems };
}
