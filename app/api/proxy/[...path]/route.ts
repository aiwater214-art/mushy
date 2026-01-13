import { type NextRequest, NextResponse } from "next/server"

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || "http://localhost:5000"

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const apiPath = path.join("/")

  try {
    const response = await fetch(`${FLASK_BACKEND_URL}/api/${apiPath}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[Proxy] GET error:", error)
    return NextResponse.json({ error: "Backend unavailable", connected: false }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const apiPath = path.join("/")

  try {
    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${FLASK_BACKEND_URL}/api/${apiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[Proxy] POST error:", error)
    return NextResponse.json({ error: "Backend unavailable", connected: false }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const apiPath = path.join("/")

  try {
    const response = await fetch(`${FLASK_BACKEND_URL}/api/${apiPath}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[Proxy] DELETE error:", error)
    return NextResponse.json({ error: "Backend unavailable", connected: false }, { status: 503 })
  }
}
