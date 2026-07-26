import { describe, expect, test } from "bun:test"
import { respectReducedMotion } from "src/lib/motion"

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
