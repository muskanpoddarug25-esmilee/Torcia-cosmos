import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversation_id, amount, remarks } = body

    if (!conversation_id || !amount) {
      return NextResponse.json({ error: "Missing conversation_id or amount" }, { status: 400 })
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

    const customerPhone = conversation.contact?.phone
    const platform = conversation.platform
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

    // 3. Try to fetch real payment credentials
    const { data: creds, error: credsErr } = await supabase
      .from('payment_credentials')
      .select('encrypted_username, encrypted_password, is_active, access_token')
      .eq('merchant_id', merchantId)
      .eq('provider', 'nepalpay')
      .single()

    if (!creds || !creds.encrypted_username || !creds.encrypted_password || !creds.is_active) {
      return NextResponse.json({ error: "Payment gateway is not configured for this store." }, { status: 400 })
    }

    // Dynamic import to avoid crypto issues on edge
    const { decrypt } = await import('@/lib/crypto')
    const { generateNepalPayQR } = await import('@/lib/nepalpay')
    
    const username = decrypt(creds.encrypted_username)
    const password = decrypt(creds.encrypted_password)
    
    // Using proxy server for QR generation
    const qrRes = await fetch("http://localhost:3001/api/trigger-nepalpay-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, amount: Number(amount), remarks: remarks || `Order for ${customerPhone}`, token: creds.access_token })
    })
    
    const qrData = await qrRes.json()
    if (!qrData.success) {
      return NextResponse.json({ error: "Failed to generate NepalPay QR via proxy." }, { status: 500 })
    }

    const qrString = qrData.qrString
    const validationTraceId = qrData.validationTraceId

    // Create order in database
    let createdOrderId = null
    try {
      const { data: newOrder, error: orderErr } = await supabase.from('orders').insert({
        merchant_id: merchantId,
        customer_name: conversation.contact?.name || customerPhone,
        customer_phone: customerPhone,
        platform,
        status: 'pending_payment',
        amount: Number(amount),
        currency: 'NPR',
        items: [{ name: remarks || 'Order via Manual QR', quantity: 1, price: Number(amount) }],
        notes: `Agent manually sent QR for Rs. ${amount}. Remarks: ${remarks || 'None'}\nQR ID: ${validationTraceId || 'N/A'}`,
        conversation_id: conversation.id,
        contact_id: conversation.contact_id,
        payment_method: 'nepalpay',
        payment_status: 'pending',
        payment_qr_string: qrString.substring(0, 200) + '...',
      }).select().single()
      
      if (!orderErr && newOrder) {
        createdOrderId = newOrder.id
        
        // Start background polling
        if (validationTraceId) {
          const { startPaymentPolling } = await import('@/lib/nepalpay-polling')
          // Since we need session cookies for polling, we pass the username/password to proxy via startPaymentPolling
          // Wait, startPaymentPolling needs to be updated to take username/password instead of sessionCookies!
          startPaymentPolling(validationTraceId, username, password, newOrder.id, merchantId, customerPhone, conversation.id)
        }
      }
    } catch (orderCreateErr: any) {
      console.error('[ORDER] Order creation error:', orderCreateErr.message)
    }

    let mediaUrl = null

    // Send via WhatsApp API
    if (platform === "whatsapp" && customerPhone && accessToken && phoneNumberId) {
      console.log(`[SEND QR] Sending QR to ${customerPhone} via ${phoneNumberId}`)

      // NepalPay returns "data:image/png;base64,..." — extract the raw base64
      let imageBase64 = qrString
      if (qrString.startsWith('data:')) {
        imageBase64 = qrString.split(',')[1]
      }
      const qrImageBuffer = Buffer.from(imageBase64, 'base64')

      // Upload to WhatsApp Media API
      const boundary = '----KatalioQR' + Date.now()
      let uploadBody = ''
      uploadBody += `--${boundary}\r\n`
      uploadBody += `Content-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`
      uploadBody += `--${boundary}\r\n`
      uploadBody += `Content-Disposition: form-data; name="type"\r\n\r\nimage/png\r\n`
      uploadBody += `--${boundary}\r\n`
      uploadBody += `Content-Disposition: form-data; name="file"; filename="payment_qr.png"\r\n`
      uploadBody += `Content-Type: image/png\r\n\r\n`
      
      const fullBody = Buffer.concat([
        Buffer.from(uploadBody, 'utf-8'),
        qrImageBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')
      ])

      const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: fullBody,
      })
      const uploadResult = await uploadRes.json()

      if (uploadResult.id) {
        const caption = `📱 Please scan this QR code to pay Rs. ${amount}.\n${remarks ? `Remarks: ${remarks}` : ''}`
        
        const imgSendRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: customerPhone,
            type: "image",
            image: { id: uploadResult.id, caption }
          })
        })
        const imgSendResult = await imgSendRes.json()
        
        if (imgSendResult.error) {
           console.error("[SEND QR] Meta error sending image:", imgSendResult.error)
           return NextResponse.json({ error: "Failed to send QR image to WhatsApp." }, { status: 500 })
        }
        mediaUrl = `whatsapp_media:${uploadResult.id}`
      } else {
        console.error(`[SEND QR] Media upload failed:`, JSON.stringify(uploadResult))
        return NextResponse.json({ error: "Failed to upload QR to WhatsApp." }, { status: 500 })
      }
    }

    const messageContent = `[QR Code Sent for Rs. ${amount}]`

    // Save the message to database
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        merchant_id: merchantId,
        contact_id: conversation.contact_id,
        sender_type: "agent",
        content: messageContent,
        platform,
        message_type: "image",
        media_url: mediaUrl,
        media_type: "image/png",
        is_ai_generated: false,
      })
      .select()
      .single()

    if (msgErr) {
      console.error("Failed to save message:", msgErr)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    // Update conversation
    await supabase
      .from("conversations")
      .update({
        last_message_preview: messageContent,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id)

    return NextResponse.json({ success: true, message: msg, order_id: createdOrderId })
  } catch (error: any) {
    console.error("Send QR error:", error.message, error.stack)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
