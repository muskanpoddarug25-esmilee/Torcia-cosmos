"use client"

import { useState, useEffect } from "react"
import { useMerchant } from "@/lib/merchant-context"
import { createClient } from "@/lib/supabase/client"
import { Check, CreditCard, Zap, QrCode, MessageSquare, Crown, Loader2 } from "lucide-react"

const tiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for testing the waters and small shops.",
    features: [
      "1 Social Channel (WhatsApp, Insta, or Messenger)",
      "Up to 500 AI replies / month",
      "10 Automated NepalPay Orders",
      "Omnichannel Inbox Access",
    ],
    buttonText: "Current Plan",
    highlighted: false,
    limit: 500
  },
  {
    name: "Plus",
    price: "Rs. 999",
    period: "/month",
    description: "For growing businesses that want full automation.",
    features: [
      "2 Social Channels (e.g., Insta + WhatsApp)",
      "Up to 3,000 AI replies / month",
      "150 Automated NepalPay Orders",
      "Broadcast Marketing Basics",
    ],
    buttonText: "Upgrade to Plus",
    highlighted: true,
    limit: 3000
  },
  {
    name: "Pro",
    price: "Rs. 1,999",
    period: "/month",
    description: "For established businesses dominating online sales.",
    features: [
      "Unlimited Social Channels (+ TikTok incoming)",
      "Unlimited AI Replies",
      "Vision AI Unlocked (Image recognition)",
      "500 Automated NepalPay Orders",
    ],
    buttonText: "Upgrade to Pro",
    highlighted: false,
    limit: Infinity
  },
]

export default function BillingPage() {
  const { merchant, tier } = useMerchant()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  const [currentUsage, setCurrentUsage] = useState({
    aiMessages: 0,
    aiLimit: 500,
    qrGenerated: 0,
    qrLimit: 100,
    activeChannels: 1,
    channelsLimit: 1
  })

  useEffect(() => {
    if (merchant && tier) {
      fetchUsage()
    }
  }, [merchant, tier])

  const fetchUsage = async () => {
    const aiLimit = tier?.metadata?.ai_reply_limit || 500
    const qrLimit = tier?.metadata?.payment_qr_limit || 100

    // Fetch AI messages count for current month from usage_records (or fallback to merchants column)
    const d = new Date()
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    
    const { data: usageData } = await supabase
      .from('usage_records')
      .select('metric, count')
      .eq('merchant_id', merchant?.id)
      .gte('period_start', firstDay)

    let aiCount = 0
    let qrCount = merchant?.qr_generated_used || 0

    if (usageData) {
      usageData.forEach(u => {
        if (u.metric === 'ai_message') aiCount += u.count
        if (u.metric === 'qr_generated') qrCount += u.count
      })
    }

    setCurrentUsage({
      aiMessages: aiCount,
      aiLimit,
      qrGenerated: qrCount,
      qrLimit,
      activeChannels: 1, // To be pulled from integrations table
      channelsLimit: tier?.name === 'pro' ? Infinity : tier?.name === 'plus' ? 2 : 1
    })
    
    setLoading(false)
  }

  const aiPercentage = currentUsage.aiLimit === Infinity ? 0 : (currentUsage.aiMessages / currentUsage.aiLimit) * 100
  const qrPercentage = currentUsage.qrLimit === Infinity ? 0 : (currentUsage.qrGenerated / currentUsage.qrLimit) * 100

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <h1 className="text-[28px] font-black text-slate-900 tracking-tight flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-[#6366F1]" />
          Billing & Usage
        </h1>
        <p className="text-[15px] text-slate-500 font-medium mt-2">
          Manage your subscription plan and monitor your monthly usage limits.
        </p>
      </div>

      {/* Usage Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900">AI Messages</h3>
          </div>
          <div className="mt-auto">
            <div className="flex items-end justify-between mb-2">
              <span className="text-[24px] font-bold text-slate-900">{currentUsage.aiMessages}</span>
              <span className="text-[13px] font-medium text-slate-500 pb-1">/ {currentUsage.aiLimit} limit</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${aiPercentage > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(aiPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900">QR Codes Generated</h3>
          </div>
          <div className="mt-auto">
            <div className="flex items-end justify-between mb-2">
              <span className="text-[24px] font-bold text-slate-900">{currentUsage.qrGenerated}</span>
              <span className="text-[13px] font-medium text-slate-500 pb-1">/ {currentUsage.qrLimit} limit</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(qrPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#F3E8FF] to-[#E0E7FF] border border-[#E0E7FF] rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center justify-center">
          <Crown className="w-10 h-10 text-[#6366F1] mb-3" />
          <h3 className="text-[15px] font-bold text-[#6366F1] uppercase tracking-wide">Current Plan</h3>
          <span className="text-[28px] font-black text-slate-900 mt-1">{tier?.display_name || "Starter"}</span>
          <p className="text-[13px] text-slate-600 font-medium mt-1">
            {merchant?.subscription_status === 'active' 
              ? `Renews on ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Free forever'}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-[20px] font-bold text-slate-900">Upgrade Your Plan</h2>
        <p className="text-[14px] text-slate-500">Select the right plan as your business grows.</p>
      </div>

      {/* Pricing Tables */}
      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <div 
            key={t.name}
            className={`relative rounded-[24px] p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
              t.highlighted 
                ? "bg-slate-900 text-white shadow-xl ring-2 ring-indigo-500/50" 
                : "bg-white text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100"
            }`}
          >
            {t.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 rounded-full text-[10px] font-bold text-white tracking-widest uppercase shadow-sm">
                Most Popular
              </div>
            )}
            
            <h4 className={`text-[18px] font-bold mb-2 ${t.highlighted ? "text-white" : "text-slate-900"}`}>
              {t.name}
            </h4>
            <p className={`text-[13px] mb-6 ${t.highlighted ? "text-slate-300" : "text-slate-500"}`}>
              {t.description}
            </p>
            
            <div className="mb-6 flex items-baseline gap-1">
              <span className={`text-[32px] font-black tracking-tight ${t.highlighted ? "text-white" : "text-slate-900"}`}>
                {t.price}
              </span>
              {t.period && (
                <span className={`text-[13px] font-bold ${t.highlighted ? "text-slate-400" : "text-slate-400"}`}>
                  {t.period}
                </span>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {t.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className={`w-5 h-5 flex-shrink-0 ${t.highlighted ? "text-indigo-400" : "text-indigo-600"}`} />
                  <span className={`text-[13px] font-medium ${t.highlighted ? "text-slate-200" : "text-slate-600"}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button 
              className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-300 ${
                t.highlighted 
                  ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)]" 
                  : tier?.display_name?.toLowerCase() === t.name.toLowerCase()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tier?.display_name?.toLowerCase() === t.name.toLowerCase() ? "Current Plan" : t.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
