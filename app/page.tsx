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
  id: string
  email: string
  password: string
  balance: number
  status: "active" | "inactive" | "pending"
  createdAt: string
}

// Renamed interface to avoid conflict with lucide-react Settings icon
interface AppSettings {
  apiEndpoint: string
  sessionToken: string
  autoRefresh: boolean
  refreshInterval: number
}

const api = {
  sessionId: typeof window !== "undefined" ? `session-${Date.now()}-${Math.random().toString(36).slice(2)}` : "default",

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "x-session-id": this.sessionId,
    }
  },

  async health(): Promise<{ status: string; connected: boolean }> {
    try {
      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error("API unavailable")
      const data = await res.json()
      return { status: data.status, connected: true }
    } catch {
      return { status: "disconnected", connected: false }
    }
  },

  async getAccounts(): Promise<{ success: boolean; accounts: Account[]; count: number }> {
    const res = await fetch("/api/accounts", {
      cache: "no-store",
      headers: this.getHeaders(),
    })
    return res.json()
  },

  async getSettings(): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch("/api/settings", {
      cache: "no-store",
      headers: this.getHeaders(),
    })
    return res.json()
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    })
    return res.json()
  },

  async generateAccount(): Promise<{ success: boolean; account?: Account; error?: string; totalAccounts?: number }> {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: this.getHeaders(),
    })
    return res.json()
  },

  async getBalance(): Promise<{ success: boolean; balance: number; error?: string }> {
    const res = await fetch("/api/balance", {
      cache: "no-store",
      headers: this.getHeaders(),
    })
    return res.json()
  },

  async exportAccounts(format: "json" | "csv" | "txt" = "txt"): Promise<Response> {
    return fetch(`/api/export?format=${format}`, {
      cache: "no-store",
      headers: this.getHeaders(),
    })
  },

  async clearAccounts(): Promise<{ success: boolean; message: string }> {
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: this.getHeaders(),
    })
    return res.json()
  },
}

// Keep HoneyModal exactly as is
type ModalPhase = "unmounted" | "mounting" | "entering" | "visible" | "exiting" | "unmounting"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
  icon?: React.ReactNode
}

function HoneyModal({ isOpen, onClose, children, title, icon }: ModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("unmounted")
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [clickRipples, setClickRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [morphProgress, setMorphProgress] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (phase === "entering" || phase === "visible") {
      startTimeRef.current = performance.now()
      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current
        const progress = Math.min(elapsed / 600, 1)
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
        setMorphProgress(1 - progress * progress)
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frameRef.current)
    }
  }, [phase])

  useLayoutEffect(() => {
    if (isOpen && phase === "unmounted") {
      setPhase("mounting")
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

      <div
        ref={modalRef}
        className="relative w-full max-w-xl"
        style={{
          perspective: "1400px",
          perspectiveOrigin: `${mousePos.x * 100}% ${mousePos.y * 100}%`,
          willChange: "transform",
        }}
      >
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

          <div
            className="relative p-6"
            style={{
              transform: `translateY(${40 - morphProgress * 40}px)`,
              opacity: morphProgress,
              transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s, opacity 0.4s 0.1s",
            }}
          >
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
      disabled={disabled}
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
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%,
            rgba(255, 200, 221, ${isHovered ? 0.35 : 0}) 0%,
            transparent 60%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)",
          transform: isHovered ? "translateX(150%)" : "translateX(-150%)",
          transition: "transform 0.7s ease-out",
        }}
      />
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
  const [sessionToken, setSessionToken] = useState("")
  const [totalBalance, setTotalBalance] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [generationCount, setGenerationCount] = useState(0)
  const [animatingGems, setAnimatingGems] = useState<{ id: number; amount: number }[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [statusMessage, setStatusMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousBalanceRef = useRef(0)

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
          const [accountsRes, settingsRes] = await Promise.all([api.getAccounts(), api.getSettings()])

          setAccounts(accountsRes.accounts || [])
          setGenerationCount(accountsRes.count || 0)
          setSessionToken(settingsRes.settings?.sessionToken || "")

          // Calculate total balance from accounts
          const total = (accountsRes.accounts || []).reduce((sum, acc) => sum + acc.balance, 0)
          setTotalBalance(total)
          previousBalanceRef.current = total
        } catch (error) {
          console.error("Failed to load initial data:", error)
        }
      }
      setIsCheckingConnection(false)
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isConnected || !sessionToken) return

    const pollBalance = async () => {
      try {
        const balanceRes = await api.getBalance()
        if (balanceRes.success && balanceRes.balance > previousBalanceRef.current) {
          const diff = balanceRes.balance - previousBalanceRef.current
          triggerGemAnimation(diff)
        }
        setTotalBalance(balanceRes.balance)
        previousBalanceRef.current = balanceRes.balance
      } catch (error) {
        console.error("Balance poll failed:", error)
      }
    }

    pollBalance()
    const interval = setInterval(pollBalance, 10000)
    return () => clearInterval(interval)
  }, [isConnected, sessionToken])

  // Canvas background effect (unchanged)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

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

      currentMousePos.x += (targetMousePos.x - currentMousePos.x) * 0.03
      currentMousePos.y += (targetMousePos.y - currentMousePos.y) * 0.03

      ctx.fillStyle = "#0c0c12"
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

      blobs.forEach((blob) => {
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
      setStatusMessage("API not connected. Please wait...")
      setTimeout(() => setStatusMessage(""), 3000)
      return
    }

    setIsGenerating(true)
    setStatusMessage("Generating account...")

    try {
      const result = await api.generateAccount()

      if (result.success && result.account) {
        setAccounts((prev) => [result.account!, ...prev])
        setGenerationCount(result.totalAccounts || generationCount + 1)
        setStatusMessage(`Generated ${result.account.email} with ${result.account.balance} balance`)
        if (result.account.balance > 0) {
          triggerGemAnimation(result.account.balance)
          setTotalBalance((prev) => prev + result.account!.balance)
        }
      } else {
        setStatusMessage(`Generation failed: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Generate account error:", error)
      setStatusMessage("Failed to generate account")
    }

    setIsGenerating(false)
    setTimeout(() => setStatusMessage(""), 3000)
  }

  const saveSettings = async () => {
    if (!isConnected) {
      setStatusMessage("API not connected")
      setTimeout(() => setStatusMessage(""), 3000)
      return
    }

    try {
      await api.updateSettings({ sessionToken })
      setStatusMessage("Settings saved")
    } catch (error) {
      console.error("Save settings error:", error)
      setStatusMessage("Failed to save settings")
    }

    setShowSettings(false)
    setTimeout(() => setStatusMessage(""), 3000)
  }

  const downloadAccounts = async () => {
    try {
      const response = await api.exportAccounts("txt")

      if (response.headers.get("content-type")?.includes("text/plain")) {
        const content = await response.text()
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `accounts_${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        if (data.error) {
          setStatusMessage(data.error)
          setTimeout(() => setStatusMessage(""), 3000)
        }
      }
    } catch (error) {
      console.error("Export error:", error)
      setStatusMessage("Failed to export accounts")
      setTimeout(() => setStatusMessage(""), 3000)
    }
  }

  const clearAccounts = async () => {
    try {
      await api.clearAccounts()
      setAccounts([])
      setGenerationCount(0)
      setTotalBalance(0)
      previousBalanceRef.current = 0
      setStatusMessage("All accounts cleared")
      setTimeout(() => setStatusMessage(""), 3000)
    } catch (error) {
      console.error("Clear accounts error:", error)
      setStatusMessage("Failed to clear accounts")
      setTimeout(() => setStatusMessage(""), 3000)
    }
  }

  const stats = useMemo(
    () => ({
      active: accounts.filter((a) => a.status === "active").length,
      inactive: accounts.filter((a) => a.status === "inactive").length,
      pending: accounts.filter((a) => a.status === "pending").length,
      total: generationCount,
    }),
    [accounts, generationCount],
  )

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0c12" }}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ willChange: "auto" }} />

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
                  <RefreshCw size={14} className="text-pink-200/50 animate-spin" />
                ) : isConnected ? (
                  <Wifi size={14} className="text-green-400" />
                ) : (
                  <WifiOff size={14} className="text-red-400" />
                )}
                <span className="text-pink-200/50 text-sm">
                  {isCheckingConnection ? "Checking..." : isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="relative backdrop-blur-xl px-6 py-3 rounded-2xl transition-all duration-500"
              style={{
                background: "rgba(255, 200, 221, 0.08)",
                border: "1px solid rgba(255, 200, 221, 0.15)",
              }}
            >
              <div className="flex items-center gap-3">
                <Gem className="text-pink-200" size={24} />
                <span
                  className="text-3xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #ffc8dd 0%, #e6d5f5 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {totalBalance.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="relative backdrop-blur-xl p-4 rounded-2xl transition-all duration-500 hover:scale-110 group"
              style={{
                background: "rgba(255, 200, 221, 0.05)",
                border: "1px solid rgba(255, 200, 221, 0.15)",
              }}
            >
              <Settings
                className="text-pink-200/70 group-hover:text-pink-200 transition-all duration-300 group-hover:rotate-90"
                size={24}
              />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className="mb-6 p-4 rounded-2xl backdrop-blur-xl animate-fade-in"
            style={{
              background: "rgba(255, 200, 221, 0.1)",
              border: "1px solid rgba(255, 200, 221, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="text-pink-200" size={20} />
              <span className="text-pink-200">{statusMessage}</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Generated", value: stats.total, icon: Clock },
            { label: "Active", value: stats.active, icon: CheckCircle },
            { label: "Inactive", value: stats.inactive, icon: XCircle },
            { label: "Pending", value: stats.pending, icon: RefreshCw },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="relative backdrop-blur-xl p-6 rounded-3xl transition-all duration-500 hover:scale-105 group"
              style={{
                background: "rgba(255, 200, 221, 0.03)",
                border: "1px solid rgba(255, 200, 221, 0.1)",
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="p-3 rounded-2xl transition-all duration-500 group-hover:scale-110"
                  style={{ background: "rgba(255, 200, 221, 0.1)" }}
                >
                  <stat.icon className="text-pink-200" size={24} />
                </div>
                <div>
                  <p className="text-pink-200/50 text-sm">{stat.label}</p>
                  <p
                    className="text-3xl font-black"
                    style={{
                      background: "linear-gradient(135deg, #ffc8dd 0%, #e6d5f5 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <button
            onClick={generateAccount}
            disabled={isGenerating || !isConnected}
            className="relative backdrop-blur-xl p-6 rounded-3xl transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255, 200, 221, 0.15) 0%, rgba(200, 180, 255, 0.1) 100%)",
              border: "1px solid rgba(255, 200, 221, 0.25)",
            }}
          >
            <div className="relative z-10 flex items-center justify-center gap-4">
              {isGenerating ? (
                <RefreshCw className="text-pink-200 animate-spin" size={28} />
              ) : (
                <Play className="text-pink-200" size={28} />
              )}
              <span className="text-xl font-bold text-pink-200">
                {isGenerating ? "Generating..." : "Generate Account"}
              </span>
            </div>
          </button>

          <button
            onClick={downloadAccounts}
            disabled={accounts.length === 0}
            className="relative backdrop-blur-xl p-6 rounded-3xl transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
            style={{
              background: "rgba(255, 200, 221, 0.05)",
              border: "1px solid rgba(255, 200, 221, 0.15)",
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <Download className="text-pink-200/70 group-hover:text-pink-200 transition-colors" size={28} />
              <span className="text-xl font-bold text-pink-200/70 group-hover:text-pink-200 transition-colors">
                Export Accounts
              </span>
            </div>
          </button>

          <button
            onClick={clearAccounts}
            disabled={accounts.length === 0}
            className="relative backdrop-blur-xl p-6 rounded-3xl transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
            style={{
              background: "rgba(255, 100, 100, 0.05)",
              border: "1px solid rgba(255, 100, 100, 0.15)",
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <Trash2 className="text-red-300/70 group-hover:text-red-300 transition-colors" size={28} />
              <span className="text-xl font-bold text-red-300/70 group-hover:text-red-300 transition-colors">
                Clear All
              </span>
            </div>
          </button>
        </div>

        {/* Accounts List */}
        <div
          className="backdrop-blur-xl rounded-3xl overflow-hidden"
          style={{
            background: "rgba(255, 200, 221, 0.03)",
            border: "1px solid rgba(255, 200, 221, 0.1)",
          }}
        >
          <div className="p-6" style={{ borderBottom: "1px solid rgba(255, 200, 221, 0.1)" }}>
            <h2
              className="text-2xl font-bold"
              style={{
                background: "linear-gradient(135deg, #ffc8dd 0%, #e6d5f5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Generated Accounts
            </h2>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {accounts.length === 0 ? (
              <div className="p-12 text-center">
                <Gem className="mx-auto text-pink-200/20 mb-4" size={48} />
                <p className="text-pink-200/40">No accounts generated yet</p>
              </div>
            ) : (
              accounts.map((account, i) => (
                <div
                  key={account.id}
                  className="p-6 transition-all duration-300 hover:bg-white/[0.02] group"
                  style={{
                    borderBottom: i < accounts.length - 1 ? "1px solid rgba(255, 200, 221, 0.05)" : "none",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background:
                            account.status === "active"
                              ? "#4ade80"
                              : account.status === "inactive"
                                ? "#f87171"
                                : "#fbbf24",
                          boxShadow:
                            account.status === "active"
                              ? "0 0 12px #4ade80"
                              : account.status === "inactive"
                                ? "0 0 12px #f87171"
                                : "0 0 12px #fbbf24",
                        }}
                      />
                      <div>
                        <p className="text-pink-200 font-medium">{account.email}</p>
                        <p className="text-pink-200/40 text-sm font-mono">{account.password}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Gem className="text-pink-200/70" size={18} />
                        <span className="text-pink-200 font-bold">{account.balance}</span>
                      </div>
                      <span className="text-pink-200/30 text-sm">
                        {new Date(account.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <HoneyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
        icon={<Settings className="text-pink-200" size={24} />}
      >
        <div className="space-y-6">
          <WaveInput
            label="Session Token"
            value={sessionToken}
            onChange={setSessionToken}
            placeholder="Enter your session token..."
            hint="Used for balance checking and API authentication"
          />

          <div className="pt-4">
            <LiquidButton onClick={saveSettings}>Save Settings</LiquidButton>
          </div>
        </div>
      </HoneyModal>

      <style jsx global>{`
        @keyframes gem-rise {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, calc(-50% - 100px)) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, calc(-50% - 150px)) scale(0.8);
          }
        }
        .animate-gem-rise {
          animation: gem-rise 3s ease-out forwards;
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
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
