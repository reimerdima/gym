"use client"

import { useEffect } from "react"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts"
import { format, subDays, subMonths, subYears, parseISO, isAfter } from "date-fns"
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Activity, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Exercise, TimeRange, ProgressDataPoint, ExerciseSet, UnilateralSet } from "@/lib/types"

const fetcher = async (): Promise<Exercise[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("workout_date", { ascending: true })

  if (error) throw error
  return data || []
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "2weeks", label: "2 Weeks" },
  { value: "1month", label: "1 Month" },
  { value: "3months", label: "3 Months" },
  { value: "6months", label: "6 Months" },
  { value: "1year", label: "1 Year" },
  { value: "alltime", label: "All Time" },
]

function getStartDate(range: TimeRange): Date | null {
  const now = new Date()
  switch (range) {
    case "2weeks":
      return subDays(now, 14)
    case "1month":
      return subMonths(now, 1)
    case "3months":
      return subMonths(now, 3)
    case "6months":
      return subMonths(now, 6)
    case "1year":
      return subYears(now, 1)
    case "alltime":
      return null
    default:
      return subMonths(now, 1)
  }
}

// Calculate a combined "strength score" that merges weight and reps
// Formula: weight * (1 + reps/30) - this gives more weight to heavier lifts
// but still rewards higher reps
function calculateStrengthScore(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

function isUnilateralSet(set: ExerciseSet | UnilateralSet): set is UnilateralSet {
  return 'left' in set && 'right' in set
}

// Get total volume from sets or fallback to weight * reps
function getExerciseVolume(exercise: Exercise): { totalWeight: number; totalReps: number; totalScore: number } {
  if (exercise.sets && exercise.sets.length > 0) {
    const isUnilateral = exercise.is_unilateral && isUnilateralSet(exercise.sets[0])
    
    if (isUnilateral) {
      const sets = exercise.sets as UnilateralSet[]
      const weights = sets.flatMap(s => [s.left.weight, s.right.weight])
      const totalWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length
      const totalReps = sets.reduce((sum, s) => sum + s.left.reps + s.right.reps, 0)
      const totalScore = sets.reduce((sum, s) => {
        return sum + calculateStrengthScore(s.left.weight, s.left.reps) + calculateStrengthScore(s.right.weight, s.right.reps)
      }, 0)
      return { totalWeight, totalReps, totalScore }
    }
    
    const sets = exercise.sets as ExerciseSet[]
    const totalWeight = sets.reduce((sum, s) => sum + s.weight, 0) / sets.length
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0)
    const totalScore = sets.reduce((sum, s) => sum + calculateStrengthScore(s.weight, s.reps), 0)
    return { totalWeight, totalReps, totalScore }
  }
  return {
    totalWeight: exercise.weight,
    totalReps: exercise.reps,
    totalScore: calculateStrengthScore(exercise.weight, exercise.reps),
  }
}

export function ProgressChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("1month")
  const [selectedExercise, setSelectedExercise] = useState<string>("all")

  const { data: exercises = [], isLoading } = useSWR(
    "exercises-progress",
    fetcher,
    { 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0,
    }
  )

  // Get unique exercise names
  const exerciseNames = useMemo(() => {
    const names = [...new Set(exercises.map((e) => e.exercise_name))]
    return names.sort()
  }, [exercises])

  // Filter and process data for the chart
  const chartData = useMemo(() => {
    const startDate = getStartDate(timeRange)

    let filtered = exercises
    if (startDate) {
      filtered = exercises.filter((e) => isAfter(parseISO(e.workout_date), startDate))
    }

    if (selectedExercise !== "all") {
      filtered = filtered.filter((e) => e.exercise_name === selectedExercise)
    }

    // Group by date and calculate average score for that day
    const byDate = filtered.reduce(
      (acc, exercise) => {
        const date = exercise.workout_date
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(exercise)
        return acc
      },
      {} as Record<string, Exercise[]>
    )

    // Create data points
    const dataPoints: ProgressDataPoint[] = Object.entries(byDate)
      .map(([date, dayExercises]) => {
        const volumes = dayExercises.map((e) => getExerciseVolume(e))
        const totalScore = volumes.reduce((sum, v) => sum + v.totalScore, 0)
        const avgWeight = volumes.reduce((sum, v) => sum + v.totalWeight, 0) / volumes.length
        const avgReps = volumes.reduce((sum, v) => sum + v.totalReps, 0) / volumes.length

        return {
          date,
          displayDate: format(parseISO(date), "MMM d"),
          score: Math.round(totalScore * 10) / 10,
          weight: Math.round(avgWeight * 10) / 10,
          reps: Math.round(avgReps * 10) / 10,
          exercise_name: selectedExercise === "all" ? "Combined" : selectedExercise,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    return dataPoints
  }, [exercises, timeRange, selectedExercise])

  // Calculate overall progress stats
  const progressStats = useMemo(() => {
    if (chartData.length < 2) {
      return { change: 0, percentage: 0, trend: "neutral" as const }
    }

    const firstScore = chartData[0].score
    const lastScore = chartData[chartData.length - 1].score
    const change = lastScore - firstScore
    const percentage = firstScore > 0 ? ((change / firstScore) * 100).toFixed(1) : 0

    return {
      change: Math.round(change * 10) / 10,
      percentage,
      trend: change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("neutral" as const),
    }
  }, [chartData])

  // Compute colors in JS for Recharts
  const primaryColor = "#4f6bed"
  const greenColor = "#22c55e"
  const redColor = "#ef4444"
  const mutedColor = "#64748b"

  const trendColor =
    progressStats.trend === "up" ? greenColor : progressStats.trend === "down" ? redColor : mutedColor

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Progress Tracker</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Track your strength gains over time
              </p>
            </div>
          </div>
          <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        </div>

        {/* Stats Card */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full shrink-0"
                  style={{ backgroundColor: `${trendColor}20` }}
                >
                  {progressStats.trend === "up" ? (
                    <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7" style={{ color: trendColor }} />
                  ) : progressStats.trend === "down" ? (
                    <TrendingDown className="h-5 w-5 sm:h-7 sm:w-7" style={{ color: trendColor }} />
                  ) : (
                    <Minus className="h-5 w-5 sm:h-7 sm:w-7" style={{ color: trendColor }} />
                  )}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Overall Progress</p>
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: trendColor }}>
                    {progressStats.trend === "up" ? "+" : ""}
                    {progressStats.percentage}%
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exercises</SelectItem>
                    {exerciseNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Range Buttons */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-1.5 sm:gap-2">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range.value)}
              className="min-w-0 px-2 sm:px-3 text-xs sm:text-sm flex-1 sm:flex-none sm:min-w-[80px]"
            >
              {range.label}
            </Button>
          ))}
        </div>

        {/* Main Chart */}
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Strength Score</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Combined metric of weight and reps (higher is better)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {chartData.length === 0 ? (
              <div className="flex h-[250px] sm:h-[400px] items-center justify-center">
                <p className="text-sm sm:text-base text-muted-foreground text-center px-4">
                  No data available for this time period. Start logging workouts!
                </p>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fill: mutedColor, fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: mutedColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "score") return [`${value}`, "Strength Score"]
                        if (name === "weight") return [`${value} lbs`, "Avg Weight"]
                        if (name === "reps") return [`${value}`, "Avg Reps"]
                        return [value, name]
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    {chartData.length > 0 && (
                      <ReferenceLine
                        y={chartData[0].score}
                        stroke={mutedColor}
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={primaryColor}
                      strokeWidth={2}
                      fill="url(#colorScore)"
                      dot={{ fill: primaryColor, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: primaryColor, strokeWidth: 2, fill: "#fff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secondary Charts */}
        <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Weight Chart */}
          <Card>
            <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Weight Progression</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Average weight lifted per session</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {chartData.length === 0 ? (
                <div className="flex h-[150px] sm:h-[200px] items-center justify-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fill: mutedColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: mutedColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value} lbs`, "Weight"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke={greenColor}
                        strokeWidth={2}
                        dot={{ fill: greenColor, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reps Chart */}
          <Card>
            <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Reps Progression</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Average reps per session</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {chartData.length === 0 ? (
                <div className="flex h-[150px] sm:h-[200px] items-center justify-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fill: mutedColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: mutedColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value}`, "Reps"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="reps"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: "#f59e0b", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-4 sm:mt-6">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2 shrink-0">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm sm:text-base">How Strength Score Works</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  The Strength Score combines your weight and reps into a single metric using the
                  formula: <code className="rounded bg-muted px-1 py-0.5 text-[10px] sm:text-xs">weight × (1 + reps/30)</code>.
                  This rewards both heavier lifts and higher rep counts, giving you a comprehensive
                  view of your overall strength progression.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
