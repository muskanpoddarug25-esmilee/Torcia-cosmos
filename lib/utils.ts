import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNPTTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""
  let d = new Date(dateString)
  if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('+')) {
    d = new Date(dateString + 'Z')
  }
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatNPTDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""
  let d = new Date(dateString)
  if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('+')) {
    d = new Date(dateString + 'Z')
  }
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatNPTDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""
  let d = new Date(dateString)
  if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('+')) {
    d = new Date(dateString + 'Z')
  }
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatPhone(phone?: string): string {
  if (!phone) return "Unknown"
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+977 ${digits}`
  if (digits.startsWith('977')) {
    return `+977 ${digits.substring(3)}`
  }
  if (phone.startsWith('+')) {
    // try to add space after country code if missing
    if (phone.startsWith('+977') && phone.length > 4 && phone[4] !== ' ') {
      return `+977 ${phone.substring(4)}`
    }
    return phone
  }
  return `+${digits}`
}
