import { THEME_STORAGE_KEY } from "src/lib/theme"

const themeBootScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export function ThemeScript() {
	return (
		<script
			dangerouslySetInnerHTML={{
				__html: themeBootScript,
			}}
		/>
	)
}
