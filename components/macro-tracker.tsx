"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Plus, Trash2, Utensils, Flame, Beef, Wheat, Droplet, Loader2 } from "lucide-react"
import type { FoodEntry } from "@/lib/types"

interface MacroTrackerProps {
  selectedDate: Date
}

interface FoodFormEntry {
  id?: string
  food_name: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

const emptyEntry: FoodFormEntry = {
  food_name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
}

export function MacroTracker({ selectedDate }: MacroTrackerProps) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formEntries, setFormEntries] = useState<FoodFormEntry[]>([{ ...emptyEntry }])
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()
  const dateString = format(selectedDate, "yyyy-MM-dd")

  useEffect(() => {
    async function fetchEntries() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("entry_date", dateString)
        .order("created_at", { ascending: true })

      if (data && !error) {
        setEntries(data)
      } else {
        setEntries([])
      }
      setIsLoading(false)
    }

    fetchEntries()
  }, [dateString, supabase])

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fat: acc.fat + (entry.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [entries])

  const handleOpenDialog = () => {
    if (entries.length > 0) {
      setFormEntries(
        entries.map((e) => ({
          id: e.id,
          food_name: e.food_name,
          calories: e.calories.toString(),
          protein: e.protein.toString(),
          carbs: e.carbs.toString(),
          fat: e.fat.toString(),
        }))
      )
    } else {
      setFormEntries([{ ...emptyEntry }])
    }
    setIsDialogOpen(true)
  }

  const addEntry = () => {
    setFormEntries([...formEntries, { ...emptyEntry }])
  }

  const removeEntry = (index: number) => {
    setFormEntries(formEntries.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, field: keyof FoodFormEntry, value: string) => {
    const updated = [...formEntries]
    updated[index] = { ...updated[index], [field]: value }
    setFormEntries(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)

    // Delete entries that were removed
    const existingIds = formEntries.filter((e) => e.id).map((e) => e.id)
    const toDelete = entries.filter((e) => !existingIds.includes(e.id))
    
    for (const entry of toDelete) {
      await supabase.from("food_entries").delete().eq("id", entry.id)
    }

    // Upsert entries
    for (const entry of formEntries) {
      if (!entry.food_name.trim()) continue

      const data = {
        entry_date: dateString,
        food_name: entry.food_name.trim(),
        calories: parseInt(entry.calories) || 0,
        protein: parseFloat(entry.protein) || 0,
        carbs: parseFloat(entry.carbs) || 0,
        fat: parseFloat(entry.fat) || 0,
      }

      if (entry.id) {
        await supabase.from("food_entries").update(data).eq("id", entry.id)
      } else {
        await supabase.from("food_entries").insert(data)
      }
    }

    // Refresh data
    const { data } = await supabase
      .from("food_entries")
      .select("*")
      .eq("entry_date", dateString)
      .order("created_at", { ascending: true })

    if (data) setEntries(data)
    setIsSaving(false)
    setIsDialogOpen(false)
  }

  const handleDeleteAll = async () => {
    setIsSaving(true)
    await supabase.from("food_entries").delete().eq("entry_date", dateString)
    setEntries([])
    setIsSaving(false)
    setIsDialogOpen(false)
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-medium">
              <Utensils className="h-4 w-4 text-primary" />
              Food & Macros
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleOpenDialog} className="h-7 sm:h-8 text-xs sm:text-sm bg-transparent">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {entries.length > 0 ? "Edit" : "Add"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              No food logged for this day
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Totals Summary */}
              <div className="grid grid-cols-4 gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium">Cal</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold">{totals.calories}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-red-500">
                    <Beef className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium">Pro</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold">{totals.protein.toFixed(0)}g</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Wheat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium">Carb</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold">{totals.carbs.toFixed(0)}g</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-blue-500">
                    <Droplet className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium">Fat</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold">{totals.fat.toFixed(0)}g</span>
                </div>
              </div>

              {/* Food List */}
              <div className="flex flex-col gap-1.5">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs sm:text-sm"
                  >
                    <span className="font-medium truncate flex-1 mr-2">{entry.food_name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {entry.calories} cal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Food</DialogTitle>
            <DialogDescription>
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-2 sm:gap-3 max-h-[50vh] overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2">
              {formEntries.map((entry, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Food Name</Label>
                    <Input
                      placeholder="e.g., Chicken Breast"
                      value={entry.food_name}
                      onChange={(e) => updateEntry(index, "food_name", e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Calories</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={entry.calories}
                        onChange={(e) => updateEntry(index, "calories", e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Protein (g)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={entry.protein}
                        onChange={(e) => updateEntry(index, "protein", e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Carbs (g)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={entry.carbs}
                        onChange={(e) => updateEntry(index, "carbs", e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fat (g)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={entry.fat}
                        onChange={(e) => updateEntry(index, "fat", e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addEntry} className="w-full h-9 text-sm bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Food Item
            </Button>

            <Button onClick={handleSave} disabled={isSaving} className="w-full h-10 text-sm">
              {isSaving ? "Saving..." : "Save"}
            </Button>

            {entries.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDeleteAll}
                disabled={isSaving}
                className="w-full h-9 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Food Entries
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
