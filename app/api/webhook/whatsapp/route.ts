import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai';
import { generateNepalPayQR } from "@/lib/nepalpay"
import { enqueuePaymentVerification, enqueueAbandonedCartCheck } from "@/lib/queue"

// Webhook Verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Use a secure verify token defined in env, default for local testing
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "katalio_secure_webhook_token_123"

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 })
    } else {
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  return new NextResponse("Bad Request", { status: 400 })
}

// Handle Incoming Messages
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.META_APP_SECRET

    // --- ALWAYS log the raw payload first ---
    let parsedBody: any = null
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {}
    console.log("[WEBHOOK] --------------------------------------------------")
    console.log("[WEBHOOK] Incoming POST to /api/webhook/whatsapp")
    console.log("[WEBHOOK] Signature header:", signature ? "present" : "MISSING")
    if (parsedBody) {
      console.log("[WEBHOOK] Payload object:", parsedBody.object)
      const entry = parsedBody.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      console.log("[WEBHOOK] Phone number ID from payload:", value?.metadata?.phone_number_id)
      console.log("[WEBHOOK] Message count:", value?.messages?.length || 0)
      console.log("[WEBHOOK] Change field:", changes?.field)
    }

    if (!appSecret) {
      console.error("[WEBHOOK] Missing META_APP_SECRET! Cannot verify signature.");
      return new NextResponse("Server Configuration Error", { status: 500 })
    }

    if (!signature) {
      console.warn("[WEBHOOK] Missing signature! Rejecting request.")
      return new NextResponse("Missing Signature", { status: 401 })
    }

    const crypto = await import('crypto')
    const expectedSignature = "sha256=" + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf-8').digest('hex')

    if (signature !== expectedSignature) {
      console.warn("[WEBHOOK] Signature mismatch! Rejecting request.")
      return new NextResponse("Invalid Signature", { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log(`[WEBHOOK] --------------------------------------------------`)
    console.log(`[WEBHOOK] Incoming WhatsApp message`)

    // Validate Meta Webhook Payload
    if (body.object !== "whatsapp_business_account") {
      console.warn("[WEBHOOK] Rejected: object is not whatsapp_business_account")
      return new NextResponse("Not a WhatsApp Webhook", { status: 404 })
    }

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value || !value.messages || value.messages.length === 0) {
      // Not a message event (could be status update, etc)
      console.log("[WEBHOOK] No messages array in payload. Event type (if any):", value?.statuses ? "status update" : "other")
      return new NextResponse("EVENT_RECEIVED", { status: 200 })
    }

    const message = value.messages[0]
    const contactInfo = value.contacts?.[0]
    const phoneNumberId = value.metadata.phone_number_id

    const customerPhone = message.from
    const customerName = contactInfo?.profile?.name || "Customer"
    const messageText = message.text?.body || ""
    const messageType = message.type // "text", "image", "document", etc.
    const imageMessage = message.image // { id, mime_type, sha256, caption }

    // We now handle both text AND image messages
    if (messageType !== "text" && messageType !== "image") {
      return new NextResponse("Only text and image messages supported", { status: 200 })
    }

    // For display: use caption for images, or body for text
    const displayText = messageType === "image"
      ? (imageMessage?.caption || "[Image sent]")
      : messageText

    // Initialize Supabase Server Client (Using Service Role for backend tasks)
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const supabase = supabaseAdmin;

    // Idempotency check: Have we processed this message.id before?
    if (message.id) {
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('event_id', message.id)
        .eq('source', 'whatsapp')
        .single()

      if (existingEvent) {
        console.log(`[WEBHOOK] Idempotency catch: Already processed message ${message.id}. Ignoring.`)
        return new NextResponse("EVENT_RECEIVED", { status: 200 })
      }

      // Record this event
      await supabase.from('webhook_events').insert({
        event_id: message.id,
        source: 'whatsapp',
        payload: body
      })
    }

    // 1. Find the merchant based on the phone_number_id
    let { data: integration } = await supabase
      .from('integrations')
      .select('merchant_id, access_token')
      .eq('platform_id', phoneNumberId)
      .eq('platform', 'whatsapp')
      .single()

    console.log("[WEBHOOK] Integration lookup result:", integration ? `found merchant ${integration.merchant_id}` : "NOT FOUND")

    let merchantId = integration?.merchant_id
    let accessToken = integration?.access_token

    if (!integration) {
      console.warn(`[WEBHOOK] No integration found for phone_number_id: ${phoneNumberId}. Please link WhatsApp in dashboard.`)
      return new NextResponse("Integration not found", { status: 404 })
    }

    // Use env token if matching phone number
    if (process.env.META_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID === phoneNumberId) {
      accessToken = process.env.META_ACCESS_TOKEN
    }

    // 1.5 Download media if it's an image message, so we can save it in DB directly on insert
    let mediaUrl = imageMessage?.id ? `whatsapp_media:${imageMessage.id}` : null;
    let base64Data = null;
    if (messageType === 'image' && imageMessage?.id) {
      try {
        const { downloadWhatsAppMedia } = await import('@/lib/vision-ai');
        base64Data = await downloadWhatsAppMedia(imageMessage.id, accessToken);
        if (base64Data) {
          mediaUrl = `data:${imageMessage.mime_type || 'image/jpeg'};base64,${base64Data}`;
        }
      } catch (err) {
        console.error("Failed to download image prior to insert:", err);
      }
    }

    // 2. Upsert Contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('merchant_id', merchantId)
      .eq('phone', customerPhone)
      .single()

    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          merchant_id: merchantId,
          name: customerName,
          phone: customerPhone,
          platform: 'whatsapp',
          platform_user_id: customerPhone
        })
        .select()
        .single()

      if (contactErr) {
        console.error("Error creating contact:", contactErr)
        return new NextResponse("Internal Server Error - Contact", { status: 500 })
      }
      contact = newContact
    }

    if (!contact || !contact.id) {
      console.error("Failed to resolve contact ID")
      return new NextResponse("Internal Server Error - Contact ID missing", { status: 500 })
    }

    // 3. Upsert Conversation
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
          platform: 'whatsapp',
          status: 'ai_handling',
          unread_count: 0,
          last_message_preview: displayText,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (convErr) {
        console.error("Error creating conversation:", convErr)
        return new NextResponse("Internal Server Error - Conversation", { status: 500 })
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

    // 4. Save Customer Message
    if (!conversation) {
      console.error("[WEBHOOK] Failed to resolve conversation")
      return new NextResponse("Internal Server Error - Conversation missing", { status: 500 })
    }

    console.log(`[WEBHOOK] Saving message from ${customerPhone} to conversation ${conversation.id}, merchant ${merchantId}`)
    const { error: msgInsertErr } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      merchant_id: merchantId,
      contact_id: contact.id,
      sender_type: 'customer',
      content: displayText,
      message_type: messageType,
      media_url: mediaUrl,
      media_type: messageType === 'image' ? (imageMessage?.mime_type || 'image/jpeg') : null,
      platform: 'whatsapp',
      platform_message_id: message.id
    })

    if (msgInsertErr) {
      console.error("[WEBHOOK] Failed to save customer message:", msgInsertErr)
      return new NextResponse("Failed to save message", { status: 500 })
    }

    console.log(`[WEBHOOK] Message saved successfully`)

    // 5. Generate AI Response if status is ai_handling or active
    if (conversation.status === 'ai_handling' || conversation.status === 'active') {
      try {
        // Run independent database queries in parallel for performance
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
        ]);
        const storeName = merchantInfo?.business_name || 'this store';
        // Parse settings JSON
        let storeContext = "";
        let customPromptStr = settings?.ai_system_prompt || "";

        try {
          // Sanitize potential literal newlines added via manual DB edits before parsing
          const sanitizedStr = customPromptStr.replace(/\n/g, '\\n').replace(/\r/g, '');
          const parsed = JSON.parse(sanitizedStr);

          // Get current NPT time
          const nptFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kathmandu',
            weekday: 'long',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          });
          const currentTime = nptFormatter.format(new Date());

          storeContext = `
[CURRENT SYSTEM TIME: ${currentTime} NPT]

STORE PROFILE AND POLICIES:
- Business Category: ${parsed.businessCategory || 'Retail Store'}
  (You must act as an expert assistant for this specific category. Do not hallucinate products outside this domain.)
- Store Opening Hours & Days: ${parsed.days ? parsed.days + ', ' : ''}${parsed.hours || 'Not specified'}
  (If the CURRENT SYSTEM TIME is outside these hours, politely inform the customer that the store is currently closed but their message is saved and the owner will respond during working hours.)
- Delivery Coverage: ${parsed.delivery || 'Not specified'}
- Standard Delivery Time: ${parsed.deliveryTime || 'Not specified'}
- Accepted Payment Methods: ${Array.isArray(parsed.payments) ? parsed.payments.join(", ") : (parsed.payments || 'Not specified')}
- Cash on Delivery (COD): ${parsed.codEnabled ? "Enabled" : "Disabled"}
- Return & Exchange Policy: ${parsed.returnPolicy || 'Not specified'}

CUSTOM INSTRUCTIONS:
${parsed.extra || 'None'}
`;
        } catch (e: any) {
          console.error("=== JSON PARSE ERROR ===", e.message);
          console.error("FAILED STRING WAS:", customPromptStr);
          // Fallback if legacy text
          storeContext = `
STORE CUSTOM INSTRUCTIONS:
${customPromptStr}
`;
        }

        const dbPrompt = `You are Torcia AI, a strict, data-oriented AI sales assistant for a Nepali retail store called "${storeName}".\n${storeContext}`;
        console.log("=== AI SYSTEM PROMPT ===", dbPrompt);
        // Debug prompt dump removed for security
        const strictRules = `
SYSTEM PERSONA:
You are Torcia AI, an incredibly polite, warm, and helpful digital shopkeeper working for ${storeName} in Nepal. You speak with a natural, humanoid Nepali shopkeeper tone. You are respectful, gentle, and use terms like "Hajur" to show respect to the customer. Never sound like a robotic AI.
CRITICAL: You must ALWAYS prioritize the STORE PROFILE above. If anything you said in the previous chat history contradicts the current STORE PROFILE (e.g., about delivery locations or products), you MUST correct yourself and follow the current STORE PROFILE.

GREETING PATTERN:
When a user says hello or greets you, you MUST reply warmly using this exact structure: "Namaste! Hajur, ma Torcia AI hun ra ma ${storeName} ma kaam garchhu. Tapailai kasari sahayog garna sakchhu?"

PRODUCT INQUIRY PATTERN:
When a customer asks generally "What do you sell?" or "What is your business?", use the STORE PROFILE and CUSTOM INSTRUCTIONS to describe your offerings in a natural way. Do NOT just list random items from the catalog.
When a customer asks for a SPECIFIC product, you can ONLY mention products that are strictly listed in the provided product catalog.
If the requested specific product is in the catalog and in stock, you MUST use this exact pattern: "Hajur, hami sanga [Product Name] chha. Yesko price Rs. [Price] parchha." (Example: Hajur, hami sanga Hero Hunk 150R ko chain sprocket chha. Yesko price Rs. 2500 parchha.)
If the specific product is not in the catalog, reply gently: "Maaf garnus hajur, yo product ahile hamro store ma available chhaina."
NEVER invent, hallucinate, or guess specific products, prices, or brands not in the catalog.

BARGAINING AND DISCOUNTS (STRICT RULE):
Nepali customers will often ask for discounts (e.g., "Ali milaera dinus na", "Discount chhaina?"). You MUST strictly reply: "Hajur, hamro price ekdam reasonable ra fixed chha. Best quality ko saman matra rakhchau hami." Do not offer discounts unless explicitly listed in the product catalog.

ORDERING AND DELIVERY PATTERN:
When the user indicates they want to buy or order, you MUST collect three specific details before proceeding: Full Name, Phone Number, and Delivery Address.

DELIVERY AND RETURN POLICIES:
When the customer asks about delivery or returns, you MUST answer using exactly the details provided in the STORE PROFILE AND POLICIES section above.
- For delivery locations, read the 'Delivery Coverage' field. (e.g. if it says "pokhara and kathmandu", tell them both).
- For delivery timing, read the 'Standard Delivery Time' field.
- For returns, read the 'Return & Exchange Policy' field.
Do not invent, assume, or hide any policies. Just simply state what is written in the STORE PROFILE.
If the user provides a delivery address that is NOT covered by the 'Delivery Coverage', gently inform them: "Maaf garnus hajur, hamro delivery service ahile tya available chhaina."
Once you have collected the Name, Phone Number, and a valid address that fits the policy, you MUST clearly confirm the total amount.
PAYMENT AND QR RULES:
You must ONLY trigger the payment QR code when the customer has clearly confirmed their order, provided all delivery details, and agreed to the total amount.
Always summarize the order and confirm the final total amount right before generating the QR code.

OUT OF DOMAIN (STRICT GUARDRAIL):
You are a specialized retail assistant for this specific store, NOT a general AI chatbot.
If the customer asks for math calculations (like 7-4), coding help, historical facts, jokes, or anything completely unrelated to this store's products and policies, you MUST refuse.
Do NOT attempt to answer the unrelated question.
Reply EXACTLY with this phrase: "Maaf garnus hajur, ma yo store ko barema matra jankari dina sakchhu. Tapailai kunai product chahiyeko chha?"`;

        const customPrompt = dbPrompt + "\n" + strictRules;


        let productContext = ""
        if (products && products.length > 0) {
          productContext = `\n\nPRODUCT CATALOG (ONLY mention these products, nothing else):\n${products.map((p: any) => `- ${p.name}: Rs. ${p.price} [Tag: #${p.product_tag || p.item_code}] (${p.in_stock ? 'In Stock' : 'Out of Stock'}) - ${p.description || 'No description'}`).join('\n')}`
        } else {
          productContext = `\n\nPRODUCT CATALOG: The product catalog is currently empty. If a customer asks for a product, politely tell them the catalog is being updated. IMPORTANT: Even though the catalog is empty, the STORE PROFILE (Delivery Coverage, Delivery Time, Return Policy) is ACTIVE and VALID. You MUST still answer questions about delivery and returns accurately using the STORE PROFILE.`
        }

        // === VISION AI: Handle image messages with Gemma 3n ===
        let visionContext = ""
        if (messageType === "image" && imageMessage?.id) {
          console.log(`[WEBHOOK] Image message received, analyzing with Vision AI (gemma-3n)...`)

          try {
            const { analyzeImageWithVision } = await import('@/lib/vision-ai')

            // We already downloaded base64 before the DB insert!
            const imageBase64 = base64Data

            if (imageBase64) {
              // Rate Limiting check for Vision AI
              const { checkAndIncrementUsage } = await import('@/lib/usage')
              const canUseVision = await checkAndIncrementUsage(merchantId, 'vision_analysis')
              
              if (!canUseVision) {
                visionContext = `\n\n[VISION AI CONTEXT]: The customer sent an image, but the store has exceeded its Vision AI quota for this month. Tell the customer to describe the product in text.`
              } else {
                // Send to Vision AI for analysis
                const visionResult = await analyzeImageWithVision(
                  imageBase64,
                  products || [],
                  imageMessage.caption?.toLowerCase().includes('pay') ? 'payment' : 'identify'
                )

              console.log(`[VISION] Analysis result:`, JSON.stringify(visionResult).substring(0, 300))

              if (visionResult.success) {
                if (visionResult.matchedProduct) {
                  // Product matched!
                  visionContext = `\n\n[VISION AI CONTEXT]: The customer just sent a product image. Gemma Vision AI identified it as: "${visionResult.description}". MATCHED PRODUCT: ${visionResult.matchedProduct.name} (Rs. ${visionResult.matchedProduct.price}, Tag: #${visionResult.matchedProduct.product_tag}). Confirm this product with the customer and ask if they'd like to order it.`
                } else if (visionResult.isPaymentScreenshot) {
                  visionContext = `\n\n[VISION AI CONTEXT]: The customer sent a PAYMENT SCREENSHOT. Description: "${visionResult.description}". Acknowledge the payment and tell them you're verifying it. Say something like "Payment ko screenshot dekheko chhu, verify gardai chhu! Tapaaiko order confirm bhayo!" Do NOT generate a QR code.`

                  // Auto-update the latest pending order for this customer to paid
                  try {
                    const { data: pendingOrder } = await supabase
                      .from('orders')
                      .select('id, amount')
                      .eq('merchant_id', merchantId)
                      .eq('customer_phone', customerPhone)
                      .eq('payment_status', 'pending')
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .single()

                    if (pendingOrder) {
                      await supabase.from('orders').update({
                        status: 'confirmed',
                        payment_status: 'paid',
                        payment_verified_at: new Date().toISOString(),
                        notes: `Payment verified via Vision AI. Screenshot description: ${visionResult.description}`,
                      }).eq('id', pendingOrder.id)
                      console.log(`[ORDER] Marked order ${pendingOrder.id} (Rs. ${pendingOrder.amount}) as PAID`)
                    } else {
                      console.log('[ORDER] No pending order found for this customer to mark as paid')
                    }
                  } catch (payErr: any) {
                    console.error('[ORDER] Failed to update order payment:', payErr.message)
                  }
                } else {
                  visionContext = `\n\n[VISION AI CONTEXT]: The customer sent an image. Vision AI description: "${visionResult.description}". No exact product match found in catalog. Ask the customer what product they're looking for, or describe what similar items you have.`
                }
              } else {
                visionContext = `\n\n[VISION AI CONTEXT]: Customer sent an image but Vision AI could not analyze it. Ask the customer to describe what product they're interested in using text.`
              }
            }
            } else {
              visionContext = `\n\n[VISION AI CONTEXT]: Customer sent an image but it could not be downloaded. Ask them to resend or describe the product in text.`
            }
          } catch (visionErr) {
            console.error('[VISION] Error during image analysis:', visionErr)
            visionContext = `\n\n[VISION AI CONTEXT]: Customer sent an image but there was an error analyzing it. Ask them to describe what they're looking for.`
          }
        }

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
- If a customer asks a complex question you cannot solve, asks to talk to a human/agent/owner, or is extremely upset, you MUST output the exact tag [HANDOFF] at the end of your message.
- Tell the customer politely that you are transferring them to a human agent, and include the tag at the end. Example: "I understand. I am transferring you to a human agent who will be with you shortly. [HANDOFF]"`

        const dataExtractionInstructions = `\n\nDATA EXTRACTION RULES:
- If the customer provides their name, phone number, or address, you MUST extract this data and output a JSON block at the very end of your message.
- The JSON block must look exactly like this:
$$JSON: {"name": "Customer Name", "phone": "Phone Number", "address": "Address"}$$
- Only include fields that the customer has provided. If a field is missing, set it to null.
- Example: "Thank you! I have saved your details. $$JSON: {"name": "Ram", "phone": null, "address": "Kathmandu"}$$"`;

        const fullSystemPrompt = customPrompt + productContext + qrInstructions + escalationInstructions + dataExtractionInstructions + visionContext

        // Build the user message for the text AI (Llama)
        const userContent = messageType === "image"
          ? (imageMessage?.caption || "Customer sent a product image. Check the [VISION AI CONTEXT] above for what they sent.")
          : messageText

        const memoryMessages: { role: "system" | "user" | "assistant", content: string }[] = []
        let currentMemoryLength = 0
        const MAX_MEMORY_LENGTH = 3000

        if (pastMessages && pastMessages.length > 0) {
          // Process from newest to oldest to prioritize newest in truncation limit
          for (const msg of pastMessages) {
            const role = msg.sender_type === 'customer' ? 'user' : 'assistant'
            const content = msg.content || (msg.message_type === 'image' ? '[Customer sent an image]' : '')

            if (currentMemoryLength + content.length > MAX_MEMORY_LENGTH) {
              const remaining = MAX_MEMORY_LENGTH - currentMemoryLength
              if (remaining > 10) {
                memoryMessages.unshift({ role, content: content.substring(0, remaining) + '...' })
                currentMemoryLength += remaining
              }
              break // Stop adding older messages
            } else {
              memoryMessages.unshift({ role, content })
              currentMemoryLength += content.length
            }
          }
        }

        const openai = new OpenAI({
          baseURL: process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1',
          apiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_VISION_API_KEY,
        });

        // Log usage (non-blocking)
        try {
          const { checkAndIncrementUsage } = await import('@/lib/usage')
          await checkAndIncrementUsage(merchantId, 'ai_message')
        } catch (usageErr) {
          console.warn("[WEBHOOK] Usage logging failed:", usageErr)
        }

        // Call AI with product context
        let aiReplyText = "Namaste! Hajur, ma Torcia AI hun. Tapailai kasari sahayog garna sakchhu?"
        let shouldEscalate = false

        try {
          const aiResponse = await openai.chat.completions.create({
            model: process.env.AI_MODEL || "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: fullSystemPrompt
              },
              ...memoryMessages,
              { role: "user", content: userContent }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          });

          aiReplyText = aiResponse.choices?.[0]?.message?.content || "I am currently unable to process your request."

          if (aiReplyText.includes('[HANDOFF]')) {
            shouldEscalate = true
            aiReplyText = aiReplyText.replace(/\[HANDOFF\]/g, '').trim()
          }
        } catch (aiErr) {
          console.error("[WEBHOOK] AI call failed:", aiErr)
        }

        // Check for Data Extraction JSON
        const jsonMatch = aiReplyText.match(/\$\$JSON:\s*(\{[\s\S]*?\})\$\$/) || aiReplyText.match(/\$\$JSON:\s*(\{[\s\S]*?\})/);
        if (jsonMatch) {
          try {
            const extractedData = JSON.parse(jsonMatch[1]);
            // Remove the JSON block from the reply text
            aiReplyText = aiReplyText.replace(/\$\$JSON:\s*\{[\s\S]*?\}\$\$/, '').replace(/\$\$JSON:\s*\{[\s\S]*?\}/, '').trim();

            // Update contact profile (never update phone to avoid breaking WhatsApp linkage)
            const updates: any = {};
            if (extractedData.name) updates.name = extractedData.name;
            if (extractedData.address) updates.address = extractedData.address;

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('contacts')
                .update(updates)
                .eq('id', contact.id);

              console.log("[WEBHOOK] Updated contact profile:", updates);
            }
          } catch (e) {
            console.error("[WEBHOOK] Failed to parse extracted JSON data:", e);
          }
        }

        let qrString = ""  // Raw QR data string from NepalPay
        // Check for QR trigger
        const qrMatch = aiReplyText.match(/\[GENERATE_QR:(\d+)\]/)
        if (qrMatch) {
          const amount = qrMatch[1]
          // Remove the tag from the text sent to user
          aiReplyText = aiReplyText.replace(/\[GENERATE_QR:\d+\]/, '').trim()

          try {

            // 1. Try to fetch real payment credentials
            console.log(`[QR] Fetching payment credentials for merchant: ${merchantId}`)
            const { data: creds, error: credsErr } = await supabase
              .from('payment_credentials')
              .select('encrypted_username, encrypted_password, is_active')
              .eq('merchant_id', merchantId)
              .eq('provider', 'nepalpay')
              .single()

            console.log(`[QR] Creds found: ${!!creds}, error: ${credsErr?.message || 'none'}, is_active: ${creds?.is_active}`)

            if (creds && creds.encrypted_username && creds.encrypted_password && creds.is_active) {
              try {
                // Dynamic import to avoid crypto issues on edge if not using node
                const { decrypt } = await import('@/lib/crypto')
                const { generateNepalPayQR } = await import('@/lib/nepalpay')

                const username = decrypt(creds.encrypted_username)
                const password = decrypt(creds.encrypted_password)
                console.log(`[QR] Decrypted credentials for user: ${username.substring(0, 5)}***`)

                // Rate limiting for QR
                const { checkAndIncrementUsage } = await import('@/lib/usage')
                const canGenerateQR = await checkAndIncrementUsage(merchantId, 'qr_generated')

                if (!canGenerateQR) {
                  qrString = ""
                  aiReplyText = "I'm sorry, the store has reached its QR generation limit for this month. Please wait for a human agent."
                  shouldEscalate = true
                } else {
                  const qrResult = await generateNepalPayQR(merchantId, username, password, Number(amount), `Order for ${customerPhone}`)
                  qrString = qrResult.qrString
                  const validationTraceId = qrResult.validationTraceId
                  
                  console.log(`[QR] Successfully generated NepalPay QR string (${qrString.length} chars): ${qrString.substring(0, 50)}...`)
                  if (aiReplyText === "") aiReplyText = `Here is your payment QR for Rs. ${amount}`

                  // Create order in database
                  try {
                    const { data: newOrder, error: orderErr } = await supabase.from('orders').insert({
                      merchant_id: merchantId,
                      customer_name: contact.name || customerPhone,
                      customer_phone: customerPhone,
                      platform: 'whatsapp',
                      status: 'pending',
                      amount: Number(amount),
                      currency: 'NPR',
                      items: [{ name: 'Order via WhatsApp AI', quantity: 1, price: Number(amount) }],
                      notes: `Auto-created from WhatsApp conversation. QR generated for Rs. ${amount}.`,
                      conversation_id: conversation.id,
                      contact_id: contact.id,
                      payment_method: 'nepalpay',
                      payment_status: 'pending',
                      payment_qr_string: qrString.substring(0, 200) + '...',
                      qr_validation_trace_id: validationTraceId
                    }).select().single()
                    if (orderErr) {
                      console.error('[ORDER] Failed to create order:', orderErr.message)
                    } else {
                      console.log(`[ORDER] Created order ${newOrder?.id} for Rs. ${amount}`)
                      
                      // 1. Payment Verification Polling (BullMQ)
                      await enqueuePaymentVerification({
                        qrId: validationTraceId,
                        username,
                        password,
                        orderId: newOrder.id,
                        merchantId,
                        customerPhone,
                        conversationId: conversation.id
                      }).catch(e => console.error('[QUEUE] Failed to enqueue payment verification:', e))

                      // 2. Abandoned Cart Recovery Worker (BullMQ)
                      await enqueueAbandonedCartCheck({
                        orderId: newOrder.id,
                        merchantId,
                        customerPhone,
                        conversationId: conversation.id
                      }).catch(e => console.error('[QUEUE] Failed to enqueue abandoned cart check:', e))
                    }
                  } catch (orderCreateErr: any) {
                    console.error('[ORDER] Order creation error:', orderCreateErr.message)
                  }
                }
              } catch (e: any) {
                console.error("[QR] Failed to generate real NepalPay QR:", e.message, e.stack)
                aiReplyText = "I'm sorry, our payment system is currently unavailable. Please try again later or wait for a human agent."
              }
            } else {
              // Show error if not configured
              console.log("[QR] No payment credentials found, showing error")
              aiReplyText = "I'm sorry, the store has not configured their payment gateway yet. Please wait for a human agent."
            }
          } catch (e: any) {
            console.error("[QR] QR Error:", e.message, e.stack)
            aiReplyText = "An error occurred while generating your payment."
          }
        }

        // 6. Send Reply via Meta API
        console.log(`[WEBHOOK] Sending AI reply to ${customerPhone} via phone_number_id ${phoneNumberId}`)
        console.log(`[WEBHOOK] AI reply text: ${aiReplyText.substring(0, 100)}...`)

        const metaSendBody = {
          messaging_product: "whatsapp",
          to: customerPhone,
          type: "text",
          text: { body: aiReplyText }
        }

        const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metaSendBody)
        })

        const metaResult = await metaResponse.json()
        console.log(`[WEBHOOK] Meta API response status: ${metaResponse.status}`)
        console.log(`[WEBHOOK] Meta API response body:`, JSON.stringify(metaResult))

        // Then send the QR image if available
        if (qrString) {
          try {
            // NepalPay returns "data:image/png;base64,..." — extract the raw base64
            let imageBase64 = qrString
            if (qrString.startsWith('data:')) {
              imageBase64 = qrString.split(',')[1] // Strip "data:image/png;base64,"
            }
            const qrImageBuffer = Buffer.from(imageBase64, 'base64')
            console.log(`[QR] Decoded QR image from base64: ${qrImageBuffer.length} bytes`)

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

            console.log(`[QR] Uploading ${qrImageBuffer.length} bytes to WhatsApp Media API...`)
            const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/media`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
              },
              body: fullBody,
            })
            const uploadResult = await uploadRes.json()
            console.log(`[QR] Media upload response:`, JSON.stringify(uploadResult))

            if (uploadResult.id) {
              console.log(`[QR] Sending image via media_id: ${uploadResult.id}`)
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
                  image: { id: uploadResult.id, caption: "📱 NepalPay QR - Scan to pay" }
                })
              })
              const imgSendResult = await imgSendRes.json()
              console.log(`[QR] Image send result:`, JSON.stringify(imgSendResult))
            } else {
              console.error(`[QR] Media upload failed:`, JSON.stringify(uploadResult))
              shouldEscalate = true
              // Fallback: tell customer to wait for human
              await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: customerPhone,
                  type: "text",
                  text: { body: "Your payment QR has been generated but I couldn't send the image. I am handing over this chat to the store person and they will help you." }
                })
              })
            }
          } catch (imgErr: any) {
            console.error(`[QR] Image pipeline error:`, imgErr.message)
            shouldEscalate = true
            await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: customerPhone,
                type: "text",
                text: { body: "Your payment QR has been generated but I couldn't send the image. I am handing over this chat to the store person and they will help you." }
              })
            })
          }
        }

        // 7. Save AI Message
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          merchant_id: merchantId,
          contact_id: contact.id,
          sender_type: 'agent',
          content: qrString ? `${aiReplyText}\n[QR Code Sent]` : aiReplyText,
          platform: 'whatsapp',
          is_ai_generated: true,
          platform_message_id: metaResult.messages?.[0]?.id
        })

        // Update conversation preview again
        await supabase
          .from('conversations')
          .update({
            last_message_preview: qrString ? `[QR Code Sent]` : aiReplyText,
            last_message_at: new Date().toISOString(),
            ...(shouldEscalate ? { status: 'escalated' } : {})
          })
          .eq('id', conversation.id)

      } catch (err) {
        console.error("AI/Meta processing error:", err)
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 })

  } catch (error) {
    console.error("Webhook Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
