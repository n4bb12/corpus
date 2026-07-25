import { useState } from "react"
import { persist } from "zustand/middleware"
import { createStore } from "zustand/vanilla"

export type SignInMethod = "google" | "email"

type LastSignInMethodState = {
	method: SignInMethod | null
}

const store = createStore(
	persist<LastSignInMethodState>(
		() => ({
			method: null,
		}),
		{
			name: "corpus-last-sign-in-method",
		},
	),
)

export function getLastSignInMethod() {
	return store.getState().method
}

export function setLastSignInMethod(method: SignInMethod) {
	store.setState({ method })
}

/** Snapshot of the last method from storage at mount time (survives click updates until reload). */
export function useLastSignInMethod() {
	const [method] = useState(() => getLastSignInMethod())

	return method
}
