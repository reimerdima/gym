"use client"

import { useMemo } from "react"
import type { Exercise, TimeRange, ExerciseSet, UnilateralSet } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProgressTrackerProps {
  exercises: Exercise[]
  selectedDate: Date
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}

function getComparisonDate(date: Date, range: TimeRange): Date {
  const result = new Date(date)
  switch (range) {
    case "2weeks":
      result.setDate(result.getDate() - 14)
      break
    case "1month":
      result.setMonth(result.getMonth() - 1)
      break
    case "3months":
      result.setMonth(result.getMonth() - 3)
      break
    case "6months":
      result.setMonth(result.getMonth() - 6)
      break
    case "1year":
      result.setFullYear(result.getFullYear() - 1)
      break
    default:
      break
  }
  return result
}

function isUnilateralSet(set: ExerciseSet | UnilateralSet): set is UnilateralSet {
  return 'left' in set && 'right' in set
}

function getSets(exercise: Exercise): { sets: ExerciseSet[] | UnilateralSet[], isUnilateral: boolean } {
  const isUnilateral = exercise.is_unilateral || false
  
  if (exercise.sets && exercise.sets.length > 0) {
    return { sets: exercise.sets, isUnilateral }
  }
  
  return { 
    sets: [{ weight: exercise.weight, reps: exercise.reps }] as ExerciseSet[], 
    isUnilateral: false 
  }
}

function getTotalVolume(sets: ExerciseSet[] | UnilateralSet[], isUnilateral: boolean): number {
  if (isUnilateral) {
    return (sets as UnilateralSet[]).reduce((acc, set) => {
      return acc + (set.left.weight * set.left.reps) + (set.right.weight * set.right.reps)
    }, 0)
  }
  return (sets as ExerciseSet[]).reduce((acc, set) => acc + set.weight * set.reps, 0)
}

function getMaxWeight(sets: ExerciseSet[] | UnilateralSet[], isUnilateral: boolean): number {
  if (isUnilateral) {
    const weights = (sets as UnilateralSet[]).flatMap(s => [s.left.weight, s.right.weight])
    return Math.max(...weights)
  }
  return Math.max(...(sets as ExerciseSet[]).map((s) => s.weight))
}

function getTotalReps(sets: ExerciseSet[] | UnilateralSet[], isUnilateral: boolean): number {
  if (isUnilateral) {
    return (sets as UnilateralSet[]).reduce((acc, set) => acc + set.left.reps + set.right.reps, 0)
  }
  return (sets as ExerciseSet[]).reduce((acc, set) => acc + set.reps, 0)
}

export function ProgressTracker({
  exercises,
  selectedDate,
  timeRange,
  onTimeRangeChange,
}: ProgressTrackerProps) {
  const selectedDateStr = selectedDate.toISOString().split("T")[0]
  const todaysExercises = exercises.filter((e) => e.workout_date === selectedDateStr)

  const progressData = useMemo(() => {
    return todaysExercises.map((exercise) => {
      const { sets: currentSets, isUnilateral } = getSets(exercise)
      const currentVolume = getTotalVolume(currentSets, isUnilateral)
      const currentMaxWeight = getMaxWeight(currentSets, isUnilateral)
      const currentTotalReps = getTotalReps(currentSets, isUnilateral)

      const pastExercises = exercises
        .filter(
          (e) =>
            e.exercise_name.toLowerCase() === exercise.exercise_name.toLowerCase() &&
            e.workout_date < selectedDateStr
        )
        .sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())

      let comparison: Exercise | undefined

      if (timeRange === "last") {
        comparison = pastExercises[0]
      } else {
        const comparisonDate = getComparisonDate(selectedDate, timeRange)
        const comparisonDateStr = comparisonDate.toISOString().split("T")[0]
        comparison = pastExercises.find((e) => e.workout_date <= comparisonDateStr)
      }

      if (!comparison) {
        return {
          ...exercise,
          sets: currentSets,
          isUnilateral,
          isNew: true,
          volumeChange: 0,
          maxWeightChange: 0,
          totalRepsChange: 0,
          previousSets: [] as ExerciseSet[],
          previousVolume: 0,
          previousMaxWeight: 0,
          previousTotalReps: 0,
          previousDate: null,
          previousIsUnilateral: false,
        }
      }

      const { sets: previousSets, isUnilateral: previousIsUnilateral } = getSets(comparison)
      const previousVolume = getTotalVolume(previousSets, previousIsUnilateral)
      const previousMaxWeight = getMaxWeight(previousSets, previousIsUnilateral)
      const previousTotalReps = getTotalReps(previousSets, previousIsUnilateral)

      return {
        ...exercise,
        sets: currentSets,
        isUnilateral,
        isNew: false,
        volumeChange: currentVolume - previousVolume,
        maxWeightChange: currentMaxWeight - previousMaxWeight,
        totalRepsChange: currentTotalReps - previousTotalReps,
        previousSets,
        previousVolume,
        previousMaxWeight,
        previousTotalReps,
        previousDate: comparison.workout_date,
        previousIsUnilateral,
      }
    })
  }, [exercises, todaysExercises, selectedDate, selectedDateStr, timeRange])

  if (todaysExercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No exercises logged for this day</p>
        <p className="text-sm text-muted-foreground/70">Click to add your workout</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="font-semibold text-xs sm:text-sm">Progress Comparison</h3>
        <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
          <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last">vs Last Time</SelectItem>
            <SelectItem value="2weeks">vs 2 Weeks Ago</SelectItem>
            <SelectItem value="1month">vs 1 Month Ago</SelectItem>
            <SelectItem value="3months">vs 3 Months Ago</SelectItem>
            <SelectItem value="6months">vs 6 Months Ago</SelectItem>
            <SelectItem value="1year">vs 1 Year Ago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3">
        {progressData.map((item) => {
          const improved = item.volumeChange > 0 || item.maxWeightChange > 0
          const decreased = item.volumeChange < 0 && item.maxWeightChange <= 0

          return (
            <div
              key={item.id}
              className="p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm sm:text-base">{item.exercise_name}</span>
                  {item.isUnilateral && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">L/R</Badge>
                  )}
                </div>
                {item.isNew ? (
                  <Badge variant="secondary" className="text-xs">New</Badge>
                ) : improved ? (
                  <Badge className="bg-chart-2 text-chart-2-foreground text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Improved
                  </Badge>
                ) : decreased ? (
                  <Badge variant="destructive" className="text-xs">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Decreased
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Minus className="h-3 w-3 mr-1" />
                    Same
                  </Badge>
                )}
              </div>

              {/* Sets Display */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1.5">{item.sets.length} set{item.sets.length !== 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.isUnilateral ? (
                    // Unilateral sets display
                    (item.sets as UnilateralSet[]).map((set, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-0.5 px-2 py-1 rounded-md bg-muted text-xs"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">L:</span>
                          <span className="font-medium">{set.left.weight}</span>
                          <span className="text-muted-foreground text-[10px]">×</span>
                          <span className="font-medium">{set.left.reps}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">R:</span>
                          <span className="font-medium">{set.right.weight}</span>
                          <span className="text-muted-foreground text-[10px]">×</span>
                          <span className="font-medium">{set.right.reps}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Bilateral sets display
                    (item.sets as ExerciseSet[]).map((set, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                      >
                        <span className="font-medium">{set.weight}</span>
                        <span className="text-muted-foreground">lbs</span>
                        <span className="text-muted-foreground mx-0.5">×</span>
                        <span className="font-medium">{set.reps}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">Max Weight</p>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{getMaxWeight(item.sets, item.isUnilateral)} lbs</span>
                    {!item.isNew && item.maxWeightChange !== 0 && (
                      <span
                        className={`text-[10px] sm:text-xs font-medium ${
                          item.maxWeightChange > 0 ? "text-chart-2" : "text-destructive"
                        }`}
                      >
                        {item.maxWeightChange > 0 ? "+" : ""}{item.maxWeightChange}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">Total Reps</p>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{getTotalReps(item.sets, item.isUnilateral)}</span>
                    {!item.isNew && item.totalRepsChange !== 0 && (
                      <span
                        className={`text-[10px] sm:text-xs font-medium ${
                          item.totalRepsChange > 0 ? "text-chart-2" : "text-destructive"
                        }`}
                      >
                        {item.totalRepsChange > 0 ? "+" : ""}{item.totalRepsChange}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">Volume</p>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{getTotalVolume(item.sets, item.isUnilateral).toLocaleString()}</span>
                    {!item.isNew && item.volumeChange !== 0 && (
                      <span
                        className={`text-[10px] sm:text-xs font-medium ${
                          item.volumeChange > 0 ? "text-chart-2" : "text-destructive"
                        }`}
                      >
                        {item.volumeChange > 0 ? "+" : ""}{item.volumeChange.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!item.isNew && item.previousDate && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 pt-2 border-t">
                  Compared to {new Date(item.previousDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })} ({item.previousSets.length} set{item.previousSets.length !== 1 ? "s" : ""})
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
