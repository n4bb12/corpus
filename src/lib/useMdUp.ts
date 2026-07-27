import { useSyncExternalStore } from "react"

const MD_UP_QUERY = "(min-width: 768px)"

function subscribeMdUp(onChange: () => void) {
  const media = window.matchMedia(MD_UP_QUERY)

  media.addEventListener("change", onChange)

  return () => media.removeEventListener("change", onChange)
}

function getMdUp() {
  return window.matchMedia(MD_UP_QUERY).matches
}

/** Tailwind `md` and up. SSR snapshot assumes desktop so chat stays visible. */
export function useMdUp() {
  return useSyncExternalStore(subscribeMdUp, getMdUp, () => true)
}
