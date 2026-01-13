import { type NextRequest, NextResponse } from "next/server"
import { store, cleanupSessions } from "@/lib/store"
import { generateAccount } from "@/lib/account-generator"

// GET /api/accounts - Get all accounts for a session
export async function GET(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const session = store.getSession(sessionId)

  return NextResponse.json({
    success: true,
    accounts: session.accounts,
    count: session.accounts.length,
  })
}

// POST /api/accounts - Generate a new account
export async function POST(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const session = store.getSession(sessionId)

  try {
    const result = await generateAccount(session.settings.sessionToken)

    if (result.success && result.account) {
      session.accounts.push(result.account)

      // Cleanup old sessions periodically
      if (Math.random() < 0.1) {
        cleanupSessions()
      }

      return NextResponse.json({
        success: true,
        account: result.account,
        totalAccounts: session.accounts.length,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to generate account",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/accounts - Clear all accounts
export async function DELETE(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const session = store.getSession(sessionId)

  const count = session.accounts.length
  session.accounts = []

  return NextResponse.json({
    success: true,
    message: `Cleared ${count} accounts`,
  })
}
