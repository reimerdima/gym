import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
  try {
    const { id, url } = await request.json()

    if (!id || !url) {
      return NextResponse.json({ error: "Missing id or url" }, { status: 400 })
    }

    // Delete from Vercel Blob
    await del(url)

    // Delete from Supabase
    const supabase = await createClient()
    const { error } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete photo reference" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
