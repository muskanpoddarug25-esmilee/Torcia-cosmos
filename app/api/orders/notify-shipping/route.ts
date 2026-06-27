import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json()
    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get order and related data
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, conversations(*), contacts(*)")
      .eq("id", order_id)
      .single()

    if (orderErr || !order) {
      console.error("Order fetch error:", orderErr)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const platform = order.platform || "whatsapp"
    const merchantId = order.merchant_id
    const customerPhone = order.customer_phone
    const conversationId = order.conversation_id

    // Check if we have what we need to send
    if (platform === "whatsapp" && customerPhone && conversationId) {
      // Get integration credentials
      const { data: integration } = await supabase
        .from("integrations")
        .select("access_token, platform_id")
        .eq("merchant_id", merchantId)
        .eq("platform", platform)
        .single()

      const accessToken = process.env.META_ACCESS_TOKEN || integration?.access_token
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || integration?.platform_id

      if (accessToken && phoneNumberId) {
        const textMessage = `Great news! Your order #${order.id.substring(0, 8)} has been shipped and will be delivered today! 🎉`

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
            text: { body: textMessage }
          })
        })

        const metaResult = await metaResponse.json()
        if (!metaResult.error) {
          // Save to messages
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            merchant_id: merchantId,
            contact_id: order.contact_id,
            sender_type: "agent",
            content: textMessage,
            platform,
            message_type: "text",
            is_ai_generated: false,
          })

          // Update conversation last preview
          await supabase.from("conversations").update({
            last_message_preview: textMessage,
            last_message_at: new Date().toISOString()
          }).eq("id", conversationId)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Notify shipping error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
