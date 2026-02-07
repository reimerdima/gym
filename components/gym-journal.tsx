"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Exercise, TimeRange } from "@/lib/types"
import { GymCalendar } from "@/components/gym-calendar"
import { ExerciseForm } from "@/components/exercise-form"
import { ProgressTracker } from "@/components/progress-tracker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, LogOut, Plus, TrendingUp, ImageIcon } from "lucide-react"
import Link from "next/link"
import { DailyNotes } from "@/components/daily-notes"
import { MacroTracker } from "@/components/macro-tracker"
import { ProgressPhotos } from "@/components/progress-photos"
import { ThemeSettings } from "@/components/theme-settings"
import { useAuth } from "@/lib/auth-context"

const fetcher = async (): Promise<Exercise[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("workout_date", { ascending: false })

  if (error) throw error
  return data || []
}

export function GymJournal() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>("last")
  const { logout } = useAuth()

  const { data: exercises = [], mutate } = useSWR(
    "exercises",
    fetcher,
    { 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0,
    }
  )

  const selectedDateStr = selectedDate.toISOString().split("T")[0]
  const todaysExercises = exercises.filter((e) => e.workout_date === selectedDateStr)

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const handleSave = useCallback(() => {
    mutate()
    setIsDialogOpen(false)
  }, [mutate])

  const handleDeleteAll = useCallback(async () => {
    const supabase = createClient()
    const dateStr = selectedDate.toISOString().split("T")[0]
    
    await supabase
      .from("exercises")
      .delete()
      .eq("workout_date", dateStr)
    
    mutate()
    setIsDialogOpen(false)
  }, [selectedDate, mutate])

  const handleLogout = () => {
    logout()
  }

  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Welcome back, Reimer!</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeSettings />
            <Link href="/album">
              <Button variant="outline" size="sm" className="px-2 sm:px-3 bg-transparent">
                <ImageIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Album</span>
              </Button>
            </Link>
            <Link href="/progress">
              <Button variant="outline" size="sm" className="px-2 sm:px-3 bg-transparent">
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Progress</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Lock</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Calendar</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <GymCalendar
                exercises={exercises}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base truncate">{formatSelectedDate()}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                      {todaysExercises.length} exercise{todaysExercises.length !== 1 ? "s" : ""} logged
                    </p>
                  </div>
                  <Button size="sm" onClick={handleOpenDialog} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" />
                    {todaysExercises.length > 0 ? "Edit" : "Add"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <ProgressTracker
                  exercises={exercises}
                  selectedDate={selectedDate}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </CardContent>
            </Card>

            <MacroTracker selectedDate={selectedDate} />

            <DailyNotes selectedDate={selectedDate} />

            <ProgressPhotos selectedDate={selectedDate} />
          </div>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {todaysExercises.length > 0 ? "Edit Workout" : "Log Workout"}
            </DialogTitle>
            <DialogDescription>
              {formatSelectedDate()}
            </DialogDescription>
          </DialogHeader>
          <ExerciseForm
            date={selectedDate}
            existingExercises={todaysExercises}
            onSave={handleSave}
            onDeleteAll={handleDeleteAll}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
