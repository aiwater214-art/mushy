import { type NextRequest, NextResponse } from "next/server"
import { store } from "@/lib/store"
import { checkBalance } from "@/lib/account-generator"

// GET /api/balance - Check balance using session token
export async function GET(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const session = store.getSession(sessionId)

  if (!session.settings.sessionToken) {
    return NextResponse.json({
      success: false,
      error: "No session token configured",
      balance: 0,
    })
  }

  const result = await checkBalance(session.settings.sessionToken)

  return NextResponse.json({
    success: !result.error,
    balance: result.balance,
    error: result.error,
  })
}
