export function requireEnv(name: string): string {
	const value = process.env[name]

	if (!value) {
		throw new Error(`${name} is not set`)
	}

	return value
}

export function requireViteEnv(name: `VITE_${string}`): string {
	const value = import.meta.env[name]

	if (typeof value !== "string" || !value) {
		throw new Error(`${name} is not set`)
	}

	return value
}
