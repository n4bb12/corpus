export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const MOTION = {
	hover: 0.12,
	menu: 0.15,
	layout: 0.18,
} as const

export const menuTransition = {
	duration: MOTION.menu,
	ease: EASE_OUT,
}

export const layoutTransition = {
	duration: MOTION.layout,
	ease: EASE_OUT,
}
