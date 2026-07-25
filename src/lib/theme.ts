import { createStore } from "zustand/vanilla"

export type ThemePreference = "light" | "dark" | "system"

type ThemeState = {
	preference: ThemePreference
}

const STORAGE_KEY = "corpus-theme"

function readStoredPreference(): ThemePreference {
	if (typeof window === "undefined") {
		return "system"
	}

	const value = window.localStorage.getItem(STORAGE_KEY)

	if (value === "light" || value === "dark" || value === "system") {
		return value
	}

	return "system"
}

const store = createStore<ThemeState>(() => ({
	preference: "system",
}))

export function getThemePreference() {
	return store.getState().preference
}

export function setThemePreference(preference: ThemePreference) {
	store.setState({ preference })

	if (typeof window !== "undefined") {
		window.localStorage.setItem(STORAGE_KEY, preference)
	}

	applyTheme(preference)
}

export function hydrateThemePreference() {
	const preference = readStoredPreference()
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
	return store.getState().preference
}
