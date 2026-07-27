import { useEffect, useState } from "react"
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

/** Last method from storage after hydration; ignores later clicks until reload. */
export function useLastSignInMethod() {
  const [method, setMethod] = useState<SignInMethod | null>()

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setMethod(store.getState().method)
      return
    }

    return store.persist.onFinishHydration(() => {
      setMethod(store.getState().method)
    })
  }, [])

  return method
}
