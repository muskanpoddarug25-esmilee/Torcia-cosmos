import { NextRequest, NextResponse } from "next/server"
import { decrypt } from "@/lib/crypto"
import { generateNepalPayQR } from "@/lib/nepalpay"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, amount, remarks, merchantId, username, password } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 })
    }

    if (provider !== "nepalpay") {
      return NextResponse.json({ success: false, message: "Only NepalPay is supported" }, { status: 400 })
    }

    let finalUsername = username
    let finalPassword = password
    let accessToken: string | undefined

    // If username/password not provided directly, fetch from DB
    if (!finalUsername || !finalPassword) {
      const { supabaseAdmin } = await import("@/lib/supabase/admin")

      let mId = merchantId

      if (!mId) {
        return NextResponse.json({ success: false, message: "Missing merchantId in request" }, { status: 400 })
      }

      const { data: creds } = await supabaseAdmin
        .from("payment_credentials")
        .select("encrypted_username, encrypted_password, is_active, access_token")
        .eq("merchant_id", mId)
        .eq("provider", "nepalpay")
        .single()

      if (!creds || !creds.encrypted_username || !creds.encrypted_password) {
        return NextResponse.json({ success: false, message: "NepalPay credentials not configured. Connect your account in Payment Setup." }, { status: 400 })
      }

      if (!creds.is_active) {
        return NextResponse.json({ success: false, message: "NepalPay is currently disabled. Enable it in Payment Setup." }, { status: 400 })
      }

      finalUsername = decrypt(creds.encrypted_username)
      finalPassword = decrypt(creds.encrypted_password)
      accessToken = creds.access_token
    }

    const { qrString, validationTraceId } = await generateNepalPayQR(merchantId || "default", finalUsername, finalPassword, amount, remarks || "Order Payment", accessToken)

    return NextResponse.json({
      success: true,
      qrString,
      validationTraceId
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("QR Generation error:", message)
    return NextResponse.json({ success: false, message: "QR generation failed: " + message }, { status: 500 })
  }
}
