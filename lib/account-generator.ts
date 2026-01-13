// Real account generation logic
// This connects to external APIs for account creation

interface GenerateResult {
  success: boolean
  account?: {
    id: string
    email: string
    password: string
    balance: number
    status: "active" | "inactive" | "pending"
    createdAt: string
  }
  error?: string
}

function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateEmail(): string {
  const domains = ["gmail.com", "outlook.com", "yahoo.com", "protonmail.com"]
  const username = generateRandomString(10)
  const domain = domains[Math.floor(Math.random() * domains.length)]
  return `${username}@${domain}`
}

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
  let password = ""
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function generateAccount(sessionToken?: string): Promise<GenerateResult> {
  const email = generateEmail()
  const password = generatePassword()

  try {
    // Step 1: Create Firebase account
    const firebaseResponse = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyA75azgVPuJKBSBB6GFr9hDwAXh5RxMHig",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    )

    if (!firebaseResponse.ok) {
      const error = await firebaseResponse.json()
      return {
        success: false,
        error: `Firebase error: ${error.error?.message || "Unknown error"}`,
      }
    }

    const firebaseData = await firebaseResponse.json()
    const idToken = firebaseData.idToken

    // Step 2: Register with the target API
    const registerResponse = await fetch("https://api.undresswith.ai/api/user/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ email }),
    })

    let balance = 0
    let status: "active" | "inactive" | "pending" = "pending"

    if (registerResponse.ok) {
      status = "active"

      // Step 3: Get balance if session token provided
      if (sessionToken) {
        try {
          const balanceResponse = await fetch("https://api.undresswith.ai/api/user/balance", {
            headers: { Authorization: `Bearer ${idToken}` },
          })
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            balance = balanceData.balance || balanceData.credits || 0
          }
        } catch {
          // Balance fetch failed, continue with 0
        }
      }
    } else {
      status = "inactive"
    }

    return {
      success: true,
      account: {
        id: firebaseData.localId || generateRandomString(20),
        email,
        password,
        balance,
        status,
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function checkBalance(sessionToken: string): Promise<{ balance: number; error?: string }> {
  if (!sessionToken) {
    return { balance: 0, error: "No session token provided" }
  }

  try {
    const response = await fetch("https://api.undresswith.ai/api/user/balance", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })

    if (!response.ok) {
      return { balance: 0, error: "Failed to fetch balance" }
    }

    const data = await response.json()
    return { balance: data.balance || data.credits || 0 }
  } catch (error) {
    return {
      balance: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
