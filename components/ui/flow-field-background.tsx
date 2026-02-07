"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface NeuralBackgroundProps {
  className?: string
  color?: string
  trailOpacity?: number
  particleCount?: number
  speed?: number
  avoidCenter?: boolean
  avoidCenterRadius?: number
}

export default function NeuralBackground({
  className,
  color = "#ffffff",
  trailOpacity = 0.15,
  particleCount = 600,
  speed = 1,
  avoidCenter = false,
  avoidCenterRadius = 200,
}: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef(color)

  // Update color ref without re-running the entire effect
  useEffect(() => {
    colorRef.current = color
  }, [color])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = container.clientWidth
    let height = container.clientHeight
    let particles: Particle[] = []
    let animationFrameId: number
    let mouse = { x: -1000, y: -1000 }

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      age: number
      life: number

      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.vx = 0
        this.vy = 0
        this.age = 0
        this.life = Math.random() * 400 + 200

        // If avoiding center, push initial position away from center
        if (avoidCenter) {
          const cx = width / 2
          const cy = height / 2
          const dx = this.x - cx
          const dy = this.y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < avoidCenterRadius) {
            const angle = Math.random() * Math.PI * 2
            const r = avoidCenterRadius + Math.random() * 100
            this.x = cx + Math.cos(angle) * r
            this.y = cy + Math.sin(angle) * r
          }
        }
      }

      update() {
        // Slow, gentle flow field
        const angle = (Math.cos(this.x * 0.003) + Math.sin(this.y * 0.003)) * Math.PI

        this.vx += Math.cos(angle) * 0.04 * speed
        this.vy += Math.sin(angle) * 0.04 * speed

        // Mouse interaction - gentle push away
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const interactionRadius = 120

        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius
          this.vx -= dx * force * 0.02
          this.vy -= dy * force * 0.02
        }

        // Avoid center zone
        if (avoidCenter) {
          const cx = width / 2
          const cy = height / 2
          const cdx = this.x - cx
          const cdy = this.y - cy
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy)

          if (cDist < avoidCenterRadius) {
            const pushStrength = ((avoidCenterRadius - cDist) / avoidCenterRadius) * 0.15
            if (cDist > 0) {
              this.vx += (cdx / cDist) * pushStrength
              this.vy += (cdy / cDist) * pushStrength
            } else {
              // If exactly at center, push in random direction
              const rAngle = Math.random() * Math.PI * 2
              this.vx += Math.cos(rAngle) * pushStrength
              this.vy += Math.sin(rAngle) * pushStrength
            }
          }
        }

        this.x += this.vx
        this.y += this.vy
        // Very high damping for slow, underwater-like movement
        this.vx *= 0.92
        this.vy *= 0.92

        this.age++
        if (this.age > this.life) {
          this.reset()
        }

        if (this.x < 0) this.x = width
        if (this.x > width) this.x = 0
        if (this.y < 0) this.y = height
        if (this.y > height) this.y = 0
      }

      reset() {
        // Reset particles away from center if avoiding
        if (avoidCenter) {
          const cx = width / 2
          const cy = height / 2
          const side = Math.floor(Math.random() * 4)
          switch (side) {
            case 0: // top
              this.x = Math.random() * width
              this.y = Math.random() * (cy - avoidCenterRadius)
              break
            case 1: // bottom
              this.x = Math.random() * width
              this.y = cy + avoidCenterRadius + Math.random() * (height - cy - avoidCenterRadius)
              break
            case 2: // left
              this.x = Math.random() * (cx - avoidCenterRadius)
              this.y = Math.random() * height
              break
            case 3: // right
              this.x = cx + avoidCenterRadius + Math.random() * (width - cx - avoidCenterRadius)
              this.y = Math.random() * height
              break
          }
        } else {
          this.x = Math.random() * width
          this.y = Math.random() * height
        }
        this.vx = 0
        this.vy = 0
        this.age = 0
        this.life = Math.random() * 400 + 200
      }

      draw(context: CanvasRenderingContext2D) {
        context.fillStyle = colorRef.current
        const alpha = 1 - Math.abs(this.age / this.life - 0.5) * 2
        context.globalAlpha = alpha * 0.8
        context.beginPath()
        context.arc(this.x, this.y, 1.2, 0, Math.PI * 2)
        context.fill()
      }
    }

    const init = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const animate = () => {
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`
      ctx.fillRect(0, 0, width, height)

      for (const p of particles) {
        p.update()
        p.draw(ctx)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      width = container.clientWidth
      height = container.clientHeight
      init()
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    init()
    animate()

    window.addEventListener("resize", handleResize)
    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("resize", handleResize)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [trailOpacity, particleCount, speed, avoidCenter, avoidCenterRadius])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full bg-black overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}
