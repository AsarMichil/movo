import { browser } from "$app/environment"

type Theme = "light" | "dark" | "system"

function getCookie(name: string): string | null {
  if (!browser) return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

function setCookie(name: string, value: string) {
  if (!browser) return
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`
}

function deleteCookie(name: string) {
  if (!browser) return
  document.cookie = `${name}=; path=/; max-age=0`
}

class ThemeContext {
  theme = $state<Theme>("system")
  isDarkMode = $state<boolean>(false)

  constructor() {
    if (browser) {
      this.initialize()
    }
  }

  private initialize() {
    const stored = getCookie("theme") as Theme | null

    if (stored === "light" || stored === "dark") {
      this.theme = stored
    } else {
      this.theme = "system"
    }

    this.updateDarkMode()

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this.theme === "system") {
        this.updateDarkMode()
      }
    })
  }

  private updateDarkMode() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (this.theme === "system") {
      this.isDarkMode = prefersDark
    } else {
      this.isDarkMode = this.theme === "dark"
    }
  }

  toggle() {
    if (this.theme === "light") {
      this.theme = "dark"
      setCookie("theme", "dark")
    } else if (this.theme === "dark") {
      this.theme = "system"
      deleteCookie("theme")
    } else {
      this.theme = "light"
      setCookie("theme", "light")
    }

    this.updateDarkMode()
  }

  get mapColorScheme(): "light" | "dark" | "adaptive" {
    if (this.theme === "system") {
      return "adaptive"
    }
    return this.theme
  }
}

export const themeContext = new ThemeContext()
