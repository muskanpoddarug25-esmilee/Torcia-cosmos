// NepalPay QR generation via local curl proxy server (port 3001)
// NepalPay blocks Node.js fetch (TLS fingerprinting), so we proxy through
// an Express server that uses raw OS curl commands.

const PROXY_URL = "http://localhost:3001/api/trigger-nepalpay-qr"

export async function generateNepalPayQR(
  merchantId: string,
  username: string,
  password: string,
  amount: number,
  remarks: string,
  token?: string
): Promise<{ qrString: string; validationTraceId: string }> {
  console.log(`[NEPALPAY] Calling curl proxy for Rs. ${amount}...`)

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.trim(),
      password: password.trim(),
      amount: parseInt(String(amount)),
      remarks: remarks || "Order Payment",
      token: token,
    }),
  })

  const data = await res.json()
  console.log(`[NEPALPAY] Proxy response:`, JSON.stringify(data).substring(0, 200))

  if (data.success && data.qrString) {
    console.log(`[NEPALPAY] QR generated: ${data.qrString.substring(0, 50)}...`)
    return { qrString: data.qrString, validationTraceId: data.validationTraceId }
  } else {
    throw new Error(data.message || "QR generation failed")
  }
}
