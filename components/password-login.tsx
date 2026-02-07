"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Dumbbell, Lock } from "lucide-react"
import NeuralBackground from "@/components/ui/flow-field-background"

const MODE_STORAGE_KEY = "gym_journal_theme_mode"
const ACCENT_STORAGE_KEY = "gym_journal_accent_color"

export function PasswordLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login } = useAuth()

  // Apply saved theme on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) || "dark"
    const savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY) || "red"
    
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(savedMode)
    document.documentElement.setAttribute("data-accent", savedAccent)
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    const success = login(password)
    if (!success) {
      setError("Incorrect password")
      setPassword("")
    }
    setIsLoading(false)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Flow Field Background */}
      <div className="absolute inset-0 z-0">
        <NeuralBackground
          color="#ffffff"
          particleCount={400}
          speed={0.5}
          trailOpacity={0.08}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Gym Journal</CardTitle>
            <CardDescription>Enter your password to access your workout journal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !password}>
                {isLoading ? "Unlocking..." : "Unlock Journal"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Your session will be remembered on this device
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
