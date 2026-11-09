"use client";

import { useState, useEffect, useMemo } from 'react';

export interface BookmarkItem {
  id: string;
  decisionNumber: string;
  decisionYear?: number | null;
  parties?: string | null;
  shortSummary?: string | null;
  timestamp: number;
}

const STORAGE_KEY = 'deka_bookmarks';
const SYNC_CHANNEL_NAME = 'deka_bookmarks_sync';

// Global shared state across all BookmarkButton instances on the page
let globalBookmarks: BookmarkItem[] = [];
let globalBookmarkedIdSet = new Set<string>();
let isGlobalInitialized = false;
let globalIsAdmin = false;
let globalFetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'UPDATE_BOOKMARKS' && Array.isArray(event.data.bookmarks)) {
        updateGlobalState(event.data.bookmarks, false);
      }
    };
  } catch {
    // BroadcastChannel unsupported fallback
  }
}

function updateGlobalState(items: BookmarkItem[], broadcast = true) {
  globalBookmarks = items;
  globalBookmarkedIdSet = new Set(items.map(i => i.id));
  if (broadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'UPDATE_BOOKMARKS', bookmarks: items });
    } catch {}
  }
  notifyListeners();
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Bookmark listener error:', e);
    }
  });
}

function saveToLocalStorage(items: BookmarkItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save bookmarks to localStorage', e);
  }
}

function loadInitialFromLocalStorage(): BookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Single deduplicated server fetcher
async function fetchServerBookmarks(): Promise<void> {
  if (globalFetchPromise) return globalFetchPromise;

  globalFetchPromise = (async () => {
    try {
      const res = await fetch('/api/bookmarks', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.success) return;

      if (data.isAdmin) {
        globalIsAdmin = true;
        if (Array.isArray(data.bookmarks)) {
          const serverMap = new Map<string, BookmarkItem>();
          data.bookmarks.forEach((b: any) => {
            serverMap.set(b.id, {
              id: b.id,
              decisionNumber: b.decisionNumber,
              decisionYear: b.decisionYear ? Number(b.decisionYear) : null,
              parties: b.parties || null,
              shortSummary: b.shortSummary || null,
              timestamp: b.timestamp ? Number(b.timestamp) : Date.now(),
            });
          });

          // Check if there are local-only items created offline before sign-in
          const offlineNewItems: BookmarkItem[] = [];
          for (const local of globalBookmarks) {
            if (!serverMap.has(local.id)) {
              offlineNewItems.push(local);
              serverMap.set(local.id, local);
            }
          }

          const merged = Array.from(serverMap.values()).sort((a, b) => b.timestamp - a.timestamp);
          saveToLocalStorage(merged);
          updateGlobalState(merged, true);

          // Sync any offline items back to DB in the background
          if (offlineNewItems.length > 0) {
            fetch('/api/bookmarks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'sync_all', bookmarks: offlineNewItems })
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Offline / network failure -> safe fallback to local cache
    }
  })();

  return globalFetchPromise;
}

export function useBookmarks() {
  const [, setTick] = useState(0);

  // Initialize global cache on first hook call
  if (!isGlobalInitialized && typeof window !== 'undefined') {
    const initial = loadInitialFromLocalStorage();
    globalBookmarks = initial;
    globalBookmarkedIdSet = new Set(initial.map(i => i.id));
    isGlobalInitialized = true;
  }

  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    listeners.add(handleUpdate);

    // Trigger single background server check if not already running
    fetchServerBookmarks();

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const addBookmark = (item: Omit<BookmarkItem, 'timestamp'>) => {
    const newItem: BookmarkItem = { ...item, timestamp: Date.now() };

    // 0ms instant optimistic UI update
    if (!globalBookmarkedIdSet.has(item.id)) {
      const updated = [newItem, ...globalBookmarks];
      saveToLocalStorage(updated);
      updateGlobalState(updated, true);
    }

    // Background sync to server
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', bookmark: newItem })
    }).catch((e) => {
      console.warn('Background bookmark add sync error:', e);
    });
  };

  const removeBookmark = (id: string) => {
    // 0ms instant optimistic UI update
    if (globalBookmarkedIdSet.has(id)) {
      const updated = globalBookmarks.filter(b => b.id !== id);
      saveToLocalStorage(updated);
      updateGlobalState(updated, true);
    }

    // Background sync to server
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', bookmark: { id } })
    }).catch((e) => {
      console.warn('Background bookmark remove sync error:', e);
    });
  };

  const isBookmarked = (id: string) => {
    return globalBookmarkedIdSet.has(id);
  };

  const toggleBookmark = (item: Omit<BookmarkItem, 'timestamp'>) => {
    if (isBookmarked(item.id)) {
      removeBookmark(item.id);
    } else {
      addBookmark(item);
    }
  };

  return {
    bookmarks: globalBookmarks,
    isLoaded: isGlobalInitialized,
    isAdmin: globalIsAdmin,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}
