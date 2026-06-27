import { NextRequest, NextResponse } from "next/server"
import { encrypt, parseJwt } from "@/lib/crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"
import https from "node:https"

const NEPALPAY_BASE = process.env.NEPALPAY_API_BASE || "https://business.nepalpay.com.np/backend/api"

async function loginToNepalPay(username: string, password: string): Promise<any> {
  console.log(`[NEPALPAY] Attempting login to ${NEPALPAY_BASE}/auth/signin for user: ${username}`)
  
  const url = new URL(`${NEPALPAY_BASE}/auth/signin`)
  const postData = JSON.stringify({ username: username.trim(), password: password.trim() })
  
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        rejectUnauthorized: false,
        timeout: 15000,
        // NepalPay sends non-standard header characters - tolerate them
        insecureHTTPParser: true,
      } as any,
      (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          console.log(`[NEPALPAY] Response status: ${res.statusCode}`)
          try {
            // NepalPay sometimes wraps JSON in chunked encoding markers
            // Try to extract JSON from the response
            let jsonStr = data
            const jsonMatch = data.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              jsonStr = jsonMatch[0]
            }
            const parsed = JSON.parse(jsonStr)
            console.log(`[NEPALPAY] Parsed response status: ${parsed.status}`)
            resolve(parsed)
          } catch (e) {
            console.error(`[NEPALPAY] Failed to parse response:`, data.substring(0, 500))
            reject(new Error("Invalid response from NepalPay server"))
          }
        })
      }
    )

    req.on("error", (err) => {
      console.error(`[NEPALPAY] Request error:`, err.message)
      reject(new Error(`Cannot reach NepalPay server: ${err.message}`))
    })

    req.on("timeout", () => {
      req.destroy()
      reject(new Error("NepalPay server timed out (15s). The server may be down."))
    })

    req.write(postData)
    req.end()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, username, password, merchantId } = body

    if (!provider || !username || !password || !merchantId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (provider !== "nepalpay") {
      return NextResponse.json({ success: false, message: "Only NepalPay is currently supported" }, { status: 400 })
    }

    // Attempt login to NepalPay
    const loginData = await loginToNepalPay(username, password)

    if (loginData.status !== "SUCCESS") {
      return NextResponse.json({
        success: false,
        message: loginData.message || "Login failed. Check your credentials.",
      })
    }

    const accessToken = loginData.data.accessToken
    const decoded = parseJwt(accessToken)
    const merchantCode = decoded?.merchantCode as string || "UNKNOWN"

    // Calculate token expiry from JWT
    const exp = decoded?.exp as number
    const tokenExpiry = exp ? new Date(exp * 1000).toISOString() : null

    // Encrypt credentials for storage
    const encryptedUsername = encrypt(username.trim())
    const encryptedPassword = encrypt(password.trim())

    // Save to database securely server-side
    const { error: dbError } = await supabaseAdmin
      .from('payment_credentials')
      .upsert({
        merchant_id: merchantId,
        provider: provider,
        encrypted_username: encryptedUsername,
        encrypted_password: encryptedPassword,
        access_token: accessToken,
        token_expires_at: tokenExpiry,
        merchant_code: merchantCode,
        is_active: true,
        is_connected: true,
        last_login_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,provider' })

    if (dbError) {
      console.error("Failed to save credentials to DB:", dbError)
      return NextResponse.json({ success: false, message: "Failed to securely save credentials" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      merchantCode,
      tokenExpiry: tokenExpiry ? new Date(tokenExpiry).toLocaleString() : "Unknown",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Payment connect error:", message)
    return NextResponse.json({ success: false, message: message }, { status: 500 })
  }
}
