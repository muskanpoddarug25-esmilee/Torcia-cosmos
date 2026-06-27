"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"
import { Save, Loader2, Crown, Check, Sparkles, Zap, Building2 } from "lucide-react"

export default function SettingsPage() {
  const supabase = createClient()
  const { merchant, tier, refreshMerchant } = useMerchant()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tiers, setTiers] = useState<any[]>([])

  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.business_name || "")
      setEmail(merchant.email || "")
      setPhone(merchant.phone || "")
    }
    fetchTiers()
  }, [merchant])

  const fetchTiers = async () => {
    const { data } = await supabase.from("subscription_tiers").select("*").order("price_npr", { ascending: true })
    setTiers(data || [])
  }

  const handleSave = async () => {
    if (!merchant) return
    setSaving(true)
    await supabase.from("merchants").update({
      business_name: businessName,
      email,
      phone,
    }).eq("id", merchant.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    refreshMerchant()
  }

  const handleSelectTier = async (tierId: string) => {
    if (!merchant) return
    await supabase.from("merchants").update({ subscription_tier_id: tierId }).eq("id", merchant.id)
    refreshMerchant()
  }

  const tierIcon = (name: string) => {
    if (name === "starter") return <Zap className="w-5 h-5" />
    if (name === "plus") return <Sparkles className="w-5 h-5" />
    return <Crown className="w-5 h-5" />
  }

  const tierGradient = (name: string) => {
    if (name === "starter") return "from-gray-500 to-gray-600"
    if (name === "plus") return "from-indigo-500 to-violet-600"
    return "from-amber-500 to-orange-600"
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-[13px] text-gray-500 mt-1">Manage your business details and subscription</p>
      </div>

      {/* Business Details */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <h2 className="text-[15px] font-bold text-gray-900">Business Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-lg ${
                saved
                  ? "bg-emerald-500 text-white shadow-emerald-500/25"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25"
              } disabled:opacity-50`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "✓ Saved" : <><Save className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>
      </div>


    </div>
  )
}
