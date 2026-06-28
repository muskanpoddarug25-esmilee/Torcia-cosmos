import { supabaseAdmin } from "../lib/supabase/admin"

/**
 * Local Expiry Sweep Worker (Layer 1 Safety Net)
 *
 * Runs every 5 minutes to sweep the database for stale orders
 * that have been stuck in "pending_payment" for longer than 5 minutes.
 *
 * This is the primary local expiry mechanism. The QStash delayed job
 * (Layer 2, fires at 6 min) acts as a fallback if this worker somehow
 * misses an order.
 *
 * For each stale order:
 *  1. Mark as "expired"
 *  2. Send WhatsApp notification to customer
 */

const SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const STALE_THRESHOLD_MIN = 5 // Orders older than 5 minutes are considered stale

let sweepTimer: ReturnType<typeof setInterval> | null = null

async function runExpirySweep(): Promise<void> {
  console.log("[EXPIRY SWEEP] Running stale order sweep...")

  try {
    // Calculate the cutoff time (5 minutes ago)
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MIN * 60 * 1000).toISOString()

    // Find all stale pending orders
    const { data: staleOrders, error } = await supabaseAdmin
      .from("orders")
      .select("id, customer_phone, conversation_id, merchant_id, notes, status")
      .eq("status", "pending")
      .lt("created_at", cutoff)

    if (error) {
      console.error("[EXPIRY SWEEP] DB query error:", error.message)
      return
    }

    if (!staleOrders || staleOrders.length === 0) {
      console.log("[EXPIRY SWEEP] No stale orders found.")
      return
    }

    console.log(
      `[EXPIRY SWEEP] Found ${staleOrders.length} stale order(s) to expire.`
    )

    for (const order of staleOrders) {
      try {
        // Double-check status hasn't changed since query
        const { data: freshOrder } = await supabaseAdmin
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .single()

        if (!freshOrder || freshOrder.status !== "pending") {
          console.log(
            `[EXPIRY SWEEP] Order ${order.id} already ${freshOrder?.status}. Skipping.`
          )
          continue
        }

        // Mark as expired
        await supabaseAdmin
          .from("orders")
          .update({
            status: "expired",
            payment_status: "expired",
            notes:
              (order.notes || "") +
              `\nOrder expired via local sweep (>${STALE_THRESHOLD_MIN} min stale).`,
          })
          .eq("id", order.id)

        console.log(`[EXPIRY SWEEP] Expired order ${order.id}`)

        // Send WhatsApp notification
        if (
          order.customer_phone &&
          order.conversation_id &&
          order.merchant_id
        ) {
          await sendWhatsAppExpiryNotification(
            order.merchant_id,
            order.customer_phone,
            order.conversation_id
          )
        }
      } catch (orderErr: any) {
        console.error(
          `[EXPIRY SWEEP] Failed to expire order ${order.id}:`,
          orderErr.message
        )
      }
    }

    console.log("[EXPIRY SWEEP] Sweep complete.")
  } catch (err: any) {
    console.error("[EXPIRY SWEEP] Sweep failed:", err.message)
  }
}

async function sendWhatsAppExpiryNotification(
  merchantId: string,
  customerPhone: string,
  conversationId: string
): Promise<void> {
  try {
    const platform = "whatsapp"
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("access_token, platform_id")
      .eq("merchant_id", merchantId)
      .eq("platform", platform)
      .single()

    const accessToken =
      process.env.META_ACCESS_TOKEN || integration?.access_token
    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID || integration?.platform_id

    if (!accessToken || !phoneNumberId) return

    const text =
      "Your payment QR code has expired. If you'd like to proceed with your order, let us know and we'll generate a new one for you!"

    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: customerPhone,
          type: "text",
          text: { body: text },
        }),
      }
    )

    const metaResult = await metaResponse.json()
    if (!metaResult.error) {
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        merchant_id: merchantId,
        sender_type: "agent",
        content: text,
        platform,
        message_type: "text",
        is_ai_generated: false,
      })

      await supabaseAdmin
        .from("conversations")
        .update({
          last_message_preview: text,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
    }
  } catch (err: any) {
    console.error(
      "[EXPIRY SWEEP] Failed to send WhatsApp notification:",
      err.message
    )
  }
}

/** Start the expiry sweep interval */
export function startExpirySweep(): void {
  if (sweepTimer) return

  console.log(
    `[EXPIRY SWEEP] Starting local expiry sweep (every ${SWEEP_INTERVAL_MS / 1000}s, stale threshold ${STALE_THRESHOLD_MIN} min)`
  )

  // Run immediately on startup, then every interval
  runExpirySweep()
  sweepTimer = setInterval(runExpirySweep, SWEEP_INTERVAL_MS)
}

/** Stop the expiry sweep (for graceful shutdown) */
export function stopExpirySweep(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer)
    sweepTimer = null
    console.log("[EXPIRY SWEEP] Stopped.")
  }
}
