import { Client } from "@upstash/qstash"

let _client: Client | null = null

export function getQStashClient(): Client {
  if (!_client) {
    const token = process.env.QSTASH_TOKEN
    if (!token) {
      throw new Error("QSTASH_TOKEN is not set in environment variables")
    }
    _client = new Client({ token })
  }
  return _client
}

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000"
}

/**
 * Schedules the first QStash polling attempt for a payment.
 * The webhook itself reschedules subsequent attempts (self-scheduling pattern)
 * to guarantee exact 15-second intervals between each poll.
 *
 * @param orderId - The Supabase order UUID
 * @param validationTraceId - NepalPay NQR transaction ID (from QR generation)
 * @param username - Decrypted NepalPay merchant username
 * @param password - Decrypted NepalPay merchant password
 * @param merchantId - Merchant UUID for WhatsApp integration lookup
 * @param customerPhone - Customer phone for WhatsApp notification
 * @param conversationId - Conversation UUID for message logging
 * @param maxAttempts - Total polling attempts (default 20 → 20×15s = 5 minutes)
 */
export async function schedulePaymentPolling(
  orderId: string,
  validationTraceId: string,
  username: string,
  password: string,
  merchantId: string,
  customerPhone: string,
  conversationId: string,
  maxAttempts = 20
): Promise<void> {
  const client = getQStashClient()
  const baseUrl = getAppBaseUrl()

  await client.publishJSON({
    url: `${baseUrl}/api/webhook/qstash`,
    body: {
      orderId,
      validationTraceId,
      username,
      password,
      merchantId,
      customerPhone,
      conversationId,
      attempt: 1,
      maxAttempts,
    },
    // Fire the first attempt immediately (no delay)
    retries: 0,
  })

  console.log(
    `[QSTASH] Scheduled polling for order ${orderId} (trace: ${validationTraceId}, max ${maxAttempts} attempts)`
  )
}

/**
 * Schedules a one-off delayed job that fires exactly 6 minutes after QR generation.
 * Acts as Layer 2 expiry fallback if the local expiry sweep (Layer 1) missed the order.
 *
 * @param orderId - The Supabase order UUID
 * @param validationTraceId - NepalPay NQR transaction ID (for final proxy check)
 * @param username - Decrypted NepalPay merchant username
 * @param password - Decrypted NepalPay merchant password
 * @param merchantId - Merchant UUID
 * @param customerPhone - Customer phone
 * @param conversationId - Conversation UUID
 */
export async function scheduleExpiryFallback(
  orderId: string,
  validationTraceId: string,
  username: string,
  password: string,
  merchantId: string,
  customerPhone: string,
  conversationId: string
): Promise<void> {
  const client = getQStashClient()
  const baseUrl = getAppBaseUrl()

  await client.publishJSON({
    url: `${baseUrl}/api/webhook/expire-order`,
    body: {
      orderId,
      validationTraceId,
      username,
      password,
      merchantId,
      customerPhone,
      conversationId,
    },
    // Fire exactly 6 minutes from now
    delay: 360,
    retries: 3,
  })

  console.log(
    `[QSTASH] Scheduled expiry fallback for order ${orderId} in 6 minutes`
  )
}
