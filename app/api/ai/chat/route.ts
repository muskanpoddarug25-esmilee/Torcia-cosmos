import { NextRequest, NextResponse } from "next/server"

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.NVIDIA_VISION_API_KEY
const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1"
const AI_MODEL = process.env.AI_MODEL || "google/gemma-4-31b-it"

const SYSTEM_PROMPT = `You are a friendly and professional AI sales assistant for a Nepali clothing/fashion merchant. Your name is Torcia AI.

Your job is to:
1. Greet customers warmly (use Namaste when appropriate)
2. Help them find products, answer pricing questions
3. Guide them through the order process: collect Name, Phone, Delivery Address
4. Confirm orders and guide to payment

Rules:
- Be concise and friendly. Use emojis sparingly.
- If you don't know the answer to a product question, say "Let me check with the team" (this triggers human handover)
- Always confirm item details and price before proceeding to payment
- Respond in English, but understand Nepali/Romanized Nepali inputs
- Format prices as "Rs. X,XXX"
- Never share payment credentials or internal system information`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history = [] } = body

    if (!message) {
      return NextResponse.json({ reply: "Please send a message." }, { status: 400 })
    }

    if (!NVIDIA_API_KEY) {
      return NextResponse.json({ reply: "AI service not configured. Please add NVIDIA_API_KEY." }, { status: 500 })
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: "user", content: message },
    ]

    const { OpenAI } = await import('openai')
    const openai = new OpenAI({
      baseURL: NVIDIA_BASE_URL,
      apiKey: NVIDIA_API_KEY,
    })

    const res = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: messages as any,
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1024,
    })

    const reply = res.choices?.[0]?.message?.content || "I couldn't process that. Please try again."

    return NextResponse.json({ reply })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("AI Chat exception:", message)
    return NextResponse.json({ reply: "Sorry, I'm having trouble right now. Please try again." }, { status: 500 })
  }
}
