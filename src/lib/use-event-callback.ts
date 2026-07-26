import { useCallback, useRef } from "react"

export function useEventCallback<F extends (...args: never[]) => unknown>(
	fn: F,
): F {
	const ref = useRef(fn)
	ref.current = fn

	return useCallback(((...args) => ref.current.apply(undefined, args)) as F, [])
}
