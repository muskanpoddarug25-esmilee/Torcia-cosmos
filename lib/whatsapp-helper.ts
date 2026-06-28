import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Sends a WhatsApp message via Meta Cloud API and logs it to the database.
 * Shared across all payment webhooks (QStash polling, expiry, etc.)
 */
export async function sendWhatsAppConfirmation(
  merchantId: string,
  customerPhone: string,
  conversationId: string,
  text: string
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

    if (!accessToken || !phoneNumberId) {
      console.warn("[WHATSAPP] No access token or phone number ID found")
      return
    }

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
    if (metaResult.error) {
      console.error("[WHATSAPP] Meta API error:", metaResult.error)
      return
    }

    // Log message to inbox
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      merchant_id: merchantId,
      sender_type: "agent",
      content: text,
      platform,
      message_type: "text",
      is_ai_generated: false,
    })

    // Update conversation preview
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_preview: text,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
  } catch (err: any) {
    console.error("[WHATSAPP] Failed to send message:", err.message)
  }
}
