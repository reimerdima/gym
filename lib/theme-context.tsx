"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type AccentColor = "red" | "orange" | "pink" | "green" | "blue" | "yellow"
export type ThemeMode = "light" | "dark"

interface ThemeContextType {
  mode: ThemeMode
  accentColor: AccentColor
  setMode: (mode: ThemeMode) => void
  setAccentColor: (color: AccentColor) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const MODE_STORAGE_KEY = "gym_journal_theme_mode"
const ACCENT_STORAGE_KEY = "gym_journal_accent_color"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark")
  const [accentColor, setAccentColorState] = useState<AccentColor>("blue")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved preferences, default to dark if not set
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null
    const savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor | null
    
    setModeState(savedMode || "dark")
    if (savedAccent) setAccentColorState(savedAccent)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    // Apply theme mode
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(mode)
    
    // Apply accent color
    root.setAttribute("data-accent", accentColor)
  }, [mode, accentColor, mounted])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(MODE_STORAGE_KEY, newMode)
  }

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color)
    localStorage.setItem(ACCENT_STORAGE_KEY, color)
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ mode, accentColor, setMode, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
