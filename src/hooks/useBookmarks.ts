"use client";

import { useState, useEffect } from 'react';

export interface BookmarkItem {
  id: string;
  decisionNumber: string;
  decisionYear?: number | null;
  parties?: string | null;
  shortSummary?: string | null;
  timestamp: number;
}

/**
 * idle        - nothing has been checked yet
 * syncing     - talking to the server
 * synced      - admin session, server and this device agree
 * local-only  - not an admin session: bookmarks live on this device only
 * error       - server unreachable / DB write failed (see syncMessage)
 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'local-only' | 'error';

const STORAGE_KEY = 'deka_bookmarks';
// Ids this device last saw on the server. A local item that is missing from the
// server AND listed here was deleted on another device -> drop it locally.
const SYNCED_KEY = 'deka_bookmarks_synced_ids';
// Ids removed on this device whose deletion has not been confirmed by the server yet.
const REMOVED_KEY = 'deka_bookmarks_pending_removed';
const SYNC_CHANNEL_NAME = 'deka_bookmarks_sync';
const MIN_REFETCH_MS = 15000;

// Global shared state across all BookmarkButton instances on the page
let globalBookmarks: BookmarkItem[] = [];
let globalBookmarkedIdSet = new Set<string>();
let isGlobalInitialized = false;
let globalIsAdmin = false;
let globalSyncStatus: SyncStatus = 'idle';
let globalSyncMessage = '';
let globalLastFetchAt = 0;
let globalFetchPromise: Promise<void> | null = null;
let refetchTriggersBound = false;
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

function setSyncState(status: SyncStatus, message = '') {
  globalSyncStatus = status;
  globalSyncMessage = message;
  notifyListeners();
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
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Id sets are always read fresh from localStorage so every tab sees the same state.
function readIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v: unknown) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('Failed to save bookmark sync state', e);
  }
}

interface ServerBookmarkRow {
  id: string;
  decisionNumber: string;
  decisionYear?: number | null;
  parties?: string | null;
  shortSummary?: string | null;
  timestamp?: number | null;
}

interface ServerResponse {
  success?: boolean;
  isAdmin?: boolean;
  savedToDb?: boolean;
  bookmarks?: ServerBookmarkRow[];
  error?: string;
  message?: string;
}

function toItem(b: ServerBookmarkRow): BookmarkItem {
  return {
    id: b.id,
    decisionNumber: b.decisionNumber,
    decisionYear: b.decisionYear ? Number(b.decisionYear) : null,
    parties: b.parties || null,
    shortSummary: b.shortSummary || null,
    timestamp: b.timestamp ? Number(b.timestamp) : Date.now(),
  };
}

interface PostResult {
  ok: boolean;
  savedToDb: boolean;
  message?: string;
}

// Never throws; reports whether the row really reached the database.
async function postBookmarks(body: unknown): Promise<PostResult> {
  try {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data: ServerResponse | null = null;
    try {
      data = (await res.json()) as ServerResponse;
    } catch {}
    if (!res.ok || !data?.success) {
      return {
        ok: false,
        savedToDb: false,
        message: data?.error || `เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${res.status})`,
      };
    }
    return { ok: true, savedToDb: Boolean(data.savedToDb), message: data.message };
  } catch {
    return { ok: false, savedToDb: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ออฟไลน์?)' };
  }
}

function applyPostResult(r: PostResult) {
  if (!r.ok) setSyncState('error', r.message || 'ซิงค์ไม่สำเร็จ');
  else if (r.savedToDb) setSyncState('synced');
  else setSyncState('local-only');
}

/**
 * Server is the source of truth for admin sessions:
 *  - server rows are kept (except ones this device removed but could not delete yet)
 *  - local rows missing from the server are
 *      * dropped, if this device previously saw them on the server (deleted elsewhere)
 *      * uploaded, otherwise (created offline, before sign-in, or restored from a backup)
 */
async function reconcileWithServer(serverRows: ServerBookmarkRow[]) {
  const serverMap = new Map<string, BookmarkItem>();
  for (const row of serverRows) {
    if (row?.id) serverMap.set(row.id, toItem(row));
  }

  const removed = readIdSet(REMOVED_KEY);
  const synced = readIdSet(SYNCED_KEY);

  const toDelete: string[] = [];
  removed.forEach(id => {
    if (serverMap.has(id)) toDelete.push(id);
  });

  const result = new Map<string, BookmarkItem>();
  serverMap.forEach((item, id) => {
    if (!removed.has(id)) result.set(id, item);
  });

  const toUpload: BookmarkItem[] = [];
  for (const local of globalBookmarks) {
    if (removed.has(local.id) || result.has(local.id)) continue;
    if (synced.has(local.id)) continue; // deleted on another device
    result.set(local.id, local);
    toUpload.push(local);
  }

  const merged = Array.from(result.values()).sort((a, b) => b.timestamp - a.timestamp);
  saveToLocalStorage(merged);
  updateGlobalState(merged, true);

  let ok = true;
  if (toDelete.length > 0 || toUpload.length > 0) {
    const r = await postBookmarks({ action: 'sync_ops', upserts: toUpload, removes: toDelete });
    ok = r.ok && r.savedToDb;
    if (!ok) {
      setSyncState(r.ok ? 'local-only' : 'error', r.message || 'ซิงค์ไม่สำเร็จ');
    }
  }

  // Update trackers (re-read first: the user may have toggled a bookmark during the request)
  const newSynced = new Set<string>();
  serverMap.forEach((_, id) => {
    if (!removed.has(id)) newSynced.add(id);
  });
  if (ok) toUpload.forEach(i => newSynced.add(i.id));

  const currentSynced = readIdSet(SYNCED_KEY);
  synced.forEach(id => {
    if (!newSynced.has(id)) currentSynced.delete(id);
  });
  newSynced.forEach(id => currentSynced.add(id));
  writeIdSet(SYNCED_KEY, currentSynced);

  const currentRemoved = readIdSet(REMOVED_KEY);
  removed.forEach(id => {
    if (ok || !toDelete.includes(id)) currentRemoved.delete(id);
  });
  writeIdSet(REMOVED_KEY, currentRemoved);

  if (ok) setSyncState('synced');
}

// Single deduplicated server fetcher (throttled unless forced)
async function fetchServerBookmarks(force = false): Promise<void> {
  if (globalFetchPromise) return globalFetchPromise;
  if (!force && Date.now() - globalLastFetchAt < MIN_REFETCH_MS) return;

  globalFetchPromise = (async () => {
    if (globalSyncStatus !== 'synced') setSyncState('syncing');
    try {
      const res = await fetch('/api/bookmarks', { cache: 'no-store' });
      let data: ServerResponse | null = null;
      try {
        data = (await res.json()) as ServerResponse;
      } catch {}

      if (!res.ok || !data?.success) {
        setSyncState('error', data?.error || `เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${res.status})`);
        return;
      }

      globalIsAdmin = Boolean(data.isAdmin);
      if (!globalIsAdmin) {
        setSyncState('local-only');
        return;
      }

      await reconcileWithServer(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    } catch {
      // Offline / network failure -> keep using the local cache
      setSyncState('error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ออฟไลน์?) — ใช้ข้อมูลที่เก็บในเครื่องนี้ไปก่อน');
    } finally {
      globalLastFetchAt = Date.now();
      globalFetchPromise = null;
    }
  })();

  return globalFetchPromise;
}

// Pick up changes made on other devices when the tab becomes visible / comes back online
function bindRefetchTriggers() {
  if (refetchTriggersBound || typeof window === 'undefined') return;
  refetchTriggersBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void fetchServerBookmarks();
  });
  window.addEventListener('online', () => {
    void fetchServerBookmarks(true);
  });
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

    bindRefetchTriggers();
    // Trigger a background server check (deduplicated + throttled)
    void fetchServerBookmarks();

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

    // Re-adding cancels any pending local removal
    const removed = readIdSet(REMOVED_KEY);
    if (removed.delete(item.id)) writeIdSet(REMOVED_KEY, removed);

    // Background sync to server. If it isn't confirmed, the item is simply not in the
    // "synced" set yet, so the next reconcile uploads it.
    void postBookmarks({ action: 'add', bookmark: newItem }).then(r => {
      applyPostResult(r);
      if (r.ok && r.savedToDb) {
        const synced = readIdSet(SYNCED_KEY);
        synced.add(item.id);
        writeIdSet(SYNCED_KEY, synced);
      }
    });
  };

  const removeBookmark = (id: string) => {
    // 0ms instant optimistic UI update
    if (globalBookmarkedIdSet.has(id)) {
      const updated = globalBookmarks.filter(b => b.id !== id);
      saveToLocalStorage(updated);
      updateGlobalState(updated, true);
    }

    // Remember the removal until the server confirms it, so it can't resurrect later
    const removed = readIdSet(REMOVED_KEY);
    removed.add(id);
    writeIdSet(REMOVED_KEY, removed);

    void postBookmarks({ action: 'remove', bookmark: { id } }).then(r => {
      applyPostResult(r);
      if (r.ok && r.savedToDb) {
        const pending = readIdSet(REMOVED_KEY);
        pending.delete(id);
        writeIdSet(REMOVED_KEY, pending);
        const synced = readIdSet(SYNCED_KEY);
        synced.delete(id);
        writeIdSet(SYNCED_KEY, synced);
      }
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

  const retrySync = () => fetchServerBookmarks(true);

  return {
    bookmarks: globalBookmarks,
    isLoaded: isGlobalInitialized,
    isAdmin: globalIsAdmin,
    syncStatus: globalSyncStatus,
    syncMessage: globalSyncMessage,
    retrySync,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}
