import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "bn";
export type ThemeName = "dark" | "light";

interface PrefsState {
  lang: Lang;
  theme: ThemeName;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeName) => void;
}

export function applyPrefs(lang: Lang, theme: ThemeName) {
  document.documentElement.lang = lang === "bn" ? "bn" : "en";
  document.documentElement.dataset.theme = theme;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      lang: "en",
      theme: "dark",
      setLang: (lang) => {
        applyPrefs(lang, usePrefs.getState().theme);
        set({ lang });
      },
      setTheme: (theme) => {
        applyPrefs(usePrefs.getState().lang, theme);
        set({ theme });
      },
    }),
    { name: "bsc-prefs" },
  ),
);
