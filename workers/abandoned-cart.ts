import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { supabaseAdmin } from '../lib/supabase/admin';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const abandonedCartWorker = new Worker('abandoned-cart', async (job: Job) => {
  const { orderId, merchantId, customerPhone, conversationId } = job.data;
  
  console.log(`[BULLMQ] Checking abandoned cart for order ${orderId}`);

  // Check if order is still pending_payment
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status, abandoned_cart_notified')
    .eq('id', orderId)
    .single();
  
  if (order && order.status === 'pending_payment' && !order.abandoned_cart_notified) {
    console.log(`[BULLMQ] Abandoned cart detected for order ${orderId}. Sending reminder.`);
    
    await sendWhatsAppMessage(
      merchantId, 
      customerPhone, 
      conversationId, 
      "Hi! We noticed you haven't completed your payment yet. Let us know if you have any questions or need help with the QR code!"
    );
    
    // Mark as notified so we don't spam them
    await supabaseAdmin
      .from('orders')
      .update({ abandoned_cart_notified: true })
      .eq('id', orderId);
  } else {
    console.log(`[BULLMQ] Order ${orderId} is no longer pending or already notified.`);
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
         console.error("[BULLMQ] Meta API error sending abandoned cart reminder:", metaResult.error)
      }
    }
  } catch (err: any) {
    console.error("[BULLMQ] Failed to send abandoned cart reminder:", err.message)
  }
}
