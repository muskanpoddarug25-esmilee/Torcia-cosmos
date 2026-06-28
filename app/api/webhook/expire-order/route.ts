import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendWhatsAppConfirmation } from "@/lib/whatsapp-helper"

/**
 * QStash Expiry Fallback Webhook (Layer 2)
 *
 * Fires exactly 6 minutes after QR generation.
 * This is the guaranteed fallback for orders that slipped through the
 * local expiry sweep (Layer 1) or when the polling loop exhausted
 * all 20 attempts without payment.
 *
 * Flow:
 *  1. Check if order is still pending_payment → if not, no-op.
 *  2. Do one final proxy check (last-second payment catch).
 *  3. If paid → mark "paid" + notify (same as polling webhook).
 *  4. If unpaid → mark "expired" + send WhatsApp expiry message.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      orderId,
      validationTraceId,
      username,
      password,
      merchantId,
      customerPhone,
      conversationId,
    } = body

    console.log(
      `[EXPIRE FALLBACK] Checking order ${orderId} (trace: ${validationTraceId})`
    )

    // --- 1. Check current status ---
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("status, payment_status, notes")
      .eq("id", orderId)
      .single()

    if (orderErr || !order) {
      console.error(`[EXPIRE FALLBACK] Order ${orderId} not found. No-op.`)
      return NextResponse.json(
        { success: true, message: "Order not found" },
        { status: 200 }
      )
    }

    if (order.status !== "pending") {
      console.log(
        `[EXPIRE FALLBACK] Order ${orderId} is "${order.status}". No action needed.`
      )
      return NextResponse.json(
        { success: true, message: `Order already ${order.status}` },
        { status: 200 }
      )
    }

    // --- 2. Final proxy check (last-second payment catch) ---
    const PROXY_URL =
      process.env.PAYMENT_PROXY_URL || "http://localhost:3001"
    const PROXY_SECRET = process.env.INTERNAL_API_SECRET || ""

    try {
      const proxyRes = await fetch(
        `${PROXY_URL}/api/verify-nepalpay-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": PROXY_SECRET,
          },
          body: JSON.stringify({
            nqrTxnId: validationTraceId,
            username,
            password,
          }),
        }
      )

      const proxyData = await proxyRes.json()

      if (
        proxyData?.success &&
        proxyData?.data &&
        (proxyData.data.status === "SUCCESS" ||
          proxyData.data.transactionStatus === "SUCCESS")
      ) {
        // Last-second payment caught!
        const txnId =
          proxyData.data.txnId ||
          proxyData.data.transactionId ||
          validationTraceId

        console.log(
          `[EXPIRE FALLBACK] Last-second payment caught for order ${orderId}! TxnID: ${txnId}`
        )

        await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            payment_status: "completed",
            notes:
              (order.notes || "") +
              `\nPayment verified via expiry fallback (last-second catch).\nNepalPay Txn ID: ${txnId}\nNQR Txn ID: ${validationTraceId}`,
          })
          .eq("id", orderId)

        await sendWhatsAppConfirmation(
          merchantId,
          customerPhone,
          conversationId,
          `We have successfully received your payment for Order #${orderId.substring(0, 8)} (Txn: ${txnId}). We will process it shortly!`
        )

        return NextResponse.json(
          { success: true, message: "Last-second payment caught", txnId },
          { status: 200 }
        )
      }
    } catch (proxyErr: any) {
      console.warn(
        `[EXPIRE FALLBACK] Proxy check failed for order ${orderId}: ${proxyErr.message}. Proceeding to expire.`
      )
    }

    // --- 3. Mark as expired ---
    console.log(
      `[EXPIRE FALLBACK] Expiring order ${orderId}. No payment detected in 6 minutes.`
    )

    await supabaseAdmin
      .from("orders")
      .update({
        status: "expired",
        payment_status: "expired",
        notes:
          (order.notes || "") +
          `\nOrder expired via QStash fallback (6 min timeout).\nNQR Txn ID: ${validationTraceId}`,
      })
      .eq("id", orderId)

    // Send WhatsApp expiry notification
    await sendWhatsAppConfirmation(
      merchantId,
      customerPhone,
      conversationId,
      "Your payment QR code has expired. If you'd like to proceed with your order, let us know and we'll generate a new one for you!"
    )

    return NextResponse.json(
      { success: true, message: "Order expired" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[EXPIRE FALLBACK] Webhook error:", error.message)
    return NextResponse.json(
      { success: true, error: error.message },
      { status: 200 }
    )
  }
}
