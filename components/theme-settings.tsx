"use client"

import { useTheme, type AccentColor } from "@/lib/theme-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: "red", label: "Red", color: "bg-red-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "yellow", label: "Yellow", color: "bg-yellow-500" },
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "pink", label: "Pink", color: "bg-pink-500" },
]

export function ThemeSettings() {
  const { mode, accentColor, setMode, setAccentColor } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="px-2 sm:px-3 bg-transparent">
          <Settings className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Mode</p>
          <div className="flex gap-2">
            <Button
              variant={mode === "light" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("light")}
            >
              <Sun className="h-4 w-4 mr-1" />
              Light
            </Button>
            <Button
              variant={mode === "dark" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("dark")}
            >
              <Moon className="h-4 w-4 mr-1" />
              Dark
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="p-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Accent Color</p>
          <div className="grid grid-cols-3 gap-2">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-md transition-colors",
                  "hover:bg-accent",
                  accentColor === color.value && "bg-accent ring-2 ring-primary"
                )}
              >
                <div className={cn("w-6 h-6 rounded-full", color.color)} />
                <span className="text-xs">{color.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
