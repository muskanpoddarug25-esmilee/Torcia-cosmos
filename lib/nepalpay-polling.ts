import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Using service role or anon key depending on your server setup
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 

/**
 * Background polling mechanism to verify NepalPay QR code payments.
 * 
 * @param qrId The NepalPay QR ID returned during generation
 * @param username NepalPay username for proxy login
 * @param password NepalPay password for proxy login
 * @param orderId The internal order ID in Supabase
 * @param merchantId The merchant ID to fetch credentials for Meta API
 * @param customerPhone The customer's WhatsApp phone number
 * @param conversationId The active conversation ID for logging messages
 */
export function startPaymentPolling(
  qrId: string, 
  username: string,
  password: string,
  orderId: string, 
  merchantId: string, 
  customerPhone: string, 
  conversationId: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  let attempts = 0
  const maxAttempts = 20 // 20 attempts * 15s = 5 minutes
  const intervalMs = 15000 // Polling every 15 seconds to stay safely under rate limits

  const intervalId = setInterval(async () => {
    attempts++
    console.log(`[POLLING] Attempt ${attempts}/${maxAttempts} for QR ${qrId}`)

    // Timeout Condition: Maximum 5 minutes (30 attempts)
    if (attempts > maxAttempts) {
      clearInterval(intervalId)
      console.log(`[POLLING] Timeout reached for QR ${qrId}. Marking order as expired.`)
      
      // Update order status to Expired
      await supabase
        .from("orders")
        .update({ status: "expired", payment_status: "expired" })
        .eq("id", orderId)
      
      // Trigger LLM/Agent to send expiration message
      await sendWhatsAppMessage(
        supabase, 
        merchantId, 
        customerPhone, 
        conversationId, 
        "Your payment QR has expired. Let me know if you'd like me to generate a new one."
      )
      return
    }

    try {
      // Endpoint: POST to our local proxy server
      const res = await fetch(`http://localhost:3001/api/verify-nepalpay-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nqrTxnId: qrId,
          username,
          password
        })
      })

      const result = await res.json()
      
      console.log(`[POLLING] Proxy Result:`, JSON.stringify(result))

      // Success Condition: The proxy successfully verified the transaction
      // Wait! What if NepalPay returns status="SUCCESS" but data.transactionStatus === "PENDING"?
      // Let's check for a specific success marker like data.txnId existing or data.transactionStatus === "SUCCESS"
      if (result && result.success && result.data && (result.data.status === "SUCCESS" || result.data.transactionStatus === "SUCCESS")) {
        clearInterval(intervalId)
        const txnId = result.data.txnId || result.data.transactionId || qrId
        console.log(`[POLLING] Payment Success verified for QR ${qrId}! TxnID: ${txnId}`)
        
        // Update order status to Paid
        await supabase
          .from("orders")
          .update({ 
            status: "paid", 
            payment_status: "completed",
            notes: `Payment successfully verified via background polling.\nNepalPay Txn ID: ${txnId}\nNQR Txn ID: ${qrId}`
          })
          .eq("id", orderId)
        
        // Trigger LLM/Agent to send success message
        await sendWhatsAppMessage(
          supabase, 
          merchantId, 
          customerPhone, 
          conversationId, 
          `✅ We have successfully received your payment for Order #${orderId.substring(0, 8)} (Txn: ${txnId}). We will process it shortly!`
        )
      }
    } catch (err: any) {
      console.error(`[POLLING] Error fetching status for QR ${qrId}:`, err.message)
      // On network failure, we do nothing and let the next interval try again.
    }
  }, intervalMs)
}

// Helper function to send the WhatsApp message
async function sendWhatsAppMessage(
  supabase: any, 
  merchantId: string, 
  customerPhone: string, 
  conversationId: string, 
  text: string
) {
  try {
    const platform = "whatsapp"
    const { data: integration } = await supabase
      .from("integrations")
      .select("access_token, platform_id")
      .eq("merchant_id", merchantId)
      .eq("platform", platform)
      .single()

    const accessToken = process.env.META_ACCESS_TOKEN || integration?.access_token
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || integration?.platform_id

    if (accessToken && phoneNumberId) {
      const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: customerPhone,
          type: "text",
          text: { body: text }
        })
      })

      const metaResult = await metaResponse.json()
      if (!metaResult.error) {
        // Log the message in our database so it appears in the inbox
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          merchant_id: merchantId,
          contact_id: null, // Depending on your schema, you might need to fetch contact_id
          sender_type: "agent",
          content: text,
          platform,
          message_type: "text",
          is_ai_generated: false,
        })

        // Update conversation summary
        await supabase.from("conversations").update({
          last_message_preview: text,
          last_message_at: new Date().toISOString()
        }).eq("id", conversationId)
      } else {
         console.error("[POLLING] Meta API error sending message:", metaResult.error)
      }
    }
  } catch (err: any) {
    console.error("[POLLING] Failed to send WhatsApp message:", err.message)
  }
}
