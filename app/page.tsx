"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react"
import {
  Sparkles,
  Settings,
  Play,
  Download,
  Gem,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Trash2,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react"

interface Account {
  email: string
  password: string
  sessionToken?: string
  gems?: number
  timestamp: string
  status: "success" | "failed"
  error?: string
}

interface ApiResponse<T = unknown> {
  success?: boolean
  error?: string
  connected?: boolean
  data?: T
}

interface AccountsResponse {
  accounts: Account[]
  stats: {
    successful: number
    failed: number
    total: number
  }
}

interface BalanceResponse {
  gems: number
  increased?: boolean
  diff?: number
  error?: string
}

interface GenerateResponse {
  success: boolean
  account?: Account
  error?: string
}

const api = {
  baseUrl: "/api/proxy",

  async health(): Promise<{ status: string; connected: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error("Backend unavailable")
      const data = await res.json()
      return { status: data.status, connected: true }
    } catch {
      return { status: "disconnected", connected: false }
    }
  },

  async getAccounts(): Promise<AccountsResponse> {
    const res = await fetch(`${this.baseUrl}/accounts`, { cache: "no-store" })
    return res.json()
  },

  async getSettings(): Promise<{ main_session_token: string; local_id: string; total_gems: number }> {
    const res = await fetch(`${this.baseUrl}/settings`, { cache: "no-store" })
    return res.json()
  },

  async updateSettings(settings: { main_session_token?: string; local_id?: string }): Promise<ApiResponse> {
    const res = await fetch(`${this.baseUrl}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    return res.json()
  },

  async generateAccount(): Promise<GenerateResponse> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    return res.json()
  },

  async getBalance(): Promise<BalanceResponse> {
    const res = await fetch(`${this.baseUrl}/balance`, { cache: "no-store" })
    return res.json()
  },

  async exportAccounts(): Promise<{ content: string; count: number }> {
    const res = await fetch(`${this.baseUrl}/export`, { cache: "no-store" })
    return res.json()
  },

  async clearAccounts(): Promise<ApiResponse> {
    const res = await fetch(`${this.baseUrl}/clear`, {
      method: "POST",
    })
    return res.json()
  },
}

function generateRandomEmail() {
  const randomNum = Math.floor(Math.random() * 9000000) + 100000
  return `test${randomNum}@example.com`
}

function getTimestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false })
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
  icon?: React.ReactNode
}

type ModalPhase = "unmounted" | "mounting" | "entering" | "visible" | "exiting" | "unmounting"

function HoneyModal({ isOpen, onClose, children, title, icon }: ModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("unmounted")
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [clickRipples, setClickRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [morphProgress, setMorphProgress] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  // Smooth morphing animation using RAF
  useEffect(() => {
    if (phase === "entering" || phase === "visible") {
      startTimeRef.current = performance.now()
      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current
        const progress = Math.min(elapsed / 600, 1)
        // Elastic easing for honey-like viscous feel
        const elastic =
          progress < 1 ? 1 - Math.pow(2, -10 * progress) * Math.cos((progress * 10 - 0.75) * ((2 * Math.PI) / 3)) : 1
        setMorphProgress(elastic)
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frameRef.current)
    } else if (phase === "exiting") {
      startTimeRef.current = performance.now()
      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current
        const progress = Math.min(elapsed / 400, 1)
        setMorphProgress(1 - progress * progress) // Quadratic ease out
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frameRef.current)
    }
  }, [phase])

  // Zero-flicker state machine using useLayoutEffect
  useLayoutEffect(() => {
    if (isOpen && phase === "unmounted") {
      setPhase("mounting")
      // Force a reflow before transitioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("entering")
          setTimeout(() => setPhase("visible"), 50)
        })
      })
    } else if (!isOpen && (phase === "visible" || phase === "entering")) {
      setPhase("exiting")
      setTimeout(() => {
        setPhase("unmounting")
        setTimeout(() => setPhase("unmounted"), 50)
      }, 450)
    }
  }, [isOpen, phase])

  // Smooth mouse tracking with interpolation
  useEffect(() => {
    if (phase === "unmounted" || phase === "unmounting") return

    let targetX = 0.5,
      targetY = 0.5
    let currentX = 0.5,
      currentY = 0.5
    let rafId: number

    const interpolate = () => {
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08
      setMousePos({ x: currentX, y: currentY })
      rafId = requestAnimationFrame(interpolate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect()
        targetX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        targetY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      }
    }

    rafId = requestAnimationFrame(interpolate)
    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [phase])

  // Click ripple effect on backdrop
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        const rect = backdropRef.current.getBoundingClientRect()
        const ripple = {
          id: Date.now(),
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        }
        setClickRipples((prev) => [...prev, ripple])
        setTimeout(() => setClickRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 1000)
        setTimeout(onClose, 150)
      }
    },
    [onClose],
  )

  // Escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (phase === "unmounted") return null

  const isActive = phase === "entering" || phase === "visible"
  const rotateX = (mousePos.y - 0.5) * 12 * morphProgress
  const rotateY = (mousePos.x - 0.5) * -12 * morphProgress

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        pointerEvents: isActive ? "auto" : "none",
        willChange: "contents",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Morphing backdrop with liquid dissolve */}
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%,
            rgba(255, 200, 221, ${0.06 * morphProgress}) 0%,
            rgba(12, 12, 18, ${0.95 * morphProgress}) 50%,
            rgba(12, 12, 18, ${0.98 * morphProgress}) 100%)`,
          backdropFilter: `blur(${20 * morphProgress}px) saturate(${100 + 80 * morphProgress}%)`,
          WebkitBackdropFilter: `blur(${20 * morphProgress}px) saturate(${100 + 80 * morphProgress}%)`,
          opacity: morphProgress,
          transition: "background 0.3s ease-out",
          willChange: "backdrop-filter, opacity",
        }}
      />

      {/* Click ripple effects */}
      {clickRipples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            width: 0,
            height: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 200, 221, 0.3) 0%, transparent 70%)",
            animation: "ripple-expand 1s ease-out forwards",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Floating aurora particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${15 + i * 10}%`,
              top: `${20 + (i % 3) * 25}%`,
              width: 100 + i * 30,
              height: 100 + i * 30,
              background: `radial-gradient(circle, rgba(${200 + i * 5}, ${180 + i * 10}, ${220 - i * 5}, ${0.04 * morphProgress}) 0%, transparent 70%)`,
              transform: `translate(-50%, -50%) scale(${0.5 + morphProgress * 0.5}) rotate(${mousePos.x * 30 + i * 45}deg)`,
              transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: "blur(30px)",
            }}
          />
        ))}
      </div>

      {/* Modal container with 3D morphing */}
      <div
        ref={modalRef}
        className="relative w-full max-w-xl"
        style={{
          perspective: "1400px",
          perspectiveOrigin: `${mousePos.x * 100}% ${mousePos.y * 100}%`,
          willChange: "transform",
        }}
      >
        {/* Animated outer glow with rotation */}
        <div
          className="absolute -inset-12 rounded-[56px]"
          style={{
            background: `conic-gradient(from ${mousePos.x * 360 + morphProgress * 90}deg at 50% 50%,
              rgba(255, 200, 221, ${0.12 * morphProgress}) 0deg,
              rgba(200, 180, 255, ${0.08 * morphProgress}) 90deg,
              rgba(180, 220, 255, ${0.1 * morphProgress}) 180deg,
              rgba(255, 180, 200, ${0.08 * morphProgress}) 270deg,
              rgba(255, 200, 221, ${0.12 * morphProgress}) 360deg)`,
            filter: `blur(${50 + mousePos.x * 20}px)`,
            transform: `scale(${0.7 + morphProgress * 0.3}) rotate(${morphProgress * 5}deg)`,
            opacity: morphProgress,
            transition: "filter 0.3s",
          }}
        />

        {/* Liquid border animation */}
        <div
          className="absolute -inset-[2px] rounded-[28px] overflow-hidden"
          style={{
            opacity: morphProgress,
            transform: `scale(${0.95 + morphProgress * 0.05})`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${90 + mousePos.x * 180 + morphProgress * 45}deg,
                transparent 0%,
                rgba(255, 200, 221, 0.4) 25%,
                rgba(200, 180, 255, 0.5) 50%,
                rgba(255, 200, 221, 0.4) 75%,
                transparent 100%)`,
              animation: isActive ? "liquid-border-flow 3s linear infinite" : "none",
            }}
          />
        </div>

        {/* Main modal with honey morphing */}
        <div
          className="relative rounded-[26px] overflow-hidden"
          style={{
            transform: `
              rotateX(${rotateX}deg)
              rotateY(${rotateY}deg)
              translateZ(${-80 + morphProgress * 80}px)
              scale(${0.85 + morphProgress * 0.15})
            `,
            opacity: morphProgress,
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
            background: `linear-gradient(135deg,
              rgba(22, 22, 32, ${0.97 * morphProgress}) 0%,
              rgba(18, 18, 28, ${0.98 * morphProgress}) 100%)`,
            boxShadow: `
              0 ${60 * morphProgress}px ${120 * morphProgress}px -30px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(255, 200, 221, ${0.15 * morphProgress}),
              inset 0 1px 0 0 rgba(255, 255, 255, ${0.04 * morphProgress}),
              0 0 ${80 * morphProgress}px -10px rgba(255, 200, 221, ${0.12 * morphProgress})
            `,
            transition: "box-shadow 0.3s ease-out",
          }}
        >
          {/* Internal shimmer layer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(${135 + mousePos.x * 90}deg,
                transparent 40%,
                rgba(255, 255, 255, ${0.03 * morphProgress}) 50%,
                transparent 60%)`,
              animation: isActive ? "shimmer-sweep 4s ease-in-out infinite" : "none",
            }}
          />

          {/* Header with elastic entrance */}
          <div
            className="relative flex items-center justify-between p-6"
            style={{
              borderBottom: `1px solid rgba(255, 200, 221, ${0.12 * morphProgress})`,
              background: `linear-gradient(135deg,
                rgba(255, 200, 221, ${0.04 * morphProgress}) 0%,
                transparent 60%)`,
              transform: `translateY(${-40 + morphProgress * 40}px)`,
              opacity: morphProgress,
              transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s",
            }}
          >
            <h3 id="modal-title" className="text-2xl font-bold flex items-center gap-3">
              <span
                className="p-2.5 rounded-2xl"
                style={{
                  background: `rgba(255, 200, 221, ${0.1 * morphProgress})`,
                  boxShadow: `0 0 ${25 * morphProgress}px rgba(255, 200, 221, ${0.15 * morphProgress})`,
                  transform: `scale(${0.8 + morphProgress * 0.2}) rotate(${-10 + morphProgress * 10}deg)`,
                  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {icon}
              </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #ffc8dd 0%, #e0d0f5 50%, #c8e0f0 100%)",
                }}
              >
                {title}
              </span>
            </h3>
            <button
              onClick={onClose}
              className="group relative p-2.5 rounded-2xl transition-all duration-300 hover:bg-pink-200/10"
              style={{
                transform: `rotate(${(mousePos.x - 0.5) * 15}deg) scale(${0.9 + morphProgress * 0.1})`,
                transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              aria-label="Close modal"
            >
              <X
                size={22}
                className="text-pink-200/60 group-hover:text-pink-200 transition-all duration-500 group-hover:rotate-180"
              />
            </button>
          </div>

          {/* Content with wave entrance */}
          <div
            className="relative p-6"
            style={{
              transform: `translateY(${40 - morphProgress * 40}px)`,
              opacity: morphProgress,
              transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s, opacity 0.4s 0.1s",
            }}
          >
            {/* Interactive spotlight */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
                  rgba(255, 200, 221, ${0.04 * morphProgress}) 0%,
                  transparent 50%)`,
                transition: "background 0.2s ease-out",
              }}
            />
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>

      {/* Modal-specific keyframes */}
      <style jsx>{`
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 400px;
            height: 400px;
            opacity: 0;
          }
        }
        @keyframes liquid-border-flow {
          0% { transform: translateX(-100%) rotate(0deg); }
          100% { transform: translateX(200%) rotate(5deg); }
        }
        @keyframes shimmer-sweep {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

interface WaveInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
}

function WaveInput({ label, value, onChange, placeholder, hint }: WaveInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <div className="relative group" ref={containerRef} onMouseMove={handleMouseMove}>
      <label className="block text-pink-200/70 mb-2.5 font-medium text-sm transition-all duration-300 group-hover:text-pink-200">
        {label}
      </label>
      <div className="relative">
        {/* Animated magnetic border */}
        <div
          className="absolute -inset-[1px] rounded-xl overflow-hidden transition-all duration-500"
          style={{
            background: isFocused
              ? `conic-gradient(from ${mousePos.x * 3.6}deg at ${mousePos.x}% ${mousePos.y}%,
                  rgba(255, 200, 221, 0.5),
                  rgba(200, 180, 255, 0.4),
                  rgba(180, 220, 255, 0.5),
                  rgba(255, 200, 221, 0.5))`
              : "rgba(255, 200, 221, 0.15)",
            animation: isFocused ? "border-spin 4s linear infinite" : "none",
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="relative w-full px-4 py-3.5 rounded-xl transition-all duration-300 placeholder-pink-200/25 focus:outline-none"
          style={{
            background: isFocused ? "rgba(35, 35, 50, 0.95)" : "rgba(28, 28, 40, 0.9)",
            color: "#ffc8dd",
            boxShadow: isFocused
              ? `0 0 40px rgba(255, 200, 221, 0.12),
                 0 0 80px rgba(255, 200, 221, 0.05),
                 inset 0 1px 0 rgba(255, 255, 255, 0.04)`
              : "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
          }}
        />
        {/* Focus spotlight */}
        {isFocused && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 200, 221, 0.08) 0%, transparent 50%)`,
            }}
          />
        )}
      </div>
      {hint && (
        <p className="text-pink-200/40 text-xs mt-2.5 ml-1 transition-all duration-300 group-hover:text-pink-200/60">
          {hint}
        </p>
      )}
      <style jsx>{`
        @keyframes border-spin {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

interface LiquidButtonProps {
  onClick: () => void
  children: React.ReactNode
  variant?: "primary" | "secondary"
  disabled?: boolean
}

function LiquidButton({ onClick, children, variant = "primary", disabled = false }: LiquidButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const [isPressed, setIsPressed] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className="relative w-full py-4 rounded-xl font-bold overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background:
          variant === "primary"
            ? "linear-gradient(135deg, rgba(255, 200, 221, 0.2) 0%, rgba(200, 180, 255, 0.15) 100%)"
            : "rgba(28, 28, 40, 0.7)",
        border: `1px solid ${variant === "primary" ? "rgba(255, 200, 221, 0.35)" : "rgba(255, 200, 221, 0.15)"}`,
        color: "#ffc8dd",
        transform: isPressed
          ? "scale(0.97) translateY(2px)"
          : isHovered
            ? "scale(1.02) translateY(-2px)"
            : "scale(1) translateY(0)",
        boxShadow: isHovered
          ? `0 15px 50px rgba(255, 200, 221, 0.2),
             0 5px 20px rgba(255, 200, 221, 0.1),
             0 0 0 1px rgba(255, 200, 221, 0.25)`
          : "0 4px 20px rgba(0, 0, 0, 0.2)",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Magnetic spotlight */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%,
            rgba(255, 200, 221, ${isHovered ? 0.35 : 0}) 0%,
            transparent 60%)`,
        }}
      />
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)",
          transform: isHovered ? "translateX(150%)" : "translateX(-150%)",
          transition: "transform 0.7s ease-out",
        }}
      />
      {/* 3D highlight edge */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, ${isHovered ? 0.15 : 0.05}), transparent)`,
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">{children}</span>
    </button>
  )
}

export default function GemDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [mainSessionToken, setMainSessionToken] = useState("")
  const [localId, setLocalId] = useState("")
  const [totalGems, setTotalGems] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [generationCount, setGenerationCount] = useState(0)
  const [animatingGems, setAnimatingGems] = useState<{ id: number; amount: number }[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [statusMessage, setStatusMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const blobsRef = useRef<Array<{
    x: number
    y: number
    baseRadius: number
    vx: number
    vy: number
    color: { r: number; g: number; b: number; a: number }
    phase: number
  }> | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingConnection(true)
      const health = await api.health()
      setIsConnected(health.connected)

      if (health.connected) {
        try {
          // Load accounts and settings from backend
          const [accountsRes, settingsRes] = await Promise.all([api.getAccounts(), api.getSettings()])

          setAccounts(accountsRes.accounts || [])
          setGenerationCount(accountsRes.stats?.total || 0)
          setMainSessionToken(settingsRes.main_session_token || "")
          setLocalId(settingsRes.local_id || "")
          setTotalGems(settingsRes.total_gems || 0)
        } catch (error) {
          console.error("[v0] Failed to load initial data:", error)
        }
      }
      setIsCheckingConnection(false)
    }

    checkConnection()
    // Re-check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isConnected || !mainSessionToken) return

    const pollBalance = async () => {
      try {
        const balanceRes = await api.getBalance()
        if (balanceRes.increased && balanceRes.diff) {
          triggerGemAnimation(balanceRes.diff)
        }
        setTotalGems(balanceRes.gems)
      } catch (error) {
        console.error("[v0] Balance poll failed:", error)
      }
    }

    pollBalance()
    const interval = setInterval(pollBalance, 10000)
    return () => clearInterval(interval)
  }, [isConnected, mainSessionToken])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    // High DPI support
    const dpr = window.devicePixelRatio || 1
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
    }
    updateCanvasSize()

    const blobColors = [
      { r: 255, g: 200, b: 221, a: 0.06 },
      { r: 230, g: 190, b: 230, a: 0.05 },
      { r: 200, g: 220, b: 240, a: 0.04 },
      { r: 255, g: 230, b: 200, a: 0.05 },
      { r: 220, g: 200, b: 255, a: 0.04 },
    ]

    // Initialize blobs only once
    if (!blobsRef.current) {
      blobsRef.current = Array.from({ length: 5 }, (_, i) => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        baseRadius: 180 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        color: blobColors[i % blobColors.length],
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const blobs = blobsRef.current
    let time = 0
    let animationId: number
    let targetMousePos = { x: mousePos.x, y: mousePos.y }
    const currentMousePos = { x: mousePos.x, y: mousePos.y }

    const animate = () => {
      time += 0.002

      // Smooth mouse interpolation
      currentMousePos.x += (targetMousePos.x - currentMousePos.x) * 0.03
      currentMousePos.y += (targetMousePos.y - currentMousePos.y) * 0.03

      // Clear with solid color (no alpha)
      ctx.fillStyle = "#0c0c12"
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

      blobs.forEach((blob) => {
        // Subtle mouse repulsion
        const dx = currentMousePos.x - blob.x
        const dy = currentMousePos.y - blob.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 350 && dist > 0) {
          const force = (350 - dist) / 350
          blob.x -= (dx / dist) * force * 0.8
          blob.y -= (dy / dist) * force * 0.8
        }

        const breathe = Math.sin(time * 0.4 + blob.phase) * 25
        const currentRadius = blob.baseRadius + breathe

        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, currentRadius)
        const { r, g, b, a } = blob.color
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`)
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${a * 0.6})`)
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(blob.x, blob.y, currentRadius, 0, Math.PI * 2)
        ctx.fill()

        blob.x += blob.vx
        blob.y += blob.vy

        // Wrap around edges
        const w = window.innerWidth
        const h = window.innerHeight
        if (blob.x < -currentRadius) blob.x = w + currentRadius
        if (blob.x > w + currentRadius) blob.x = -currentRadius
        if (blob.y < -currentRadius) blob.y = h + currentRadius
        if (blob.y > h + currentRadius) blob.y = -currentRadius
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      updateCanvasSize()
    }

    const handleMouseMove = (e: MouseEvent) => {
      targetMousePos = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [])

  // Update mouse position for other components
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const triggerGemAnimation = useCallback((amount: number) => {
    const id = Date.now()
    setAnimatingGems((prev) => [...prev, { id, amount }])
    setTimeout(() => {
      setAnimatingGems((prev) => prev.filter((g) => g.id !== id))
    }, 3000)
  }, [])

  const generateAccount = async () => {
    if (!isConnected) {
      setStatusMessage("Backend not connected. Start Flask server first.")
      setTimeout(() => setStatusMessage(""), 3000)
      return
    }

    setIsGenerating(true)
    setStatusMessage("Generating account via backend...")

    try {
      const result = await api.generateAccount()

      if (result.success && result.account) {
        setAccounts((prev) => [result.account!, ...prev])
        setGenerationCount((prev) => prev + 1)
        setStatusMessage(`Generated ${result.account.email} with ${result.account.gems || 0} gems`)
        if (result.account.gems) {
          triggerGemAnimation(result.account.gems)
        }
      } else {
        if (result.account) {
          setAccounts((prev) => [result.account!, ...prev])
        }
        setStatusMessage(`Generation failed: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("[v0] Generate account error:", error)
      setStatusMessage("Failed to connect to backend")
    }

    setIsGenerating(false)
    setTimeout(() => setStatusMessage(""), 3000)
  }

  const saveSettings = async () => {
    if (!isConnected) {
      setStatusMessage("Backend not connected")
      setTimeout(() => setStatusMessage(""), 3000)
      return
    }

    try {
      await api.updateSettings({
        main_session_token: mainSessionToken,
        local_id: localId,
      })
      setStatusMessage("Settings saved to backend")
    } catch (error) {
      console.error("[v0] Save settings error:", error)
      setStatusMessage("Failed to save settings")
    }

    setShowSettings(false)
    setTimeout(() => setStatusMessage(""), 3000)
  }

  const downloadAccounts = async () => {
    try {
      if (isConnected) {
        const result = await api.exportAccounts()
        const blob = new Blob([result.content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `accounts_${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback to local export
        const successAccounts = accounts.filter((a) => a.status === "success")
        const content = successAccounts
          .map(
            (acc) =>
              `Email: ${acc.email}\nPassword: ${acc.password}\nSession Token: ${acc.sessionToken || "N/A"}\nGems: ${acc.gems || 0}\n---`,
          )
          .join("\n")

        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `accounts_${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("[v0] Export error:", error)
    }
  }

  const clearAccounts = async () => {
    try {
      if (isConnected) {
        await api.clearAccounts()
      }
      setAccounts([])
      setGenerationCount(0)
    } catch (error) {
      console.error("[v0] Clear accounts error:", error)
    }
  }

  const stats = useMemo(
    () => ({
      successful: accounts.filter((a) => a.status === "success").length,
      failed: accounts.filter((a) => a.status === "failed").length,
      total: generationCount,
    }),
    [accounts, generationCount],
  )

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0c12" }}>
      {/* GPU-accelerated canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ willChange: "auto" }} />

      {/* Floating gem animations */}
      {animatingGems.map((gem) => (
        <div
          key={gem.id}
          className="fixed pointer-events-none z-50 animate-gem-rise"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="text-5xl font-black"
            style={{
              color: "#ffc8dd",
              textShadow: "0 0 30px rgba(255, 200, 221, 0.4)",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
            }}
          >
            +{gem.amount}
            <Gem className="inline-block ml-2" size={40} />
          </div>
        </div>
      ))}

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 animate-fade-in">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl transition-all duration-700"
                style={{ background: "rgba(255, 200, 221, 0.15)" }}
              />
              <div
                className="relative backdrop-blur-xl p-4 rounded-3xl transition-all duration-500"
                style={{
                  background: "rgba(255, 200, 221, 0.05)",
                  border: "1px solid rgba(255, 200, 221, 0.15)",
                }}
              >
                <Sparkles className="text-pink-200" size={36} />
              </div>
            </div>
            <div>
              <h1
                className="text-5xl font-black mb-1"
                style={{
                  background: "linear-gradient(135deg, #ffc8dd 0%, #e6d5f5 50%, #d4e8f0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 8px rgba(255, 200, 221, 0.2))",
                }}
              >
                Gem Generator
              </h1>
              <div className="flex items-center gap-2">
                {isCheckingConnection ? (
                  <span className="text-pink-200/50 text-sm font-medium flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Connecting...
                  </span>
                ) : isConnected ? (
                  <span className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                    <Wifi size={14} />
                    Connected to Flask Backend
                  </span>
                ) : (
                  <span className="text-amber-400 text-sm font-medium flex items-center gap-2">
                    <WifiOff size={14} />
                    Backend Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && mainSessionToken && (
              <div
                className="relative backdrop-blur-xl px-4 py-2 rounded-2xl transition-all duration-500"
                style={{
                  background: "rgba(30, 30, 40, 0.4)",
                  border: "1px solid rgba(255, 200, 221, 0.15)",
                }}
              >
                <span className="text-pink-200 font-bold flex items-center gap-2">
                  <Gem size={18} />
                  {totalGems.toLocaleString()}
                </span>
              </div>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="relative transition-all duration-500 hover:scale-105 group"
            >
              <div
                className="absolute inset-0 rounded-2xl blur-xl transition-all duration-700 group-hover:blur-2xl"
                style={{ background: "rgba(255, 200, 221, 0.1)" }}
              />
              <div
                className="relative backdrop-blur-xl p-3 rounded-2xl transition-all duration-500"
                style={{
                  background: "rgba(30, 30, 40, 0.4)",
                  border: "1px solid rgba(255, 200, 221, 0.15)",
                }}
              >
                <Settings className="text-pink-200 transition-transform duration-500 group-hover:rotate-90" size={24} />
              </div>
            </button>
          </div>
        </div>

        {!isConnected && !isCheckingConnection && (
          <div
            className="mb-6 p-4 rounded-2xl flex items-start gap-3 animate-fade-in"
            style={{
              background: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
            }}
          >
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-amber-200 text-sm font-medium">Flask Backend Required</p>
              <p className="text-amber-200/60 text-xs mt-1">
                Start the Flask server to enable account generation:{" "}
                <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">python scripts/flask_server.py</code>
              </p>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <HoneyModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          title="Configuration"
          icon={<Settings className="text-pink-300" size={24} />}
        >
          <div className="space-y-5">
            <WaveInput
              label="Main Account Session Token"
              value={mainSessionToken}
              onChange={setMainSessionToken}
              placeholder="Enter your session token..."
              hint="Used to poll gem balance from main account"
            />

            <WaveInput
              label="Local ID (Code Parameter)"
              value={localId}
              onChange={setLocalId}
              placeholder="Enter the localId/code value..."
              hint='Used as the "code" parameter in init_data requests'
            />

            <LiquidButton onClick={saveSettings} disabled={!isConnected}>
              <CheckCircle size={18} />
              {isConnected ? "Save Settings" : "Backend Required"}
            </LiquidButton>
          </div>
        </HoneyModal>

        {/* Status Message */}
        {statusMessage && (
          <div
            className="mb-6 p-3 rounded-xl text-center text-sm font-medium animate-fade-in"
            style={{
              background: "rgba(255, 200, 221, 0.1)",
              border: "1px solid rgba(255, 200, 221, 0.2)",
              color: "#ffc8dd",
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4 mb-8 animate-fade-in-delay-2">
          <button
            onClick={generateAccount}
            disabled={isGenerating || !isConnected}
            className="relative flex-1 transition-all duration-500 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              className="absolute inset-0 rounded-2xl blur-xl transition-all duration-700"
              style={{ background: "rgba(255, 200, 221, 0.15)" }}
            />
            <div
              className="relative backdrop-blur-xl font-bold py-4 px-6 rounded-2xl transition-all duration-500 flex items-center justify-center gap-3"
              style={{
                background: "rgba(255, 200, 221, 0.15)",
                border: "1px solid rgba(255, 200, 221, 0.25)",
                color: "#ffc8dd",
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span className="font-black">Generating...</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  <span className="font-black">Generate Account</span>
                </>
              )}
            </div>
          </button>

          <button
            onClick={downloadAccounts}
            disabled={stats.successful === 0}
            className="relative transition-all duration-500 hover:scale-105 disabled:opacity-50"
          >
            <div
              className="absolute inset-0 rounded-2xl blur-xl transition-all duration-700"
              style={{ background: "rgba(212, 232, 240, 0.1)" }}
            />
            <div
              className="relative backdrop-blur-xl font-bold py-4 px-6 rounded-2xl transition-all duration-500 flex items-center gap-2"
              style={{
                background: "rgba(30, 30, 40, 0.4)",
                border: "1px solid rgba(255, 200, 221, 0.15)",
                color: "#ffc8dd",
              }}
            >
              <Download size={20} />
              <span className="font-bold">Export</span>
            </div>
          </button>

          <button
            onClick={clearAccounts}
            disabled={accounts.length === 0}
            className="relative transition-all duration-500 hover:scale-105 disabled:opacity-50"
          >
            <div
              className="absolute inset-0 rounded-2xl blur-xl transition-all duration-700"
              style={{ background: "rgba(251, 113, 133, 0.1)" }}
            />
            <div
              className="relative backdrop-blur-xl font-bold py-4 px-6 rounded-2xl transition-all duration-500 flex items-center gap-2"
              style={{
                background: "rgba(30, 30, 40, 0.4)",
                border: "1px solid rgba(251, 113, 133, 0.15)",
                color: "#fb7185",
              }}
            >
              <Trash2 size={20} />
              <span className="font-bold">Clear</span>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-delay-3">
          <div
            className="relative backdrop-blur-xl p-5 rounded-2xl transition-all duration-500"
            style={{
              background: "rgba(30, 30, 40, 0.4)",
              border: "1px solid rgba(255, 200, 221, 0.1)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-emerald-400" size={20} />
              <span className="text-emerald-400/80 text-sm font-medium">Successful</span>
            </div>
            <p className="text-3xl font-black text-emerald-400">{stats.successful}</p>
          </div>

          <div
            className="relative backdrop-blur-xl p-5 rounded-2xl transition-all duration-500"
            style={{
              background: "rgba(30, 30, 40, 0.4)",
              border: "1px solid rgba(255, 200, 221, 0.1)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="text-rose-400" size={20} />
              <span className="text-rose-400/80 text-sm font-medium">Failed</span>
            </div>
            <p className="text-3xl font-black text-rose-400">{stats.failed}</p>
          </div>

          <div
            className="relative backdrop-blur-xl p-5 rounded-2xl transition-all duration-500"
            style={{
              background: "rgba(30, 30, 40, 0.4)",
              border: "1px solid rgba(255, 200, 221, 0.1)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-pink-200" size={20} />
              <span className="text-pink-200/80 text-sm font-medium">Total</span>
            </div>
            <p className="text-3xl font-black text-pink-200">{stats.total}</p>
          </div>
        </div>

        {/* Account Feed */}
        <div
          className="relative backdrop-blur-xl rounded-2xl overflow-hidden animate-fade-in-delay-4"
          style={{
            background: "rgba(30, 30, 40, 0.4)",
            border: "1px solid rgba(255, 200, 221, 0.1)",
          }}
        >
          <div
            className="p-5"
            style={{
              borderBottom: "1px solid rgba(255, 200, 221, 0.1)",
              background: "rgba(255, 200, 221, 0.03)",
            }}
          >
            <h2 className="text-xl font-bold text-pink-200">Generated Accounts</h2>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {accounts.length === 0 ? (
              <div className="p-10 text-center text-pink-200/40">
                <Gem className="mx-auto mb-3 opacity-30" size={40} />
                <p>No accounts generated yet</p>
                <p className="text-sm mt-1">
                  {isConnected ? "Click Generate Account to start" : "Connect Flask backend first"}
                </p>
              </div>
            ) : (
              accounts.map((account, index) => (
                <div
                  key={`${account.email}-${index}`}
                  className="p-4 transition-all duration-300 hover:bg-pink-200/5"
                  style={{ borderBottom: "1px solid rgba(255, 200, 221, 0.05)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {account.status === "success" ? (
                        <CheckCircle className="text-emerald-400" size={18} />
                      ) : (
                        <XCircle className="text-rose-400" size={18} />
                      )}
                      <div>
                        <p className="text-pink-200 font-medium">{account.email}</p>
                        <p className="text-pink-200/40 text-xs">
                          {account.status === "success" ? (
                            <>
                              {account.gems} gems • {account.timestamp}
                            </>
                          ) : (
                            <span className="text-rose-400/60">{account.error}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {account.status === "success" && account.gems && (
                      <div className="flex items-center gap-1 text-pink-200/60">
                        <Gem size={14} />
                        <span className="text-sm font-bold">{account.gems}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gem-rise {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -200%) scale(1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Modal-specific keyframes */
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 400px;
            height: 400px;
            opacity: 0;
          }
        }
        @keyframes liquid-border-flow {
          0% { transform: translateX(-100%) rotate(0deg); }
          100% { transform: translateX(200%) rotate(5deg); }
        }
        @keyframes shimmer-sweep {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }


        .animate-slide-in {
          animation: slide-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-gem-rise {
          animation: gem-rise 3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in 1s ease-out 0.4s backwards;
        }

        .animate-fade-in-delay-3 {
          animation: fade-in 1s ease-out 0.6s backwards;
        }

        .animate-fade-in-delay-4 {
          animation: fade-in 1s ease-out 0.8s backwards;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 200, 221, 0.02);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 200, 221, 0.2);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 200, 221, 0.3);
        }
      `}</style>
    </div>
  )
}
