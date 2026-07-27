import { useEffect, useRef, useState } from "react"
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

export function useResolvedTheme() {
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
    }

    return "light"
  })

  useEffect(() => {
    const sync = () => setResolved(resolveTheme(getThemePreference()))

    sync()

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", sync)
    const unsubscribe = subscribeTheme(sync)

    return () => {
      media.removeEventListener("change", sync)
      unsubscribe()
    }
  }, [])

  return resolved
}

export function useThemeAutofillRemountKey() {
  const theme = useResolvedTheme()
  const seenTheme = useRef<string | null>(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    if (seenTheme.current === null) {
      seenTheme.current = theme
      return
    }

    if (seenTheme.current === theme) {
      return
    }

    seenTheme.current = theme
    // Chrome freezes :-webkit-autofill paint across theme changes; remounting
    // drops the wash. Controlled values come back from React state.
    setEpoch((value) => value + 1)
  }, [theme])

  return epoch
}
