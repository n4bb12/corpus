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
