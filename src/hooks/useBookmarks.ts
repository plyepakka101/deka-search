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

const STORAGE_KEY = 'deka_bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // Load from local storage on mount, then sync with server if admin
  useEffect(() => {
    let localItems: BookmarkItem[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        localItems = JSON.parse(stored);
        setBookmarks(localItems);
      }
    } catch (e) {
      console.error('Failed to parse bookmarks', e);
    } finally {
      setIsLoaded(true);
    }

    // Check with server
    fetch('/api/bookmarks')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.isAdmin) {
          setIsAdmin(true);
          if (Array.isArray(data.bookmarks)) {
            const map = new Map<string, BookmarkItem>();
            // Server items from DB
            data.bookmarks.forEach((b: any) => {
              map.set(b.id, {
                id: b.id,
                decisionNumber: b.decisionNumber,
                decisionYear: b.decisionYear,
                parties: b.parties,
                shortSummary: b.shortSummary,
                timestamp: b.timestamp ? Number(b.timestamp) : Date.now(),
              });
            });
            // Merge any existing local items
            localItems.forEach(b => {
              if (!map.has(b.id)) {
                map.set(b.id, b);
              }
            });
            const merged = Array.from(map.values());
            setBookmarks(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save to local storage whenever bookmarks change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Failed to save bookmarks', e);
    }
  }, [bookmarks, isLoaded]);

  const addBookmark = (item: Omit<BookmarkItem, 'timestamp'>) => {
    const newItem: BookmarkItem = { ...item, timestamp: Date.now() };
    setBookmarks(prev => {
      // Prevent duplicates
      if (prev.some(b => b.id === item.id)) return prev;
      return [newItem, ...prev];
    });

    // Sync to DB if admin (safe no-op for regular users)
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', bookmark: newItem })
    }).catch(() => {});
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));

    // Sync to DB if admin (safe no-op for regular users)
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', bookmark: { id } })
    }).catch(() => {});
  };

  const isBookmarked = (id: string) => {
    return bookmarks.some(b => b.id === id);
  };

  const toggleBookmark = (item: Omit<BookmarkItem, 'timestamp'>) => {
    if (isBookmarked(item.id)) {
      removeBookmark(item.id);
    } else {
      addBookmark(item);
    }
  };

  return {
    bookmarks,
    isLoaded,
    isAdmin,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}
