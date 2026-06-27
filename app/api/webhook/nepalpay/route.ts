import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log("[NEPALPAY WEBHOOK] Received payload:", JSON.stringify(payload, null, 2))

    // Determine status (usually status === 'SUCCESS' or similar)
    const isSuccess = payload.status === "SUCCESS" || payload.txnStatus === "SUCCESS"
    
    // NepalPay might send amount and remarks
    const amountStr = payload.amount || payload.txnAmount
    const amount = amountStr ? Number(amountStr) : null
    const remarks = payload.remarks || payload.userDetail?.remarks

    // Idempotency check
    const txnId = payload.transactionId || payload.txnId || payload.instructionId
    if (txnId) {
      const { data: existingEvent } = await supabaseAdmin
        .from('webhook_events')
        .select('id')
        .eq('event_id', txnId)
        .eq('source', 'nepalpay')
        .single()

      if (existingEvent) {
        console.log(`[NEPALPAY WEBHOOK] Idempotency catch: Already processed transaction ${txnId}. Ignoring.`)
        return NextResponse.json({ success: true, received: true, ignored: true })
      }

      await supabaseAdmin.from('webhook_events').insert({
        event_id: txnId,
        source: 'nepalpay',
        payload: payload
      })
    }

    if (isSuccess) {
      const supabase = supabaseAdmin

      // Try to find the matching pending order
      // We look for a pending order with this trace ID
      let query = supabase
        .from("orders")
        .select("*")
        .eq("status", "pending_payment")
        .eq("payment_method", "nepalpay")

      // Match exactly using the trace ID if it is provided by the webhook payload
      // Usually it's in validationTraceId or transactionId or txnId
      if (payload.validationTraceId) {
        query = query.eq("qr_validation_trace_id", payload.validationTraceId)
      } else if (txnId) {
        // Fallback: some webhooks pass it as instructionId or txnId
        query = query.eq("qr_validation_trace_id", txnId)
      } else if (amount) {
        // Ultimate fallback: match by amount if trace ID is completely missing
        query = query.eq("amount", amount)
      }

      query = query.order("created_at", { ascending: false }).limit(1)

      const { data: orders, error } = await query

      if (!error && orders && orders.length > 0) {
        const order = orders[0]
        console.log(`[NEPALPAY WEBHOOK] Matched order ${order.id}. Updating status to paid.`)

        // Update the order
        await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "completed",
            notes: (order.notes || "") + `\nPayment confirmed via NepalPay webhook: ${payload.transactionId || payload.txnId || 'N/A'}`
          })
          .eq("id", order.id)

        // Send a message to the customer confirming payment
        const platform = order.platform
        const customerPhone = order.customer_phone
        const conversationId = order.conversation_id
        
        if (platform === "whatsapp" && customerPhone && conversationId) {
          const { data: integration } = await supabase
            .from("integrations")
            .select("access_token, platform_id")
            .eq("merchant_id", order.merchant_id)
            .eq("platform", platform)
            .single()

          const accessToken = process.env.META_ACCESS_TOKEN || integration?.access_token
          const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || integration?.platform_id

          if (accessToken && phoneNumberId) {
            const msgText = `✅ We have successfully received your payment of Rs. ${amount} for Order #${order.id.substring(0, 8)}. We will process it shortly!`
            
            await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: customerPhone,
                type: "text",
                text: { body: msgText }
              })
            })

            // Save to messages
            await supabase.from("messages").insert({
              conversation_id: conversationId,
              merchant_id: order.merchant_id,
              contact_id: order.contact_id,
              sender_type: "agent",
              content: msgText,
              platform,
              message_type: "text",
              is_ai_generated: false,
            })
          }
        }
      } else {
        console.log("[NEPALPAY WEBHOOK] No matching pending order found for amount", amount)
      }
    }

    return NextResponse.json({ success: true, received: true })
  } catch (err: any) {
    console.error("[NEPALPAY WEBHOOK] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
