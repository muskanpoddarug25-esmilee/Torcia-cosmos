import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// TikTok Webhook — receives incoming DMs and creates conversations in the inbox
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log("[TIKTOK WEBHOOK] Received payload:", JSON.stringify(payload).substring(0, 200))

    // TikTok sends events in a standard structure
    // Expected: { event: "receive_message", content: { ... }, user: { open_id, display_name, avatar_url }, ... }
    const event = payload.event || payload.type
    const messageContent = payload.content?.text || payload.text || payload.message?.text || ""
    const senderOpenId = payload.user?.open_id || payload.from_user_id || payload.sender?.id || ""
    const senderName = payload.user?.display_name || payload.user?.nickname || "TikTok User"
    const senderAvatar = payload.user?.avatar_url || null

    if (!messageContent || !senderOpenId) {
      console.log("[TIKTOK WEBHOOK] Skipping: no message content or sender ID")
      return NextResponse.json({ success: true, skipped: true })
    }

    // 1. Find or create contact
    let { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("platform_customer_id", senderOpenId)
      .single()

    if (!contact) {
      // Find the first merchant (multi-tenant: in production, derive from webhook config)
      const { data: merchants } = await supabaseAdmin
        .from("merchants")
        .select("id")
        .limit(1)
      
      const merchantId = merchants?.[0]?.id
      if (!merchantId) {
        console.error("[TIKTOK WEBHOOK] No merchants found")
        return NextResponse.json({ success: false, error: "No merchant" }, { status: 400 })
      }

      const { data: newContact } = await supabaseAdmin
        .from("contacts")
        .insert({
          merchant_id: merchantId,
          name: senderName,
          platform_customer_id: senderOpenId,
          avatar_url: senderAvatar,
          source: "tiktok",
        })
        .select()
        .single()

      contact = newContact
    }

    if (!contact) {
      return NextResponse.json({ success: false, error: "Failed to create contact" }, { status: 500 })
    }

    // 2. Find or create conversation
    let { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("contact_id", contact.id)
      .eq("platform", "tiktok")
      .single()

    if (!conversation) {
      const { data: newConv } = await supabaseAdmin
        .from("conversations")
        .insert({
          merchant_id: contact.merchant_id,
          contact_id: contact.id,
          platform: "tiktok",
          status: "active",
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100),
          unread_count: 1,
        })
        .select()
        .single()

      conversation = newConv
    } else {
      await supabaseAdmin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100),
          unread_count: (conversation.unread_count || 0) + 1,
        })
        .eq("id", conversation.id)
    }

    // 3. Insert the message
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversation!.id,
      content: messageContent,
      sender_type: "customer",
      is_ai_generated: false,
      message_type: "text",
    })

    console.log(`[TIKTOK WEBHOOK] ✅ Message from "${senderName}" saved to conversation ${conversation!.id}`)

    // TODO: Trigger AI worker to auto-respond (same pattern as WhatsApp webhook)

    return NextResponse.json({ success: true, platform: "tiktok", conversationId: conversation!.id })
  } catch (err: any) {
    console.error("[TIKTOK WEBHOOK] Error:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // TikTok webhook URL verification challenge
  const url = new URL(req.url)
  const challenge = url.searchParams.get("challenge")
  
  if (challenge) {
    return NextResponse.json({ challenge: challenge })
  }
  
  return NextResponse.json({ success: true, platform: "tiktok" })
}
