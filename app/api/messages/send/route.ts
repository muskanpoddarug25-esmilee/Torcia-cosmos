import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversation_id, content } = body

    if (!conversation_id || !content) {
      return NextResponse.json({ error: "Missing conversation_id or content" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get conversation with contact info
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("*, contact:contacts(*)")
      .eq("id", conversation_id)
      .single()

    if (convErr || !conversation) {
      console.error("Failed to fetch conversation:", convErr)
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const customerPhone = body.platform_customer_id || conversation.contact?.phone
    const platform = body.channel || conversation.platform
    const merchantId = conversation.merchant_id

    // 2. Get the integration for this merchant + platform
    const { data: integration } = await supabase
      .from("integrations")
      .select("access_token, platform_id")
      .eq("merchant_id", merchantId)
      .eq("platform", platform)
      .single()

    let accessToken = process.env.META_ACCESS_TOKEN || integration?.access_token
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || integration?.platform_id

    // 3. Send via WhatsApp API
    if (platform === "whatsapp" && customerPhone && accessToken && phoneNumberId) {
      console.log(`[SEND] Sending message from dashboard to ${customerPhone} via ${phoneNumberId}`)

      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: customerPhone,
          type: "text",
          text: { body: content },
        }),
      })

      const metaResult = await metaRes.json()
      console.log(`[SEND] Meta API response:`, JSON.stringify(metaResult))

      if (metaResult.error) {
        console.error(`[SEND] Meta API error:`, metaResult.error)
        // Still save to DB even if delivery fails
      }
    } else if (platform === "instagram" && customerPhone && accessToken) {
      // Future Instagram routing support
      console.log(`[SEND] Instagram routing not fully implemented, but requested for ${customerPhone}`)
    }

    // 4. Save the message to database
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        merchant_id: merchantId,
        contact_id: conversation.contact_id,
        sender_type: "agent",
        content,
        platform,
        is_ai_generated: false,
      })
      .select()
      .single()

    if (msgErr) {
      console.error("Failed to save message:", msgErr)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    // 5. Update conversation
    await supabase
      .from("conversations")
      .update({
        last_message_preview: content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id)

    return NextResponse.json({ success: true, message: msg })
  } catch (error: any) {
    console.error("Send message error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
