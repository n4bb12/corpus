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
	resolveTheme,
	setThemePreference,
	subscribeTheme,
	useThemePreference,
} from "src/lib/theme"

export function ThemeMenu() {
	const preference = useThemePreference()
	const [resolved, setResolved] = useState(() => resolveTheme(preference))

	useEffect(() => {
		applyTheme(preference)
		setResolved(resolveTheme(preference))

		const media = window.matchMedia("(prefers-color-scheme: dark)")
		const onChange = () => {
			applyTheme()
			setResolved(resolveTheme(preference))
		}

		media.addEventListener("change", onChange)

		return subscribeTheme((value) => {
			applyTheme(value)
			setResolved(resolveTheme(value))
		})
	}, [preference])

	const Icon =
		resolved === "dark" ? Moon : preference === "system" ? Monitor : Sun

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Theme"
					className="rounded-sm"
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
