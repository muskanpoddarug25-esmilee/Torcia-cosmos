import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { supabaseAdmin } from '../lib/supabase/admin';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const paymentWorker = new Worker('payment-verification', async (job: Job) => {
  const { qrId, username, password, orderId, merchantId, customerPhone, conversationId } = job.data;
  const attemptNumber = job.attemptsMade + 1;
  
  console.log(`[BULLMQ] Attempt ${attemptNumber} for QR ${qrId}`);

  try {
    const res = await fetch(`http://localhost:3001/api/verify-nepalpay-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nqrTxnId: qrId, username, password })
    });

    const result = await res.json();
    
    if (result && result.success && result.data && (result.data.status === "SUCCESS" || result.data.transactionStatus === "SUCCESS")) {
      const txnId = result.data.txnId || result.data.transactionId || qrId;
      console.log(`[BULLMQ] Payment Success verified for QR ${qrId}! TxnID: ${txnId}`);
      
      await supabaseAdmin
        .from("orders")
        .update({ 
          status: "paid", 
          payment_status: "completed",
          notes: `Payment successfully verified via BullMQ.\nNepalPay Txn ID: ${txnId}\nNQR Txn ID: ${qrId}`
        })
        .eq("id", orderId);
      
      await sendWhatsAppMessage(
        merchantId, 
        customerPhone, 
        conversationId, 
        `✅ We have successfully received your payment for Order #${orderId.substring(0, 8)} (Txn: ${txnId}). We will process it shortly!`
      );
      
      return { success: true, txnId };
    } else {
      // Throwing an error signals BullMQ to retry based on the backoff config
      throw new Error("Payment not verified yet");
    }
  } catch (err: any) {
    if (attemptNumber >= 20) {
      console.log(`[BULLMQ] Timeout reached for QR ${qrId}. Marking order as expired.`);
      await supabaseAdmin
        .from("orders")
        .update({ status: "expired", payment_status: "expired" })
        .eq("id", orderId);
      
      await sendWhatsAppMessage(
        merchantId, 
        customerPhone, 
        conversationId, 
        "Your payment QR has expired. Let me know if you'd like me to generate a new one."
      );
    }
    throw err;
  }
}, { connection });

async function sendWhatsAppMessage(
  merchantId: string, 
  customerPhone: string, 
  conversationId: string, 
  text: string
) {
  try {
    const platform = "whatsapp"
    const { data: integration } = await supabaseAdmin
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
        await supabaseAdmin.from("messages").insert({
          conversation_id: conversationId,
          merchant_id: merchantId,
          sender_type: "agent",
          content: text,
          platform,
          message_type: "text",
          is_ai_generated: false,
        })

        await supabaseAdmin.from("conversations").update({
          last_message_preview: text,
          last_message_at: new Date().toISOString()
        }).eq("id", conversationId)
      } else {
         console.error("[BULLMQ] Meta API error sending message:", metaResult.error)
      }
    }
  } catch (err: any) {
    console.error("[BULLMQ] Failed to send WhatsApp message:", err.message)
  }
}
