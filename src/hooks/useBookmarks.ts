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

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse bookmarks', e);
    } finally {
      setIsLoaded(true);
    }
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
    setBookmarks(prev => {
      // Prevent duplicates
      if (prev.some(b => b.id === item.id)) return prev;
      return [{ ...item, timestamp: Date.now() }, ...prev];
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
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
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}
