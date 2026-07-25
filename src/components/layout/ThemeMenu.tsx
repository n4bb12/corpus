import { Monitor, Moon, Sun } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { Button } from "src/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import {
	applyTheme,
	hydrateThemePreference,
	resolveTheme,
	setThemePreference,
	subscribeTheme,
	type ThemePreference,
} from "src/lib/theme"

export function ThemeMenu() {
	const [preference, setPreference] = useState<ThemePreference>("system")

	useEffect(() => {
		hydrateThemePreference()
		setPreference(
			(window.localStorage.getItem("corpus-theme") as ThemePreference) ||
				"system",
		)

		const media = window.matchMedia("(prefers-color-scheme: dark)")
		const onChange = () => applyTheme()
		media.addEventListener("change", onChange)

		return subscribeTheme((value) => {
			setPreference(value)
			applyTheme(value)
		})
	}, [])

	const resolved = resolveTheme(preference)
	const Icon =
		resolved === "dark" ? Moon : preference === "system" ? Monitor : Sun

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Theme"
					className="rounded-[10px]"
				>
					<Icon size={18} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="rounded-xl">
				<DropdownMenuItem onClick={() => setThemePreference("light")}>
					Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setThemePreference("dark")}>
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setThemePreference("system")}>
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
