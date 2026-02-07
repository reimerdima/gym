"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import type { Exercise, ExerciseSet, UnilateralSet } from "@/lib/types"
import { Plus, Trash2, Copy } from "lucide-react"

interface ExerciseFormProps {
  date: Date
  existingExercises: Exercise[]
  onSave: () => void
  onDeleteAll?: () => void
}

interface SetEntry {
  weight: string
  reps: string
}

interface UnilateralSetEntry {
  left: { weight: string; reps: string }
  right: { weight: string; reps: string }
}

interface ExerciseEntry {
  id?: string
  exercise_name: string
  is_unilateral: boolean
  sets: SetEntry[]
  unilateralSets: UnilateralSetEntry[]
}

const COMMON_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-ups",
  "Lat Pulldown",
  "Leg Press",
  "Lunges",
  "Bicep Curl",
  "Tricep Extension",
  "Shoulder Lateral Raise",
  "Leg Curl",
  "Leg Extension",
  "Calf Raise",
  "Dumbbell Curl",
  "Dumbbell Row",
  "Single Leg Press",
  "Bulgarian Split Squat",
  "Single Arm Press",
]

function isUnilateralSet(set: ExerciseSet | UnilateralSet): set is UnilateralSet {
  return 'left' in set && 'right' in set
}

export function ExerciseForm({ date, existingExercises, onSave, onDeleteAll }: ExerciseFormProps) {
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (existingExercises.length > 0) {
      setEntries(
        existingExercises.map((e) => {
          const isUnilateral = e.is_unilateral || false
          
          if (isUnilateral && e.sets && e.sets.length > 0 && isUnilateralSet(e.sets[0])) {
            return {
              id: e.id,
              exercise_name: e.exercise_name,
              is_unilateral: true,
              sets: [],
              unilateralSets: (e.sets as UnilateralSet[]).map((s) => ({
                left: { weight: s.left.weight.toString(), reps: s.left.reps.toString() },
                right: { weight: s.right.weight.toString(), reps: s.right.reps.toString() },
              })),
            }
          }
          
          return {
            id: e.id,
            exercise_name: e.exercise_name,
            is_unilateral: false,
            sets: e.sets && e.sets.length > 0 && !isUnilateralSet(e.sets[0])
              ? (e.sets as ExerciseSet[]).map((s) => ({ weight: s.weight.toString(), reps: s.reps.toString() }))
              : [{ weight: e.weight.toString(), reps: e.reps.toString() }],
            unilateralSets: [],
          }
        })
      )
    } else {
      setEntries([{ 
        exercise_name: "", 
        is_unilateral: false,
        sets: [{ weight: "", reps: "" }],
        unilateralSets: []
      }])
    }
  }, [existingExercises])

  const addExercise = () => {
    setEntries([...entries, { 
      exercise_name: "", 
      is_unilateral: false,
      sets: [{ weight: "", reps: "" }],
      unilateralSets: []
    }])
  }

  const removeExercise = async (index: number) => {
    const entry = entries[index]
    if (entry.id) {
      await supabase.from("exercises").delete().eq("id", entry.id)
    }
    setEntries(entries.filter((_, i) => i !== index))
    onSave()
  }

  const toggleUnilateral = (index: number) => {
    const newEntries = [...entries]
    const entry = newEntries[index]
    
    if (!entry.is_unilateral) {
      // Convert to unilateral
      const lastSet = entry.sets[entry.sets.length - 1]
      newEntries[index] = {
        ...entry,
        is_unilateral: true,
        unilateralSets: [{
          left: { weight: lastSet?.weight || "", reps: lastSet?.reps || "" },
          right: { weight: lastSet?.weight || "", reps: lastSet?.reps || "" },
        }],
      }
    } else {
      // Convert to bilateral
      const lastSet = entry.unilateralSets[entry.unilateralSets.length - 1]
      newEntries[index] = {
        ...entry,
        is_unilateral: false,
        sets: [{
          weight: lastSet?.left.weight || "",
          reps: lastSet?.left.reps || "",
        }],
      }
    }
    
    setEntries(newEntries)
  }

  const addSet = (exerciseIndex: number) => {
    const newEntries = [...entries]
    const entry = newEntries[exerciseIndex]
    
    if (entry.is_unilateral) {
      const lastSet = entry.unilateralSets[entry.unilateralSets.length - 1]
      newEntries[exerciseIndex].unilateralSets.push({
        left: { weight: lastSet?.left.weight || "", reps: lastSet?.left.reps || "" },
        right: { weight: lastSet?.right.weight || "", reps: lastSet?.right.reps || "" },
      })
    } else {
      const lastSet = entry.sets[entry.sets.length - 1]
      newEntries[exerciseIndex].sets.push({ 
        weight: lastSet?.weight || "", 
        reps: lastSet?.reps || "" 
      })
    }
    
    setEntries(newEntries)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newEntries = [...entries]
    const entry = newEntries[exerciseIndex]
    
    if (entry.is_unilateral) {
      if (entry.unilateralSets.length > 1) {
        newEntries[exerciseIndex].unilateralSets = entry.unilateralSets.filter((_, i) => i !== setIndex)
        setEntries(newEntries)
      }
    } else {
      if (entry.sets.length > 1) {
        newEntries[exerciseIndex].sets = entry.sets.filter((_, i) => i !== setIndex)
        setEntries(newEntries)
      }
    }
  }

  const updateExerciseName = (index: number, value: string) => {
    const newEntries = [...entries]
    newEntries[index] = { ...newEntries[index], exercise_name: value }
    setEntries(newEntries)

    if (value.length > 0) {
      const filtered = COMMON_EXERCISES.filter((e) =>
        e.toLowerCase().includes(value.toLowerCase())
      )
      setSuggestions(filtered)
      setActiveSuggestionIndex(index)
    } else {
      setSuggestions([])
      setActiveSuggestionIndex(null)
    }
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: string) => {
    const newEntries = [...entries]
    newEntries[exerciseIndex].sets[setIndex] = {
      ...newEntries[exerciseIndex].sets[setIndex],
      [field]: value,
    }
    setEntries(newEntries)
  }

  const updateUnilateralSet = (
    exerciseIndex: number, 
    setIndex: number, 
    side: 'left' | 'right', 
    field: 'weight' | 'reps', 
    value: string
  ) => {
    const newEntries = [...entries]
    newEntries[exerciseIndex].unilateralSets[setIndex] = {
      ...newEntries[exerciseIndex].unilateralSets[setIndex],
      [side]: {
        ...newEntries[exerciseIndex].unilateralSets[setIndex][side],
        [field]: value,
      },
    }
    setEntries(newEntries)
  }

  const selectSuggestion = (index: number, suggestion: string) => {
    updateExerciseName(index, suggestion)
    setSuggestions([])
    setActiveSuggestionIndex(null)
  }

  const handleSave = async () => {
    setLoading(true)

    const workoutDate = date.toISOString().split("T")[0]

    for (const entry of entries) {
      if (!entry.exercise_name) continue
      
      let setsData: ExerciseSet[] | UnilateralSet[]
      let firstWeight = 0
      let firstReps = 0

      if (entry.is_unilateral) {
        const validSets = entry.unilateralSets.filter(
          (s) => s.left.weight && s.left.reps && s.right.weight && s.right.reps
        )
        if (validSets.length === 0) continue

        setsData = validSets.map((s) => ({
          left: { weight: parseFloat(s.left.weight), reps: parseInt(s.left.reps) },
          right: { weight: parseFloat(s.right.weight), reps: parseInt(s.right.reps) },
        }))
        firstWeight = (setsData[0] as UnilateralSet).left.weight
        firstReps = (setsData[0] as UnilateralSet).left.reps
      } else {
        const validSets = entry.sets.filter((s) => s.weight && s.reps)
        if (validSets.length === 0) continue

        setsData = validSets.map((s) => ({
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps),
        }))
        firstWeight = (setsData[0] as ExerciseSet).weight
        firstReps = (setsData[0] as ExerciseSet).reps
      }

      const exerciseData = {
        exercise_name: entry.exercise_name,
        weight: firstWeight,
        reps: firstReps,
        sets: setsData,
        is_unilateral: entry.is_unilateral,
        workout_date: workoutDate,
      }

      if (entry.id) {
        await supabase
          .from("exercises")
          .update(exerciseData)
          .eq("id", entry.id)
      } else {
        await supabase.from("exercises").insert(exerciseData)
      }
    }

    setLoading(false)
    onSave()
  }

  const getSetsCount = (entry: ExerciseEntry) => {
    return entry.is_unilateral ? entry.unilateralSets.length : entry.sets.length
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col gap-3 sm:gap-4 max-h-[50vh] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2">
        {entries.map((entry, exerciseIndex) => (
          <div key={exerciseIndex} className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                Exercise {exerciseIndex + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeExercise(exerciseIndex)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Label htmlFor={`exercise-${exerciseIndex}`} className="text-xs">
                Exercise Name
              </Label>
              <Input
                id={`exercise-${exerciseIndex}`}
                placeholder="e.g., Bench Press"
                value={entry.exercise_name}
                onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                className="mt-1 h-9 sm:h-10 text-sm"
              />
              {activeSuggestionIndex === exerciseIndex && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent active:bg-accent/80"
                      onClick={() => selectSuggestion(exerciseIndex, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unilateral Toggle */}
            <div className="flex items-center justify-between py-1">
              <Label htmlFor={`unilateral-${exerciseIndex}`} className="text-xs cursor-pointer">
                Unilateral (Left/Right)
              </Label>
              <Switch
                id={`unilateral-${exerciseIndex}`}
                checked={entry.is_unilateral}
                onCheckedChange={() => toggleUnilateral(exerciseIndex)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Sets</Label>
                <span className="text-xs text-muted-foreground">{getSetsCount(entry)} set{getSetsCount(entry) !== 1 ? "s" : ""}</span>
              </div>
              
              {entry.is_unilateral ? (
                // Unilateral sets UI
                entry.unilateralSets.map((set, setIndex) => (
                  <div key={setIndex} className="flex flex-col gap-1.5 p-2 rounded-md bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                        {setIndex + 1}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                        disabled={entry.unilateralSets.length <= 1}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Left side */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground w-8 shrink-0">Left</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="lbs"
                        value={set.left.weight}
                        onChange={(e) => updateUnilateralSet(exerciseIndex, setIndex, 'left', 'weight', e.target.value)}
                        className="h-7 sm:h-8 text-xs flex-1"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        value={set.left.reps}
                        onChange={(e) => updateUnilateralSet(exerciseIndex, setIndex, 'left', 'reps', e.target.value)}
                        className="h-7 sm:h-8 text-xs flex-1"
                      />
                    </div>
                    
                    {/* Right side */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground w-8 shrink-0">Right</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="lbs"
                        value={set.right.weight}
                        onChange={(e) => updateUnilateralSet(exerciseIndex, setIndex, 'right', 'weight', e.target.value)}
                        className="h-7 sm:h-8 text-xs flex-1"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        value={set.right.reps}
                        onChange={(e) => updateUnilateralSet(exerciseIndex, setIndex, 'right', 'reps', e.target.value)}
                        className="h-7 sm:h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                ))
              ) : (
                // Bilateral sets UI
                entry.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {setIndex + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="lbs"
                        value={set.weight}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", e.target.value)}
                        className="h-8 sm:h-9 text-sm"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        value={set.reps}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", e.target.value)}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      disabled={entry.sets.length <= 1}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </div>
                ))
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addSet(exerciseIndex)}
                className="w-full h-7 sm:h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3 mr-1.5" />
                Add Set
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addExercise}
        className="w-full bg-transparent h-9 sm:h-10 text-sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Exercise
      </Button>

      <Button onClick={handleSave} disabled={loading} className="w-full h-10 sm:h-11 text-sm sm:text-base">
        {loading ? "Saving..." : "Save Workout"}
      </Button>

      {existingExercises.length > 0 && onDeleteAll && (
        <Button
          type="button"
          variant="ghost"
          onClick={onDeleteAll}
          className="w-full h-9 sm:h-10 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Entire Workout
        </Button>
      )}
    </div>
  )
}
