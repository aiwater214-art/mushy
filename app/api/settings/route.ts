import { type NextRequest, NextResponse } from "next/server"
import { store } from "@/lib/store"

// GET /api/settings - Get current settings
export async function GET(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const session = store.getSession(sessionId)

  return NextResponse.json({
    success: true,
    settings: session.settings,
  })
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const session = store.getSession(sessionId)

  try {
    const body = await request.json()

    // Validate and update settings
    if (body.apiEndpoint !== undefined) {
      session.settings.apiEndpoint = String(body.apiEndpoint)
    }
    if (body.sessionToken !== undefined) {
      session.settings.sessionToken = String(body.sessionToken)
    }
    if (body.autoRefresh !== undefined) {
      session.settings.autoRefresh = Boolean(body.autoRefresh)
    }
    if (body.refreshInterval !== undefined) {
      const interval = Number(body.refreshInterval)
      if (interval >= 5 && interval <= 300) {
        session.settings.refreshInterval = interval
      }
    }

    return NextResponse.json({
      success: true,
      settings: session.settings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
      },
      { status: 400 },
    )
  }
}
