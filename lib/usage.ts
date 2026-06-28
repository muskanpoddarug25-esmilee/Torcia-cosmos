import { supabaseAdmin } from "./supabase/admin"

export type UsageMetric = 'ai_message' | 'qr_generated' | 'vision_analysis'

export async function checkAndIncrementUsage(merchantId: string, metric: UsageMetric): Promise<boolean> {
  try {
    // Get merchant and tier limits
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, qr_generated_used, vision_ai_used, subscription_tiers(max_messages, max_conversations)')
      .eq('id', merchantId)
      .single()

    if (!merchant) {
      console.warn(`[USAGE] Merchant ${merchantId} not found, failing open`)
      return true // fail open
    }

    const limits = (merchant.subscription_tiers as any) || { max_messages: 500, max_conversations: 100 }
    const maxLimits: Record<UsageMetric, number> = {
      ai_message: limits.max_messages || 1000,
      qr_generated: 1000,
      vision_analysis: 200,
    }

    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    let currentUsage = 0

    if (metric === 'qr_generated') {
      currentUsage = merchant.qr_generated_used || 0
      if (currentUsage >= maxLimits.qr_generated) {
        console.warn(`[USAGE] ${metric} limit reached: ${currentUsage}/${maxLimits.qr_generated}`)
        return false
      }
      try {
        await supabaseAdmin.rpc('increment_merchant_usage', { p_merchant_id: merchantId, p_column: 'qr_generated_used' })
      } catch {
        await supabaseAdmin.from('merchants').update({ qr_generated_used: currentUsage + 1 }).eq('id', merchantId)
      }
    } else if (metric === 'vision_analysis') {
      currentUsage = merchant.vision_ai_used || 0
      if (currentUsage >= maxLimits.vision_analysis) {
        console.warn(`[USAGE] ${metric} limit reached: ${currentUsage}/${maxLimits.vision_analysis}`)
        return false
      }
      try {
        await supabaseAdmin.rpc('increment_merchant_usage', { p_merchant_id: merchantId, p_column: 'vision_ai_used' })
      } catch {
        await supabaseAdmin.from('merchants').update({ vision_ai_used: currentUsage + 1 }).eq('id', merchantId)
      }
    } else if (metric === 'ai_message') {
      // AI messages: always allow, just log usage
      // No hard limit blocking for now - track usage for billing only
      console.log(`[USAGE] Logging ai_message for merchant ${merchantId}`)
    }

    // Log usage record for analytics/billing
    try {
      await supabaseAdmin.from('usage_records').insert({
        merchant_id: merchantId,
        metric,
        period_start: periodStart,
        period_end: periodEnd,
        count: 1
      })
    } catch (insertErr) {
      console.warn(`[USAGE] Could not insert usage record (non-blocking):`, insertErr)
    }

    return true
  } catch (error) {
    console.error(`[USAGE] Failed to check usage for ${merchantId}:`, error)
    return true // fail open
  }
}
