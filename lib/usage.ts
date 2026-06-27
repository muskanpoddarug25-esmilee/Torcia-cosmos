import { supabaseAdmin } from "./supabase/admin"

export type UsageMetric = 'ai_message' | 'qr_generated' | 'vision_analysis'

export async function checkAndIncrementUsage(merchantId: string, metric: UsageMetric): Promise<boolean> {
  try {
    // 1. Get current usage and tier limits
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, qr_generated_used, vision_ai_used, subscription_tiers(max_messages, max_conversations)')
      .eq('id', merchantId)
      .single()

    if (!merchant) return false

    // Default limits if tier not found
    const limits = merchant.subscription_tiers as any || { max_messages: 500, max_conversations: 100 }
    // Define specific limits based on metric
    const maxLimits: Record<UsageMetric, number> = {
      ai_message: limits.max_messages || 1000,
      qr_generated: 1000, // Hardcoded generous limit for QR
      vision_analysis: 200, // Vision is expensive
    }

    // Determine current count
    // Note: for ai_message we could query `usage_records` sum, but to keep it fast we will rely on the vision_ai_used and qr_generated_used columns,
    // For ai_message, let's just do a quick count of usage_records for this month.
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    let currentUsage = 0
    
    if (metric === 'qr_generated') {
      currentUsage = merchant.qr_generated_used || 0
      if (currentUsage >= maxLimits.qr_generated) return false
      
      // Increment fast count
      await supabaseAdmin.rpc('increment_merchant_usage', { p_merchant_id: merchantId, p_column: 'qr_generated_used' }).catch(() => {
        // Fallback if RPC doesn't exist
        supabaseAdmin.from('merchants').update({ qr_generated_used: currentUsage + 1 }).eq('id', merchantId)
      })
    } else if (metric === 'vision_analysis') {
      currentUsage = merchant.vision_ai_used || 0
      if (currentUsage >= maxLimits.vision_analysis) return false
      
      // Increment fast count
      await supabaseAdmin.rpc('increment_merchant_usage', { p_merchant_id: merchantId, p_column: 'vision_ai_used' }).catch(() => {
        supabaseAdmin.from('merchants').update({ vision_ai_used: currentUsage + 1 }).eq('id', merchantId)
      })
    } else if (metric === 'ai_message') {
      // Just check usage_records
      const { count } = await supabaseAdmin
        .from('usage_records')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('metric', 'ai_message')
        .gte('period_start', periodStart)

      currentUsage = count || 0
      if (currentUsage >= maxLimits.ai_message) return false
    }

    // Log the usage record for analytics and billing
    await supabaseAdmin.from('usage_records').insert({
      merchant_id: merchantId,
      metric,
      period_start: periodStart,
      period_end: periodEnd,
      count: 1
    })

    return true
  } catch (error) {
    console.error(`[USAGE] Failed to check usage for ${merchantId}:`, error)
    // Fail open to not block business operations if DB lags
    return true
  }
}
