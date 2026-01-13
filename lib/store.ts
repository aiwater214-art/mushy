// In-memory store with session isolation
// Note: In production with multiple serverless instances, use a database or Redis

interface Account {
  id: string
  email: string
  password: string
  balance: number
  status: "active" | "inactive" | "pending"
  createdAt: string
}

interface Session {
  accounts: Account[]
  settings: {
    apiEndpoint: string
    sessionToken: string
    autoRefresh: boolean
    refreshInterval: number
  }
  createdAt: number
}

// Use globalThis for persistence across hot reloads in development
const globalStore = globalThis as unknown as {
  sessions?: Map<string, Session>
}

if (!globalStore.sessions) {
  globalStore.sessions = new Map()
}

export const store = {
  getSession(sessionId: string): Session {
    if (!globalStore.sessions!.has(sessionId)) {
      globalStore.sessions!.set(sessionId, {
        accounts: [],
        settings: {
          apiEndpoint: "https://undresswith.ai",
          sessionToken: "",
          autoRefresh: true,
          refreshInterval: 30,
        },
        createdAt: Date.now(),
      })
    }
    return globalStore.sessions!.get(sessionId)!
  },

  getAllSessions() {
    return globalStore.sessions!
  },
}

// Cleanup old sessions (older than 24 hours)
export function cleanupSessions() {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours

  for (const [id, session] of globalStore.sessions!.entries()) {
    if (now - session.createdAt > maxAge) {
      globalStore.sessions!.delete(id)
    }
  }
}
