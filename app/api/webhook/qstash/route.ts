import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getQStashClient } from "@/lib/qstash"
import { sendWhatsAppConfirmation } from "@/lib/whatsapp-helper"

/**
 * QStash Payment Polling Webhook
 *
 * Called by QStash every ~15 seconds to verify a NepalPay QR payment.
 * Uses the "self-scheduling" pattern: instead of relying on QStash retries
 * (which use exponential backoff), this handler schedules the NEXT poll
 * explicitly with a fixed 15-second delay for precise intervals.
 *
 * Flow:
 *  1. Check if order is still pending_payment → if not, stop (return 200).
 *  2. Call payment proxy to verify transaction.
 *  3. If SUCCESS → mark order "paid", send WhatsApp, stop.
 *  4. If NOT YET → schedule next attempt (15s delay), return 200.
 *  5. If max attempts reached → stop (expiry fallback handles it).
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
      attempt = 1,
      maxAttempts = 20,
    } = body

    console.log(
      `[QSTASH POLL] Attempt ${attempt}/${maxAttempts} for order ${orderId} (trace: ${validationTraceId})`
    )

    // --- 1. Check current order status ---
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("status, payment_status")
      .eq("id", orderId)
      .single()

    if (orderErr || !order) {
      console.error(`[QSTASH POLL] Order ${orderId} not found. Stopping.`)
      return NextResponse.json(
        { success: true, message: "Order not found, stopping polling" },
        { status: 200 }
      )
    }

    // If order is no longer pending_payment, stop polling
    if (order.status !== "pending") {
      console.log(
        `[QSTASH POLL] Order ${orderId} is now "${order.status}". Stopping polling.`
      )
      return NextResponse.json(
        { success: true, message: `Order is ${order.status}, stopping` },
        { status: 200 }
      )
    }

    // --- 2. Call payment proxy ---
    const PROXY_URL =
      process.env.PAYMENT_PROXY_URL || "http://localhost:3001"
    const PROXY_SECRET = process.env.INTERNAL_API_SECRET || ""

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

    // --- 3. Payment SUCCESS ---
    if (
      proxyData?.success &&
      proxyData?.data &&
      (proxyData.data.status === "SUCCESS" ||
        proxyData.data.transactionStatus === "SUCCESS")
    ) {
      const txnId =
        proxyData.data.txnId || proxyData.data.transactionId || validationTraceId

      console.log(
        `[QSTASH POLL] Payment verified for order ${orderId}! TxnID: ${txnId}`
      )

      // Mark order as paid
      await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          payment_status: "completed",
          notes:
            (await getOrderNotes(orderId)) +
            `\nPayment verified via QStash polling (attempt ${attempt}).\nNepalPay Txn ID: ${txnId}\nNQR Txn ID: ${validationTraceId}`,
        })
        .eq("id", orderId)

      // Send WhatsApp confirmation
      await sendWhatsAppConfirmation(
        merchantId,
        customerPhone,
        conversationId,
        `We have successfully received your payment for Order #${orderId.substring(0, 8)} (Txn: ${txnId}). We will process it shortly!`
      )

      return NextResponse.json(
        { success: true, message: "Payment verified", txnId },
        { status: 200 }
      )
    }

    // --- 4. Payment NOT YET — schedule next attempt or stop ---
    if (attempt >= maxAttempts) {
      console.log(
        `[QSTASH POLL] Max attempts (${maxAttempts}) reached for order ${orderId}. Stopping polling. Expiry fallback will handle it.`
      )
      return NextResponse.json(
        { success: true, message: "Max attempts reached, stopping" },
        { status: 200 }
      )
    }

    // Self-schedule the next polling attempt with a 15-second delay
    const client = getQStashClient()
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000"

    await client.publishJSON({
      url: `${baseUrl}/api/webhook/qstash`,
      body: {
        orderId,
        validationTraceId,
        username,
        password,
        merchantId,
        customerPhone,
        conversationId,
        attempt: attempt + 1,
        maxAttempts,
      },
      delay: 15,
      retries: 0,
    })

    console.log(
      `[QSTASH POLL] Scheduled next attempt (${attempt + 1}/${maxAttempts}) in 15s for order ${orderId}`
    )

    return NextResponse.json(
      { success: true, message: `Attempt ${attempt} done, next scheduled` },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[QSTASH POLL] Webhook error:", error.message)
    // Return 200 to prevent QStash from auto-retrying on our behalf
    // (we control retries via self-scheduling)
    return NextResponse.json(
      { error: error.message },
      { status: 200 }
    )
  }
}

/** Helper: fetch existing order notes */
async function getOrderNotes(orderId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("notes")
    .eq("id", orderId)
    .single()
  return data?.notes || ""
}
