import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Webhook Verification (same as WhatsApp)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "katalio_secure_webhook_token_123"

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[MESSENGER WEBHOOK] Verification successful")
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.warn("[MESSENGER WEBHOOK] Verification failed. Token mismatch.")
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  return new NextResponse("Bad Request", { status: 400 })
}

// Handle Incoming Messenger Messages
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.META_APP_SECRET

    if (!appSecret) {
      console.error("[MESSENGER WEBHOOK] Missing META_APP_SECRET!")
      return new NextResponse("Server Configuration Error", { status: 500 })
    }

    // Signature verification
    if (!signature) {
      console.warn("[MESSENGER WEBHOOK] Missing signature, rejecting request.")
      return new NextResponse("Missing Signature", { status: 401 })
    }

    const crypto = await import('crypto')
    const expectedSignature = "sha256=" + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf-8').digest('hex')
    if (signature !== expectedSignature) {
      console.warn("[MESSENGER WEBHOOK] Signature mismatch, rejecting request.")
      return new NextResponse("Invalid Signature", { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log(`[MESSENGER WEBHOOK] --------------------------------------------------`)
    console.log(`[MESSENGER WEBHOOK] Incoming POST to /api/webhook/messenger`)

    if (body.object !== "page") {
      console.warn("[MESSENGER WEBHOOK] Rejected: object is not 'page'")
      return new NextResponse("Not a Messenger Webhook", { status: 404 })
    }

    const pageId = body.entry?.[0]?.id

    // Process each messaging event
    for (const entry of body.entry || []) {
      for (const messagingEvent of entry.messaging || []) {
        // Skip non-message events
        if (!messagingEvent.message) {
          console.log("[MESSENGER WEBHOOK] Skipping non-message event:", Object.keys(messagingEvent))
          continue
        }

        // Skip echo messages (messages sent by the page itself)
        if (messagingEvent.message.is_echo) {
          console.log("[MESSENGER WEBHOOK] Skipping echo message")
          continue
        }

        await handleMessageEvent(messagingEvent, pageId, body)
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 })

  } catch (error) {
    console.error("[MESSENGER WEBHOOK] Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

async function handleMessageEvent(messagingEvent: any, pageId: string, fullBody: any) {
  const senderPsid = messagingEvent.sender?.id
  const messageId = messagingEvent.message?.mid
  const messageText = messagingEvent.message?.text || ""
  const attachments = messagingEvent.message?.attachments || []

  // Check for image attachment
  let imageAttachment = attachments.find((a: any) => a.type === "image")
  let messageType = imageAttachment ? "image" : "text"
  let displayText = messageType === "image"
    ? (messagingEvent.message?.text || "[Image sent]")
    : messageText

  console.log(`[MESSENGER WEBHOOK] Message from PSID ${senderPsid}: "${displayText}" (type: ${messageType})`)

  // Initialize Supabase
  const { supabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = supabaseAdmin

  // Idempotency check
  if (messageId) {
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', messageId)
      .eq('source', 'messenger')
      .single()

    if (existingEvent) {
      console.log(`[MESSENGER WEBHOOK] Idempotency catch: Already processed message ${messageId}. Ignoring.`)
      return
    }

    await supabase.from('webhook_events').insert({
      event_id: messageId,
      source: 'messenger',
      payload: fullBody
    })
  }

  // Find merchant by page_id in integrations
  let { data: integration } = await supabase
    .from('integrations')
    .select('merchant_id, access_token')
    .eq('platform_id', pageId)
    .eq('platform', 'messenger')
    .single()

  let merchantId = integration?.merchant_id
  let accessToken = integration?.access_token || process.env.META_PAGE_ACCESS_TOKEN

  // If no integration, try to auto-link using MERCHANT_ID from env
  if (!integration && process.env.MERCHANT_ID && pageId === process.env.META_PAGE_ID) {
    merchantId = process.env.MERCHANT_ID
    console.log(`[MESSENGER WEBHOOK] Auto-linking page ${pageId} to merchant ${merchantId}`)
    
    try {
      await supabase.from('integrations').upsert({
        merchant_id: merchantId,
        platform: 'messenger',
        platform_id: pageId,
        access_token: process.env.META_PAGE_ACCESS_TOKEN || null,
        status: 'active'
      }, { onConflict: 'platform,platform_id' })
      console.log(`[MESSENGER WEBHOOK] Created integration record`)
    } catch (err: any) {
      console.warn('[MESSENGER WEBHOOK] Could not create integration:', err.message)
    }
  }

  if (!merchantId) {
    console.warn(`[MESSENGER WEBHOOK] No integration found for page_id: ${pageId}. Please link the page in the dashboard.`)
    return
  }

  if (!accessToken) {
    console.error("[MESSENGER WEBHOOK] No access token available")
    return
  }

  console.log(`[MESSENGER WEBHOOK] Processing message for merchant ${merchantId}`)

  // Get sender profile from Graph API
  let customerName = "Customer"
  try {
    const profileRes = await fetch(
      `https://graph.facebook.com/v18.0/${senderPsid}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`
    )
    const profile = await profileRes.json()
    if (profile.first_name) {
      customerName = `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    }
    console.log(`[MESSENGER WEBHOOK] Sender profile: ${customerName}`)
  } catch (err) {
    console.warn("[MESSENGER WEBHOOK] Could not fetch sender profile:", err)
  }

  // Upsert Contact (using PSID as phone since Messenger doesn't provide phone)
  let { data: contact } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('merchant_id', merchantId)
    .eq('platform_user_id', senderPsid)
    .eq('platform', 'messenger')
    .single()

  if (!contact) {
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        merchant_id: merchantId,
        name: customerName,
        phone: senderPsid, // Use PSID as identifier
        platform: 'messenger',
        platform_user_id: senderPsid
      })
      .select()
      .single()

    if (contactErr) {
      console.error("[MESSENGER WEBHOOK] Error creating contact:", contactErr)
      return
    }
    contact = newContact
  }

  if (!contact || !contact.id) {
    console.error("[MESSENGER WEBHOOK] Failed to resolve contact ID")
    return
  }

  // Upsert Conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id, ai_state, status')
    .eq('merchant_id', merchantId)
    .eq('contact_id', contact.id)
    .single()

  if (!conversation) {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        merchant_id: merchantId,
        contact_id: contact.id,
        platform: 'messenger',
        status: 'ai_handling',
        unread_count: 0,
        last_message_preview: displayText,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single()

    if (convErr) {
      console.error("[MESSENGER WEBHOOK] Error creating conversation:", convErr)
      return
    }
    conversation = newConv
  } else {
    await supabase
      .from('conversations')
      .update({
        last_message_preview: displayText,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id)
  }

  if (!conversation) {
    console.error("[MESSENGER WEBHOOK] Failed to resolve conversation")
    return
  }

  // Save Customer Message
  console.log(`[MESSENGER WEBHOOK] Saving message from ${senderPsid} to conversation ${conversation.id}`)
  const { error: msgInsertErr } = await supabase.from('messages').insert({
    conversation_id: conversation.id,
    merchant_id: merchantId,
    contact_id: contact.id,
    sender_type: 'customer',
    content: displayText,
    message_type: messageType,
    media_url: imageAttachment?.payload?.url || null,
    media_type: messageType === 'image' ? 'image/jpeg' : null,
    platform: 'messenger',
    platform_message_id: messageId
  })

  if (msgInsertErr) {
    console.error("[MESSENGER WEBHOOK] Failed to save customer message:", msgInsertErr)
    return
  }

  console.log(`[MESSENGER WEBHOOK] Message saved successfully`)

  // Generate AI Response if status is ai_handling or active
  if (conversation.status === 'ai_handling' || conversation.status === 'active') {
    try {
      const [
        { data: settings },
        { data: products },
        { data: pastMessages },
        { data: merchantInfo }
      ] = await Promise.all([
        supabase.from('merchant_settings').select('ai_system_prompt').eq('merchant_id', merchantId).single(),
        supabase.from('products').select('name, price, description, in_stock, product_tag, image_url').eq('merchant_id', merchantId),
        supabase.from('messages').select('sender_type, content, message_type').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('merchants').select('business_name').eq('id', merchantId).single()
      ])

      const storeName = merchantInfo?.business_name || 'this store'

      let storeContext = ""
      let customPromptStr = settings?.ai_system_prompt || ""

      try {
        const sanitizedStr = customPromptStr.replace(/\n/g, '\\n').replace(/\r/g, '')
        const parsed = JSON.parse(sanitizedStr)
        const nptFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kathmandu',
          weekday: 'long',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        })
        const currentTime = nptFormatter.format(new Date())

        storeContext = `
[CURRENT SYSTEM TIME: ${currentTime} NPT]

STORE PROFILE AND POLICIES:
- Business Category: ${parsed.businessCategory || 'Retail Store'}
- Store Opening Hours & Days: ${parsed.days ? parsed.days + ', ' : ''}${parsed.hours || 'Not specified'}
- Delivery Coverage: ${parsed.delivery || 'Not specified'}
- Standard Delivery Time: ${parsed.deliveryTime || 'Not specified'}
- Accepted Payment Methods: ${Array.isArray(parsed.payments) ? parsed.payments.join(", ") : (parsed.payments || 'Not specified')}
- Cash on Delivery (COD): ${parsed.codEnabled ? "Enabled" : "Disabled"}
- Return & Exchange Policy: ${parsed.returnPolicy || 'Not specified'}

CUSTOM INSTRUCTIONS:
${parsed.extra || 'None'}
`
      } catch (e: any) {
        storeContext = `STORE CUSTOM INSTRUCTIONS:\n${customPromptStr}`
      }

      const dbPrompt = `You are Torcia AI, a strict, data-oriented AI sales assistant for a Nepali retail store called "${storeName}".\n${storeContext}`

      const strictRules = `
SYSTEM PERSONA:
You are Torcia AI, an incredibly polite, warm, and helpful digital shopkeeper working for ${storeName} in Nepal. You speak with a natural, humanoid Nepali shopkeeper tone.
CRITICAL: You must ALWAYS prioritize the STORE PROFILE above.

GREETING PATTERN:
When a user says hello or greets you, you MUST reply warmly using this exact structure: "Namaste! Hajur, ma Torcia AI hun ra ma ${storeName} ma kaam garchhu. Tapailai kasari sahayog garna sakchhu?"

PRODUCT INQUIRY PATTERN:
When a customer asks for a SPECIFIC product, you can ONLY mention products that are strictly listed in the provided product catalog.
If the requested specific product is in the catalog and in stock, you MUST use this exact pattern: "Hajur, hami sanga [Product Name] chha. Yesko price Rs. [Price] parchha."
If the specific product is not in the catalog, reply gently: "Maaf garnus hajur, yo product ahile hamro store ma available chhaina."
NEVER invent, hallucinate, or guess specific products, prices, or brands not in the catalog.

BARGAINING AND DISCOUNTS:
If asked for discounts, reply: "Hajur, hamro price ekdam reasonable ra fixed chha. Best quality ko saman matra rakhchau hami."

ORDERING AND DELIVERY PATTERN:
When the user indicates they want to buy or order, you MUST collect: Full Name, Phone Number, and Delivery Address.

DELIVERY AND RETURN POLICIES:
Answer using exactly the details provided in the STORE PROFILE AND POLICIES section above.

OUT OF DOMAIN:
If the customer asks unrelated questions, reply: "Maaf garnus hajur, ma yo store ko barema matra jankari dina sakchhu. Tapailai kunai product chahiyeko chha?"`

      const customPrompt = dbPrompt + "\n" + strictRules

      let productContext = ""
      if (products && products.length > 0) {
        console.log(`[MESSENGER WEBHOOK] Found ${products.length} products for merchant ${merchantId}:`, products.map((p: any) => `${p.name} (Rs.${p.price})`).join(', '))
        productContext = `\n\nPRODUCT CATALOG (ONLY mention these products, nothing else):\n${products.map((p: any) => `- ${p.name}: Rs. ${p.price} [Tag: #${p.product_tag || p.item_code}] (${p.in_stock ? 'In Stock' : 'Out of Stock'}) - ${p.description || 'No description'}`).join('\n')}`
      } else {
        console.warn(`[MESSENGER WEBHOOK] No products found for merchant ${merchantId}! AI will not have product context.`)
        productContext = `\n\nPRODUCT CATALOG: The product catalog is currently empty. If a customer asks for a product, politely tell them the catalog is being updated.`
      }

      const dataExtractionInstructions = `\n\nDATA EXTRACTION RULES:
- If the customer provides their name, phone number, or address, you MUST extract this data and output a JSON block at the very end of your message.
- The JSON block must look exactly like this:
$$JSON: {"name": "Customer Name", "phone": "Phone Number", "address": "Address"}$$
- Only include fields that the customer has provided. If a field is missing, set it to null.`

      const qrInstructions = `\n\nPAYMENT QR RULES (READ VERY CAREFULLY):
- You cannot generate a payment QR code until you have collected the user's Name, Phone, and Delivery Address.
- You have a special tag [GENERATE_QR:amount] that generates a payment QR code.
- ONLY output this tag when ALL of these conditions are met:
  1. You have collected the user's Name, Phone, and Delivery Address.
  2. The customer has clearly CHOSEN a specific product from the catalog
  3. The customer has explicitly CONFIRMED they want to ORDER it (e.g., "yes order it", "confirm", "I'll buy it", "order garnu", "pay garchu")
  4. You have stated the exact total amount and the customer agreed to it
- If ANY of these conditions are NOT met, do NOT output the tag. Ask for the missing information first.
- NEVER output [GENERATE_QR] on greetings, product inquiries, or general questions.
- NEVER output [GENERATE_QR] unless the customer literally says they want to pay/order/buy.
- When you DO output it, place it at the very END of your message. Example:
  "Dhanyabad! Tapaaiko address ra details ko lagi. Tapaaiko total Rs. 1500 bhayo. QR generate gardai chhu! [GENERATE_QR:1500]"
- NEVER make up amounts - only use exact prices from the product catalog.
- If customer says "hello", "hi", or asks about products, just greet them and show products. Do NOT generate QR.`

      const escalationInstructions = `\n\nESCALATION RULES (HUMAN HANDOFF):
- If a customer asks a complex question or asks to talk to a human, you MUST output the exact tag [HANDOFF] at the end of your message.`

      const fullSystemPrompt = customPrompt + productContext + escalationInstructions + dataExtractionInstructions + qrInstructions

      const memoryMessages: { role: "system" | "user" | "assistant", content: string }[] = []
      let currentMemoryLength = 0
      const MAX_MEMORY_LENGTH = 3000

      if (pastMessages && pastMessages.length > 0) {
        for (const msg of pastMessages) {
          const role = msg.sender_type === 'customer' ? 'user' : 'assistant'
          const content = msg.content || ''
          if (currentMemoryLength + content.length > MAX_MEMORY_LENGTH) {
            const remaining = MAX_MEMORY_LENGTH - currentMemoryLength
            if (remaining > 10) {
              memoryMessages.unshift({ role, content: content.substring(0, remaining) + '...' })
              currentMemoryLength += remaining
            }
            break
          } else {
            memoryMessages.unshift({ role, content })
            currentMemoryLength += content.length
          }
        }
      }

      const openai = new OpenAI({
        baseURL: process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        apiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_VISION_API_KEY,
      })

      // Log usage (non-blocking)
      try {
        const { checkAndIncrementUsage } = await import('@/lib/usage')
        await checkAndIncrementUsage(merchantId, 'ai_message')
      } catch (usageErr) {
        console.warn("[MESSENGER WEBHOOK] Usage logging failed:", usageErr)
      }

      // Call AI with product context
      let aiReplyText = "Namaste! Hajur, ma Torcia AI hun. Tapailai kasari sahayog garna sakchhu?"
      let shouldEscalate = false

      try {
        const aiResponse = await openai.chat.completions.create({
          model: process.env.AI_MODEL || "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...memoryMessages,
            { role: "user", content: messageText || "Customer sent an image." }
          ],
          temperature: 0.7,
          max_tokens: 1024,
        })

        aiReplyText = aiResponse.choices?.[0]?.message?.content || "I am currently unable to process your request."

        if (aiReplyText.includes('[HANDOFF]')) {
          shouldEscalate = true
          aiReplyText = aiReplyText.replace(/\[HANDOFF\]/g, '').trim()
        }
      } catch (aiErr) {
        console.error("[MESSENGER WEBHOOK] AI call failed:", aiErr)
      }

      // Check for Data Extraction JSON
      const jsonMatch = aiReplyText.match(/\$\$JSON:\s*(\{[\s\S]*?\})\$\$/) || aiReplyText.match(/\$\$JSON:\s*(\{[\s\S]*?\})/);
      if (jsonMatch) {
        try {
          const extractedData = JSON.parse(jsonMatch[1])
          aiReplyText = aiReplyText.replace(/\$\$JSON:\s*\{[\s\S]*?\}\$\$/, '').replace(/\$\$JSON:\s*\{[\s\S]*?\}/, '').trim()
          const updates: any = {}
          if (extractedData.name) updates.name = extractedData.name
          if (extractedData.address) updates.address = extractedData.address
          if (Object.keys(updates).length > 0) {
            await supabase.from('contacts').update(updates).eq('id', contact.id)
            console.log("[MESSENGER WEBHOOK] Updated contact profile:", updates)
          }
        } catch (e) {
          console.error("[MESSENGER WEBHOOK] Failed to parse extracted JSON:", e)
        }
      }
      
      // Check for QR trigger
      let qrString = ""
      const qrMatch = aiReplyText.match(/\[GENERATE_QR:(\d+)\]/)
      if (qrMatch) {
        const amount = qrMatch[1]
        aiReplyText = aiReplyText.replace(/\[GENERATE_QR:\d+\]/, '').trim()
      
        try {
          console.log(`[QR] Fetching payment credentials for merchant: ${merchantId}`)
          const { data: creds } = await supabase
            .from('payment_credentials')
            .select('encrypted_username, encrypted_password, is_active')
            .eq('merchant_id', merchantId)
            .eq('provider', 'nepalpay')
            .single()
      
          if (creds && creds.encrypted_username && creds.encrypted_password && creds.is_active) {
            const { decrypt } = await import('@/lib/crypto')
            const { generateNepalPayQR } = await import('@/lib/nepalpay')
      
            const username = decrypt(creds.encrypted_username)
            const password = decrypt(creds.encrypted_password)
      
            const { checkAndIncrementUsage: checkQR } = await import('@/lib/usage')
            const canGenerateQR = await checkQR(merchantId, 'qr_generated')
      
            if (canGenerateQR) {
              const qrResult = await generateNepalPayQR(merchantId, username, password, Number(amount), `Order for ${senderPsid}`)
              qrString = qrResult.qrString
              const validationTraceId = qrResult.validationTraceId
      
              if (aiReplyText === "") aiReplyText = `Here is your payment QR for Rs. ${amount}`
      
              // Create order
              const orderedProduct = products?.find(p => p.price === Number(amount))
              const { data: newOrder } = await supabase.from('orders').insert({
                merchant_id: merchantId,
                customer_name: contact.name || senderPsid,
                customer_phone: senderPsid,
                platform: 'messenger',
                status: 'pending',
                amount: Number(amount),
                currency: 'NPR',
                items: [{ 
                  name: orderedProduct?.name || 'Order via Messenger AI', 
                  quantity: 1, 
                  price: Number(amount),
                  image_url: orderedProduct?.image_url || ''
                }],
                notes: `Auto-created from Messenger conversation. QR generated for Rs. ${amount}.`,
                conversation_id: conversation.id,
                contact_id: contact.id,
                payment_method: 'nepalpay',
                payment_status: 'pending',
                qr_validation_trace_id: validationTraceId
              }).select().single()
      
              if (newOrder) {
                console.log(`[ORDER] Created order ${newOrder.id} for Rs. ${amount}`)
                // Schedule QStash polling
                try {
                  const { schedulePaymentPolling, scheduleExpiryFallback } = await import('@/lib/qstash')
                  await schedulePaymentPolling(newOrder.id, validationTraceId, username, password, merchantId, senderPsid, conversation.id)
                  await scheduleExpiryFallback(newOrder.id, validationTraceId, username, password, merchantId, senderPsid, conversation.id)
                } catch (qstashErr: any) {
                  console.warn("[QSTASH] Warning: Failed to schedule polling (ignoring for local dev):", qstashErr.message)
                }
              }
            } else {
              aiReplyText = "I'm sorry, the store has reached its QR generation limit for this month."
              shouldEscalate = true
            }
          } else {
            aiReplyText = "I'm sorry, the store has not configured their payment gateway yet. Please wait for a human agent."
          }
        } catch (e: any) {
          console.error("[QR] Error:", e.message)
          aiReplyText = "An error occurred while generating your payment. Please wait for a human agent."
        }
      }

      // Send Reply via Messenger API
      console.log(`[MESSENGER WEBHOOK] Sending AI reply to PSID ${senderPsid}`)
      console.log(`[MESSENGER WEBHOOK] AI reply: ${aiReplyText.substring(0, 100)}...`)

      const messengerResponse = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          message: { text: aiReplyText }
        })
      })

      const messengerResult = await messengerResponse.json()
      console.log(`[MESSENGER WEBHOOK] Messenger API response:`, JSON.stringify(messengerResult))

      // Send QR image if generated
      if (qrString) {
        try {
          let imageBase64 = qrString
          if (qrString.startsWith('data:')) {
            imageBase64 = qrString.split(',')[1]
          }
          const qrImageBuffer = Buffer.from(imageBase64, 'base64')
          console.log(`[QR] Decoded QR image: ${qrImageBuffer.length} bytes, sending via Messenger...`)

          // Upload image to Messenger using multipart form
          const form = new FormData()
          form.append('message', JSON.stringify({
            attachment: {
              type: 'image',
              payload: { is_reusable: false }
            }
          }))
          form.append('filedata', new Blob([qrImageBuffer], { type: 'image/png' }), 'payment_qr.png')

          const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/message_attachments?access_token=${accessToken}`, {
            method: 'POST',
            body: form,
          })
          const uploadResult = await uploadRes.json()
          console.log(`[QR] Messenger upload response:`, JSON.stringify(uploadResult))

          if (uploadResult.attachment_id) {
            // Send the image using attachment_id
            await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                recipient: { id: senderPsid },
                message: {
                  attachment: {
                    type: 'image',
                    payload: { attachment_id: uploadResult.attachment_id }
                  }
                }
              })
            })
            console.log(`[QR] QR image sent to Messenger`)
          } else {
            console.error(`[QR] Upload failed:`, JSON.stringify(uploadResult))
            await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: senderPsid },
                message: { text: "Your payment QR has been generated but I couldn't send the image. A human agent will help you shortly." }
              })
            })
          }
        } catch (imgErr: any) {
          console.error(`[QR] Image send error:`, imgErr.message)
        }
      }

      // Save AI Message
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        merchant_id: merchantId,
        contact_id: contact.id,
        sender_type: 'agent',
        content: qrString ? `${aiReplyText}\n[QR Code Sent]` : aiReplyText,
        platform: 'messenger',
        is_ai_generated: true,
        platform_message_id: messengerResult.message_id
      })

      // Update conversation preview
      await supabase
        .from('conversations')
        .update({
          last_message_preview: qrString ? '[QR Code Sent]' : aiReplyText,
          last_message_at: new Date().toISOString(),
          ...(shouldEscalate ? { status: 'escalated' } : {})
        })
        .eq('id', conversation.id)

    } catch (err) {
      console.error("[MESSENGER WEBHOOK] AI/Messenger processing error:", err)
    }
  }
}
