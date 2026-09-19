"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    try {
      // 1. Dark Mode initialization
      const savedDark = localStorage.getItem("deka_dark_mode");
      let isDark = false;
      if (savedDark !== null) {
        isDark = savedDark === "true";
      } else {
        const storedSettings = localStorage.getItem("thai_law_mate_settings");
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed.darkMode) isDark = true;
        }
      }

      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      // 2. Font Size initialization
      const savedSize = localStorage.getItem("preferred-font-size");
      if (savedSize) {
        const size = parseInt(savedSize, 10);
        if (!isNaN(size)) {
          document.documentElement.style.setProperty("--content-font-size", `${size}px`);
        }
      }
    } catch (e) {
      console.error("ThemeInitializer error:", e);
    }
  }, []);

  return null;
}
