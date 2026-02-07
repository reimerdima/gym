"use client"

import { useAuth } from "@/lib/auth-context"
import { GymJournal } from "@/components/gym-journal"
import { PasswordLogin } from "@/components/password-login"

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <PasswordLogin />
  }

  return <GymJournal />
}
