import { describe, expect, test } from "bun:test"
import { motion } from "motion/react"
import { createElement as h } from "react"
import { renderToString } from "react-dom/server"
import { pageEnterInitial, respectReducedMotion } from "src/lib/motion"

describe("respectReducedMotion", () => {
	test("leaves transition alone when reduced motion is off or unknown", () => {
		const transition = { duration: 0.32, delay: 0.05, ease: [0, 0, 1, 1] }

		expect(respectReducedMotion(null, transition)).toMatchInlineSnapshot(`
			{
			  "delay": 0.05,
			  "duration": 0.32,
			  "ease": [
			    0,
			    0,
			    1,
			    1,
			  ],
			}
		`)
		expect(respectReducedMotion(false, transition)).toMatchInlineSnapshot(`
			{
			  "delay": 0.05,
			  "duration": 0.32,
			  "ease": [
			    0,
			    0,
			    1,
			    1,
			  ],
			}
		`)
		expect(respectReducedMotion(undefined, transition)).toMatchInlineSnapshot(`
			{
			  "delay": 0.05,
			  "duration": 0.32,
			  "ease": [
			    0,
			    0,
			    1,
			    1,
			  ],
			}
		`)
	})

	test("zeros duration and delay when reduced motion is on", () => {
		expect(
			respectReducedMotion(true, {
				duration: 0.32,
				delay: 0.05,
				ease: [0, 0, 1, 1],
			}),
		).toMatchInlineSnapshot(`
			{
			  "delay": 0,
			  "duration": 0,
			  "ease": [
			    0,
			    0,
			    1,
			    1,
			  ],
			}
		`)
	})
})

describe("pageEnterInitial", () => {
	test("keeps route-shell SSR HTML visible (no opacity:0 first paint)", () => {
		expect(pageEnterInitial).toBe(false)

		const hidden = renderToString(
			h(
				motion.aside,
				{
					initial: { opacity: 0, x: -14, filter: "blur(4px)" },
					animate: { opacity: 1, x: 0, filter: "blur(0px)" },
				},
				"Sources",
			),
		)
		const visible = renderToString(
			h(
				motion.aside,
				{
					initial: pageEnterInitial,
					animate: { opacity: 1, x: 0, filter: "blur(0px)" },
				},
				"Sources",
			),
		)

		expect(hidden).toContain("opacity:0")
		expect(visible).not.toContain("opacity:0")
		expect(visible).toContain("Sources")
	})
})
