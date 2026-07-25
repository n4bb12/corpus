import { useStore } from "zustand"
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

export function useLastSignInMethod() {
	return useStore(store, (state) => state.method)
}
