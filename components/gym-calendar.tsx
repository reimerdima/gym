"use client"

import { useMemo, useRef, useEffect } from "react"
import { Dumbbell } from "lucide-react"
import type { Exercise } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GymCalendarProps {
  exercises: Exercise[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const CURRENT_YEAR = 2026

export function GymCalendar({ exercises, selectedDate, onDateSelect }: GymCalendarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const monthRefs = useRef<(HTMLDivElement | null)[]>([])

  const exercisesByDate = useMemo(() => {
    const map = new Map<string, Exercise[]>()
    for (const exercise of exercises) {
      const existing = map.get(exercise.workout_date) || []
      map.set(exercise.workout_date, [...existing, exercise])
    }
    return map
  }, [exercises])

  // Generate all months data for the year
  const allMonthsData = useMemo(() => {
    return MONTHS.map((_, monthIndex) => {
      const firstDay = new Date(CURRENT_YEAR, monthIndex, 1)
      const lastDay = new Date(CURRENT_YEAR, monthIndex + 1, 0)
      const startPadding = firstDay.getDay()
      const totalDays = lastDay.getDate()

      const days: (Date | null)[] = []
      
      for (let i = 0; i < startPadding; i++) {
        days.push(null)
      }
      
      for (let day = 1; day <= totalDays; day++) {
        days.push(new Date(CURRENT_YEAR, monthIndex, day))
      }

      return { monthIndex, days }
    })
  }, [])

  // Scroll to current month on initial load
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentMonth = selectedDate.getMonth()
      const monthElement = monthRefs.current[currentMonth]
      if (monthElement) {
        setTimeout(() => {
          monthElement.scrollIntoView({ behavior: "auto", block: "start" })
        }, 100)
      }
    }
  }, [])

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const getExerciseCount = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return exercisesByDate.get(dateStr)?.length || 0
  }

  const DayCell = ({ date }: { date: Date }) => {
    const exerciseCount = getExerciseCount(date)
    const selected = isSelected(date)
    const today = isToday(date)

    return (
      <button
        type="button"
        onClick={() => onDateSelect(date)}
        className={cn(
          "aspect-square rounded-md sm:rounded-lg flex flex-col items-center justify-center gap-0 sm:gap-0.5 text-xs sm:text-sm transition-colors relative",
          "hover:bg-accent active:bg-accent/80",
          selected && "bg-primary text-primary-foreground hover:bg-primary/90",
          today && !selected && "ring-1 sm:ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background",
          exerciseCount > 0 && !selected && "bg-chart-2/10"
        )}
      >
        <span className={cn(
          "font-medium text-xs sm:text-sm",
          selected ? "text-primary-foreground" : ""
        )}>
          {date.getDate()}
        </span>
        {exerciseCount > 0 && (
          <div className={cn(
            "flex items-center gap-0.5",
            selected ? "text-primary-foreground/80" : "text-chart-2"
          )}>
            <Dumbbell className="h-2 w-2 sm:h-3 sm:w-3" />
            <span className="text-[8px] sm:text-[10px]">{exerciseCount}</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Continuous Scroll Calendar */}
      <div 
        ref={scrollContainerRef}
        className="max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2 scroll-smooth"
      >
        <div className="flex flex-col gap-6 sm:gap-8">
          {allMonthsData.map(({ monthIndex, days }) => (
            <div 
              key={monthIndex} 
              ref={(el) => { monthRefs.current[monthIndex] = el }}
              className="flex flex-col gap-2"
            >
              <h3 className="text-sm sm:text-base font-semibold sticky top-0 bg-card py-1 z-10">
                {MONTHS[monthIndex]} {CURRENT_YEAR}
              </h3>
              
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {DAYS.map((day) => (
                  <div
                    key={`${monthIndex}-${day}`}
                    className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1"
                  >
                    <span className="sm:hidden">{day.charAt(0)}</span>
                    <span className="hidden sm:inline">{day}</span>
                  </div>
                ))}

                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${monthIndex}-${index}`} className="aspect-square" />
                  }
                  return <DayCell key={date.toISOString()} date={date} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-chart-2/10" />
          <span>Workout</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded ring-1 sm:ring-2 ring-primary" />
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}
