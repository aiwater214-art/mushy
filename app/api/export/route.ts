import { type NextRequest, NextResponse } from "next/server"
import { store } from "@/lib/store"

// GET /api/export - Export accounts in various formats
export async function GET(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id") || "default"
  const format = request.nextUrl.searchParams.get("format") || "json"
  const session = store.getSession(sessionId)

  if (session.accounts.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No accounts to export",
      },
      { status: 400 },
    )
  }

  switch (format) {
    case "csv": {
      const csv = [
        "id,email,password,balance,status,createdAt",
        ...session.accounts.map((a) => `${a.id},${a.email},${a.password},${a.balance},${a.status},${a.createdAt}`),
      ].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=accounts.csv",
        },
      })
    }

    case "txt": {
      const txt = session.accounts.map((a) => `${a.email}:${a.password}`).join("\n")

      return new NextResponse(txt, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": "attachment; filename=accounts.txt",
        },
      })
    }

    default: {
      return NextResponse.json({
        success: true,
        accounts: session.accounts,
        exportedAt: new Date().toISOString(),
      })
    }
  }
}
