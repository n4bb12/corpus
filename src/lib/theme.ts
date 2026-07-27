import { useStore } from "zustand"
import { type PersistStorage, persist } from "zustand/middleware"
import { createStore } from "zustand/vanilla"

export type ThemePreference = "light" | "dark" | "system"

export const THEME_STORAGE_KEY = "corpus-theme"

type ThemeState = {
  preference: ThemePreference
}

function isThemePreference(value: string): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system"
}

const themeStorage: PersistStorage<ThemeState> = {
  getItem: (name) => {
    if (typeof window === "undefined") {
      return null
    }

    const raw = window.localStorage.getItem(name)

    if (!raw) {
      return null
    }

    if (isThemePreference(raw)) {
      return {
        state: {
          preference: raw,
        },
      }
    }

    try {
      return JSON.parse(raw) as { state: ThemeState }
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(name, value.state.preference)
  },
  removeItem: (name) => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.removeItem(name)
  },
}

const store = createStore(
  persist<ThemeState>(
    () => ({
      preference: "system",
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: themeStorage,
    },
  ),
)

export function getThemePreference() {
  return store.getState().preference
}

export function setThemePreference(preference: ThemePreference) {
  store.setState({ preference })
  applyTheme(preference)
}

export function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") {
    return preference
  }

  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function applyTheme(preference: ThemePreference = getThemePreference()) {
  if (typeof document === "undefined") {
    return
  }

  const resolved = resolveTheme(preference)
  document.documentElement.classList.toggle("dark", resolved === "dark")
  document.documentElement.style.colorScheme = resolved
}

export function subscribeTheme(
  listener: (preference: ThemePreference) => void,
) {
  return store.subscribe((state) => listener(state.preference))
}

export function useThemePreference() {
  return useStore(store, (state) => state.preference)
}
