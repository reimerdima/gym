"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { BookOpen, Save, Loader2 } from "lucide-react"
import type { JournalNote } from "@/lib/types"

interface DailyNotesProps {
  selectedDate: Date
}

export function DailyNotes({ selectedDate }: DailyNotesProps) {
  const [note, setNote] = useState("")
  const [originalNote, setOriginalNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)

  const supabase = createClient()
  const dateString = format(selectedDate, "yyyy-MM-dd")

  useEffect(() => {
    async function fetchNote() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("journal_notes")
        .select("*")
        .eq("note_date", dateString)
        .single()

      if (data && !error) {
        setNote(data.content)
        setOriginalNote(data.content)
        setNoteId(data.id)
      } else {
        setNote("")
        setOriginalNote("")
        setNoteId(null)
      }
      setIsLoading(false)
    }

    fetchNote()
  }, [dateString, supabase])

  const handleSave = async () => {
    if (note === originalNote) return

    setIsSaving(true)

    if (note.trim() === "") {
      // Delete the note if empty
      if (noteId) {
        await supabase
          .from("journal_notes")
          .delete()
          .eq("id", noteId)
        setNoteId(null)
      }
    } else if (noteId) {
      // Update existing note
      const { error } = await supabase
        .from("journal_notes")
        .update({
          content: note.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)

      if (!error) {
        setOriginalNote(note.trim())
        setLastSaved(new Date())
      }
    } else {
      // Insert new note
      const { data, error } = await supabase
        .from("journal_notes")
        .insert({
          note_date: dateString,
          content: note.trim(),
        })
        .select()
        .single()

      if (!error && data) {
        setOriginalNote(note.trim())
        setLastSaved(new Date())
        setNoteId(data.id)
      }
    }

    setIsSaving(false)
  }

  const hasChanges = note !== originalNote

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-medium">
          <BookOpen className="h-4 w-4 text-primary" />
          Journal Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Write your thoughts, how you felt during the workout, goals for next time..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px] sm:min-h-[120px] resize-none text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {lastSaved && (
                  <span>Saved {format(lastSaved, "h:mm a")}</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-1.5 shrink-0 h-8 sm:h-9 text-xs sm:text-sm"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                )}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
