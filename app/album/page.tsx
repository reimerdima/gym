"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import Image from "next/image"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import type { ProgressPhoto } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Camera, Trash2, Loader2, X, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { PasswordLogin } from "@/components/password-login"
import { useTheme } from "@/lib/theme-context"

const fetcher = async (): Promise<ProgressPhoto[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .order("photo_date", { ascending: false })

  if (error) throw error
  return data || []
}

interface GroupedPhotos {
  date: string
  displayDate: string
  photos: ProgressPhoto[]
}

export default function AlbumPage() {
  const { isAuthenticated } = useAuth()
  useTheme() // apply theme

  if (!isAuthenticated) {
    return <PasswordLogin />
  }

  return <AlbumContent />
}

function AlbumContent() {
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  const { data: allPhotos = [], isLoading, mutate } = useSWR(
    "all-progress-photos",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
    }
  )

  // Group photos by date
  const grouped: GroupedPhotos[] = allPhotos.reduce<GroupedPhotos[]>((acc, photo) => {
    const existing = acc.find((g) => g.date === photo.photo_date)
    if (existing) {
      existing.photos.push(photo)
    } else {
      acc.push({
        date: photo.photo_date,
        displayDate: format(parseISO(photo.photo_date), "EEEE, MMMM d, yyyy"),
        photos: [photo],
      })
    }
    return acc
  }, [])

  const handleDelete = useCallback(async (photo: ProgressPhoto) => {
    if (!confirm("Delete this photo?")) return

    setDeletingId(photo.id)

    try {
      const response = await fetch("/api/photos/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, url: photo.blob_url }),
      })

      if (!response.ok) throw new Error("Delete failed")

      mutate()
      setViewingPhoto(null)
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete photo. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }, [mutate])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold">Photo Album</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allPhotos.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRevealed(!isRevealed)}
                className="gap-1.5 bg-transparent"
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reveal</span>
                  </>
                )}
              </Button>
            )}
            <span className="text-xs sm:text-sm text-muted-foreground">
              {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : allPhotos.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Camera className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-center">No progress photos yet</p>
              <p className="text-sm text-muted-foreground/70 text-center mt-1">
                Add photos from the main journal to see them here
              </p>
              <Link href="/" className="mt-4">
                <Button variant="outline" size="sm" className="bg-transparent">
                  Go to Journal
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8">
            {grouped.map((group) => (
              <div key={group.date}>
                <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-foreground/80">
                  {group.displayDate}
                </h2>
                <div className="relative">
                  <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 transition-all duration-300 ${!isRevealed ? "blur-xl" : ""}`}>
                    {group.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => { if (isRevealed) setViewingPhoto(photo) }}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                        disabled={!isRevealed}
                      >
                        <Image
                          src={photo.blob_url || "/placeholder.svg"}
                          alt={`Progress photo from ${group.displayDate}`}
                          fill
                          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsRevealed(true)}
                        className="gap-1.5 shadow-lg"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Tap to reveal
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Full-size photo viewer */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm sm:text-base">
                {viewingPhoto && format(parseISO(viewingPhoto.photo_date), "MMMM d, yyyy")}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => viewingPhoto && handleDelete(viewingPhoto)}
                  disabled={deletingId === viewingPhoto?.id}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deletingId === viewingPhoto?.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setViewingPhoto(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          {viewingPhoto && (
            <div className="relative w-full aspect-[3/4] sm:aspect-video max-h-[70vh]">
              <Image
                src={viewingPhoto.blob_url || "/placeholder.svg"}
                alt={`Progress photo from ${viewingPhoto.photo_date}`}
                fill
                sizes="(max-width: 640px) 95vw, 800px"
                className="object-contain"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
