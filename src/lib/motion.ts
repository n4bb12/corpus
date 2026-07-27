export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_OUT_SOFT = [0, 0, 0.2, 1] as const
export const EASE_SPRING = [0.32, 0.72, 0, 1] as const

export const MOTION = {
  hover: 0.12,
  menu: 0.15,
  layout: 0.18,
  fade: 0.12,
  reveal: 0.32,
} as const

export const menuTransition = {
  duration: MOTION.menu,
  ease: EASE_SPRING,
}

export const layoutTransition = {
  duration: MOTION.layout,
  ease: EASE_SPRING,
}

export const fadeTransition = {
  duration: MOTION.fade,
  ease: EASE_OUT_SOFT,
}

export const revealTransition = {
  duration: MOTION.reveal,
  ease: EASE_SPRING,
}

/**
 * Route-shell entrance: skip Motion `initial` so SSR/prerender HTML is visible.
 * `initial={{ opacity: 0 }}` paints a blank first frame (and static HTML) until
 * JS hydrates and animates — it reads as “not statically rendered” / multiple paints.
 * Keep `initial` animations for client-only mounts (dialogs, list rows, tab swaps).
 *
 * Do not put `filter: blur(0px)` on page-shell `animate` — identity blur still
 * creates a compositor effect layer and can ghost box-shadows during scroll
 * (e.g. chat stick-to-bottom after sending a message).
 */
export const pageEnterInitial = false

/** Settled page-shell pose — opacity/translate only, never residual filter. */
export const pageEnterAnimate = { opacity: 1, y: 0 } as const

export const pageEnterAnimateAside = { opacity: 1, x: 0 } as const

/**
 * Keep Motion `initial` identical on server and client.
 * `useReducedMotion()` is null during SSR and may be true on the client —
 * branching `initial` on it causes React hydration mismatch #418.
 * Zero the transition instead so reduced-motion still snaps without a flash.
 */
export function respectReducedMotion<
  T extends { duration: number; delay?: number },
>(reduceMotion: boolean | null | undefined, transition: T): T {
  if (!reduceMotion) {
    return transition
  }

  return { ...transition, duration: 0, delay: 0 }
}
