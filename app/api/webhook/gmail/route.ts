import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Gmail Webhook — receives incoming emails (e.g. via Google Cloud Pub/Sub push)
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log("[GMAIL WEBHOOK] Received payload:", JSON.stringify(payload).substring(0, 200))

    // Note: In a real Google Cloud Pub/Sub push, the payload is base64 encoded in payload.message.data
    // We assume a simplified or pre-parsed structure for this example:
    // { message: { from: "user@example.com", name: "John Doe", text: "Hello", ... } }
    
    // Attempt to extract from various possible formats
    let senderEmail = payload.message?.from || payload.from || payload.sender || ""
    let senderName = payload.message?.name || payload.name || senderEmail.split('@')[0] || "Email User"
    let messageContent = payload.message?.text || payload.text || payload.body || ""
    
    // Extract email from string like "John Doe <john@example.com>"
    const emailMatch = senderEmail.match(/<(.+)>/)
    if (emailMatch) {
      senderEmail = emailMatch[1]
    }

    if (!messageContent || !senderEmail) {
      console.log("[GMAIL WEBHOOK] Skipping: no message content or sender email")
      return NextResponse.json({ success: true, skipped: true })
    }

    // 1. Find or create contact
    let { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("platform_customer_id", senderEmail) // Use email as the platform ID for Gmail
      .single()

    if (!contact) {
      // Find the first merchant (multi-tenant: in production, derive from webhook config/token)
      const { data: merchants } = await supabaseAdmin
        .from("merchants")
        .select("id")
        .limit(1)
      
      const merchantId = merchants?.[0]?.id
      if (!merchantId) {
        console.error("[GMAIL WEBHOOK] No merchants found")
        return NextResponse.json({ success: false, error: "No merchant" }, { status: 400 })
      }

      const { data: newContact } = await supabaseAdmin
        .from("contacts")
        .insert({
          merchant_id: merchantId,
          name: senderName,
          platform_customer_id: senderEmail,
          email: senderEmail,
          source: "gmail",
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
      .eq("platform", "gmail")
      .single()

    if (!conversation) {
      const { data: newConv } = await supabaseAdmin
        .from("conversations")
        .insert({
          merchant_id: contact.merchant_id,
          contact_id: contact.id,
          platform: "gmail",
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

    console.log(`[GMAIL WEBHOOK] ✅ Email from "${senderEmail}" saved to conversation ${conversation!.id}`)

    // TODO: Trigger AI worker to auto-respond

    return NextResponse.json({ success: true, platform: "gmail", conversationId: conversation!.id })
  } catch (err: any) {
    console.error("[GMAIL WEBHOOK] Error:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Gmail verification challenge or health check
  return NextResponse.json({ success: true, platform: "gmail", status: "listening" })
}
