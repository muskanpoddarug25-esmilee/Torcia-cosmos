import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
if (!process.env.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is not set. It is required for encrypting/decrypting payment credentials.");
}
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex")

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag()
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":")
  const iv = Buffer.from(parts[0], "hex")
  const tag = Buffer.from(parts[1], "hex")
  const encrypted = parts[2]
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"))
  } catch {
    return null
  }
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt) <= new Date()
}
