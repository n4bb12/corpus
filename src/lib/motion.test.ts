import { describe, expect, test } from "bun:test"
import { motion } from "motion/react"
import { createElement as h } from "react"
import { renderToString } from "react-dom/server"
import {
  pageEnterAnimate,
  pageEnterAnimateAside,
  pageEnterInitial,
  respectReducedMotion,
} from "src/lib/motion"

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
          animate: pageEnterAnimateAside,
        },
        "Sources",
      ),
    )

    expect(hidden).toContain("opacity:0")
    expect(visible).not.toContain("opacity:0")
    expect(visible).not.toContain("filter:")
    expect(visible).toContain("Sources")
  })

  test("does not leave residual filter:blur(0px) on page shells", () => {
    // Identity blur still creates a compositor effect layer. Inside a
    // scrollable chat thread that causes ghosted/skewed bubble shadows on
    // stick-to-bottom scroll. Page shells must not keep filter after enter.
    expect(pageEnterAnimate).toMatchInlineSnapshot(`
			{
			  "opacity": 1,
			  "y": 0,
			}
		`)
    expect(pageEnterAnimateAside).toMatchInlineSnapshot(`
			{
			  "opacity": 1,
			  "x": 0,
			}
		`)

    const residual = renderToString(
      h(
        motion.section,
        {
          initial: pageEnterInitial,
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        },
        "Chat",
      ),
    )
    const clean = renderToString(
      h(
        motion.section,
        {
          initial: pageEnterInitial,
          animate: pageEnterAnimate,
        },
        "Chat",
      ),
    )

    expect(residual).toContain("filter:blur(0px)")
    expect(clean).not.toContain("filter:")
  })
})
