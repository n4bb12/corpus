import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

const store = createStore<{ openId: string | null }>(() => ({
  openId: null,
}))

export function openMenu(id: string) {
  store.setState({ openId: id })
}

export function closeMenu(id: string) {
  if (store.getState().openId === id) {
    store.setState({ openId: null })
  }
}

export function useIsMenuOpen(id: string) {
  return useStore(store, (state) => state.openId === id)
}
