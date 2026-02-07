"use client"

import React from "react"
import { useState, useRef, useCallback } from "react"
import useSWR from "swr"
import Image from "next/image"
import { format } from "date-fns"
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
import { Camera, Plus, Trash2, Loader2, X, ImageIcon, Eye, EyeOff } from "lucide-react"

interface ProgressPhotosProps {
  selectedDate: Date
}

const fetcher = async (dateStr: string): Promise<ProgressPhoto[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("photo_date", dateStr)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export function ProgressPhotos({ selectedDate }: ProgressPhotosProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const { data: photos = [], mutate } = useSWR(
    ["progress-photos", dateStr],
    () => fetcher(dateStr),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const compressImage = useCallback(async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = "anonymous"
      
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        const MAX_DIMENSION = 1920
        let { width, height } = img
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_DIMENSION
            width = MAX_DIMENSION
          } else {
            width = (width / height) * MAX_DIMENSION
            height = MAX_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to compress image"))
            }
          },
          "image/jpeg",
          0.85
        )
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const compressedBlob = await compressImage(file)
      const compressedFile = new File([compressedBlob], file.name, {
        type: "image/jpeg",
      })

      const formData = new FormData()
      formData.append("file", compressedFile)
      formData.append("photo_date", dateStr)

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      mutate()
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload photo. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [dateStr, mutate, compressImage])

  const handleDelete = useCallback(async (photo: ProgressPhoto) => {
    if (!confirm("Delete this photo?")) return

    setDeletingId(photo.id)

    try {
      const response = await fetch("/api/photos/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, url: photo.blob_url }),
      })

      if (!response.ok) {
        throw new Error("Delete failed")
      }

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
    <Card className="border-border/50">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-medium">
            <Camera className="h-4 w-4 text-primary" />
            Progress Photos
          </CardTitle>
          <div className="flex items-center gap-1">
            {photos.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRevealed(!isRevealed)}
                className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                aria-label={isRevealed ? "Hide photos" : "Show photos"}
              >
                {isRevealed ? (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 bg-transparent"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {photos.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center py-6 sm:py-8 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              No photos for this day
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1">
              Tap to add a progress photo
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className={`grid grid-cols-3 gap-1.5 sm:gap-2 transition-all duration-300 ${!isRevealed ? "blur-xl" : ""}`}>
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => { if (isRevealed) setViewingPhoto(photo) }}
                  className="relative aspect-square rounded-md overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                  disabled={!isRevealed}
                >
                  <Image
                    src={photo.blob_url || "/placeholder.svg"}
                    alt={`Progress photo from ${photo.photo_date}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 120px"
                    className="object-cover"
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-square rounded-md border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Plus className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Blur overlay with reveal button */}
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
        )}
      </CardContent>

      {/* Full-size photo viewer */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm sm:text-base">
                {viewingPhoto && format(new Date(viewingPhoto.photo_date), "MMMM d, yyyy")}
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
    </Card>
  )
}
