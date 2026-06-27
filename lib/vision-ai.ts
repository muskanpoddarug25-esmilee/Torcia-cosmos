/**
 * Vision AI utility using Google Gemma 3n via NVIDIA NIM
 * 
 * Used for:
 * 1. Product screenshot matching — customer sends product image, AI identifies it
 * 2. Payment screenshot verification — customer sends payment proof
 * 
 * Both models (Llama for text, Gemma for vision) use the same NVIDIA NIM API
 * endpoint but different API keys and model IDs.
 */

const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1"
const VISION_API_KEY = process.env.NVIDIA_VISION_API_KEY
const VISION_MODEL = process.env.VISION_AI_MODEL || "google/gemma-3n-e2b-it"

export interface VisionAnalysisResult {
  success: boolean
  description: string
  matchedProduct?: {
    name: string
    price: number
    product_tag: string
  } | null
  isPaymentScreenshot: boolean
  error?: string
}

/**
 * Analyze an image using Gemma 3n Vision AI
 * 
 * @param imageUrl - URL of the image to analyze (from WhatsApp media)
 * @param imageBase64 - Base64-encoded image data (alternative to URL)
 * @param products - Product catalog for matching
 * @param context - Additional context (e.g., "match this to a product")
 */
export async function analyzeImageWithVision(
  imageBase64: string,
  products: { name: string; price: number; product_tag?: string; description?: string }[],
  context: string = "identify"
): Promise<VisionAnalysisResult> {
  if (!VISION_API_KEY) {
    return {
      success: false,
      description: "Vision AI not configured",
      isPaymentScreenshot: false,
      error: "NVIDIA_VISION_API_KEY not set",
    }
  }

  // Build product catalog context for the AI
  const productList = products.length > 0
    ? products.map((p) => `- ${p.name} (Rs. ${p.price}) [Tag: #${p.product_tag || "N/A"}] - ${p.description || ""}`).join("\n")
    : "No products in catalog"

  const systemPrompt = `You are a vision-capable product matching AI for a Nepali e-commerce store. 

Your job is to analyze the image the customer sent and determine:
1. Is this a PRODUCT image? If yes, try to match it to one of the products in the catalog below.
2. Is this a PAYMENT SCREENSHOT (e.g., Fonepay, NepalPay, eSewa, bank transfer receipt)? If yes, note it.
3. If it's neither, describe what you see briefly.

PRODUCT CATALOG:
${productList}

RESPONSE FORMAT — You MUST respond in this exact JSON format, nothing else:
{
  "type": "product" | "payment" | "other",
  "description": "Brief description of what you see in the image",
  "matched_product_name": "Exact product name from catalog if matched, or null",
  "matched_product_tag": "Product tag if matched, or null",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Only match to products that visually match what's in the image
- If you're not confident about a match, set confidence to "low"
- For payment screenshots, look for amounts, transaction IDs, and payment app logos
- Keep descriptions concise (1-2 sentences)
- ALWAYS respond in valid JSON only`

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VISION_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: context === "payment"
                  ? "Is this a payment screenshot? If so, what amount and payment method?"
                  : "What product is this? Can you match it to anything in the catalog?",
              },
            ],
          },
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 512,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[VISION AI] API error ${response.status}:`, errText.substring(0, 200))
      return {
        success: false,
        description: "Vision AI API error",
        isPaymentScreenshot: false,
        error: `API ${response.status}: ${errText.substring(0, 100)}`,
      }
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ""

    // Try to parse JSON from the response
    let parsed: any = null
    try {
      // Extract JSON from response (AI might wrap it in markdown code blocks)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      console.warn("[VISION AI] Could not parse JSON response:", rawContent.substring(0, 200))
    }

    if (parsed) {
      // Find matched product from catalog
      let matchedProduct = null
      if (parsed.matched_product_name && parsed.type === "product") {
        const found = products.find(
          (p) =>
            p.name.toLowerCase() === parsed.matched_product_name.toLowerCase() ||
            (parsed.matched_product_tag && p.product_tag === parsed.matched_product_tag)
        )
        if (found) {
          matchedProduct = {
            name: found.name,
            price: found.price,
            product_tag: found.product_tag || "",
          }
        }
      }

      return {
        success: true,
        description: parsed.description || rawContent,
        matchedProduct,
        isPaymentScreenshot: parsed.type === "payment",
      }
    }

    // Fallback: couldn't parse JSON, use raw text
    return {
      success: true,
      description: rawContent,
      matchedProduct: null,
      isPaymentScreenshot: rawContent.toLowerCase().includes("payment") || rawContent.toLowerCase().includes("transaction"),
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[VISION AI] Exception:", msg)
    return {
      success: false,
      description: "Vision AI processing failed",
      isPaymentScreenshot: false,
      error: msg,
    }
  }
}

/**
 * Download an image from WhatsApp Media API and convert to base64
 * WhatsApp media URLs require the access token to download
 */
export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string
): Promise<string | null> {
  try {
    // Step 1: Get the media URL from WhatsApp API
    const mediaInfoRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const mediaInfo = await mediaInfoRes.json()

    if (!mediaInfo.url) {
      console.error("[VISION] No media URL returned for ID:", mediaId)
      return null
    }

    // Step 2: Download the actual image
    const imageRes = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!imageRes.ok) {
      console.error("[VISION] Failed to download media:", imageRes.status)
      return null
    }

    const arrayBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    return base64
  } catch (error) {
    console.error("[VISION] Media download error:", error)
    return null
  }
}
