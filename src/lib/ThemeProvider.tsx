import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-context'

const STORAGE_KEY = 'theme'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
