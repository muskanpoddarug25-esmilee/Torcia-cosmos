"use client"

import { useState, useEffect } from "react"
import { Bot, Sliders, MessageSquare, Send, Loader2, Sparkles, Save, Wand2, Globe, Eye, Store, MapPin, CreditCard, ListTodo, Clock, Package, RefreshCw, Tag, CheckSquare, Square } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

export default function TorciaAIPage() {
  const supabase = createClient()
  const { merchant, tier } = useMerchant()
  const [hours, setHours] = useState("")
  const [delivery, setDelivery] = useState("")
  const [payments, setPayments] = useState<string[]>([])
  const [extra, setExtra] = useState("")
  
  const [businessCategory, setBusinessCategory] = useState("")
  const [otherCategory, setOtherCategory] = useState("")
  const [deliveryTime, setDeliveryTime] = useState("")
  const [returnPolicy, setReturnPolicy] = useState("")
  const [codEnabled, setCodEnabled] = useState(false)
  const [days, setDays] = useState("")
  const [greeting, setGreeting] = useState("Namaste! 🙏 Welcome to our store. How can I help you today?")
  const [threshold, setThreshold] = useState(70)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [merchant])

  const fetchSettings = async () => {
    if (!merchant) return
    const { data: settings } = await supabase
      .from("merchant_settings")
      .select("*")
      .eq("merchant_id", merchant.id)
      .single()

    if (settings) {
      setSettingsId(settings.id)
      try {
        const parsed = JSON.parse(settings.ai_system_prompt || "{}")
        setHours(parsed.hours || "")
        setDelivery(parsed.delivery || "")
        setPayments(Array.isArray(parsed.payments) ? parsed.payments : (typeof parsed.payments === 'string' ? parsed.payments.split(',').map((s:string) => s.trim()).filter(Boolean) : []))
        setExtra(parsed.extra || "")
        
        const cat = parsed.businessCategory || ""
        const predefinedCategories = ["Clothing & Apparel", "Electronics & Tech", "Groceries & Food", "Beauty & Cosmetics", "Home & Furniture", "Other", ""]
        if (!predefinedCategories.includes(cat)) {
          setBusinessCategory("Other")
          setOtherCategory(cat)
        } else {
          setBusinessCategory(cat)
        }
        
        setDeliveryTime(parsed.deliveryTime || "")
        setReturnPolicy(parsed.returnPolicy || "")
        setCodEnabled(!!parsed.codEnabled)
        setDays(parsed.days || "")
      } catch(e) {
        setExtra(settings.ai_system_prompt || "")
      }
      setGreeting(settings.default_reply_message || greeting)
      setThreshold(Math.round((settings.ai_confidence_threshold || 0.7) * 100))
    }
  }

  const handleSave = async () => {
    if (!settingsId && !merchant) return
    setSaving(true)

    const promptStr = JSON.stringify({ 
      hours,
      days,
      delivery, 
      payments, 
      extra,
      businessCategory: businessCategory === 'Other' && otherCategory.trim() ? otherCategory.trim() : businessCategory,
      deliveryTime,
      returnPolicy,
      codEnabled
    })

    if (settingsId) {
      await supabase.from("merchant_settings").update({
        ai_system_prompt: promptStr,
        default_reply_message: greeting,
        ai_confidence_threshold: threshold / 100,
      }).eq("id", settingsId)
    } else if (merchant) {
      const { data } = await supabase.from("merchant_settings").insert({
        merchant_id: merchant.id,
        ai_system_prompt: promptStr,
        default_reply_message: greeting,
        ai_confidence_threshold: threshold / 100,
      }).select().single()
      if (data) setSettingsId(data.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <img src="/torcia-icon.png" alt="Torcia AI" className="w-8 h-8 object-contain" />
            Torcia AI
          </h1>
          <p className="text-[15px] text-slate-500 mt-1">Configure your AI assistant's personality, knowledge, and behavior</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-[16px] text-[14px] font-bold transition-all shadow-md ${
            saved
              ? "bg-emerald-500 text-white shadow-emerald-500/20"
              : "bg-[#6366F1] hover:bg-indigo-600 text-white shadow-indigo-500/20"
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "✓ Saved!" : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      <div className="w-full mt-8">
        <div className="space-y-6">
          {/* System Prompt Form */}
          <div className="rounded-[24px] bg-white border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[16px] bg-[#6366F1] flex items-center justify-center shadow-sm shadow-indigo-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-slate-900">AI Instructions</h2>
                  <p className="text-[13px] text-slate-500">Provide the details necessary for the AI to give perfect results</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><Tag className="w-4 h-4 text-[#6366F1]" /> Business Category</label>
                  <div className={`grid gap-3 transition-all ${businessCategory === 'Other' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all appearance-none"
                    >
                      <option value="">Select a category</option>
                      <option value="Clothing & Apparel">Clothing & Apparel</option>
                      <option value="Electronics & Tech">Electronics & Tech</option>
                      <option value="Groceries & Food">Groceries & Food</option>
                      <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                      <option value="Home & Furniture">Home & Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                    {businessCategory === 'Other' && (
                      <input
                        value={otherCategory}
                        onChange={(e) => setOtherCategory(e.target.value)}
                        placeholder="Specify category..."
                        className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all animate-in fade-in zoom-in-95"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><Clock className="w-4 h-4 text-[#6366F1]" /> Store Opening Hours & Days</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      placeholder="Days (e.g. Sun-Fri)"
                      className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all"
                    />
                    <input
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Hours (e.g. 10 AM to 8 PM)"
                      className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><MapPin className="w-4 h-4 text-[#6366F1]" /> Delivery Coverage</label>
                  <input
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                    placeholder="e.g. Inside Kathmandu Valley only"
                    className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><Package className="w-4 h-4 text-[#6366F1]" /> Standard Delivery Time</label>
                  <select
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all appearance-none"
                  >
                    <option value="">Select delivery time</option>
                    <option value="Same Day">Same Day</option>
                    <option value="1-2 Days">1-2 Days</option>
                    <option value="3-5 Days">3-5 Days</option>
                    <option value="1 Week">1 Week</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><CreditCard className="w-4 h-4 text-[#6366F1]" /> Accepted Payment Methods</label>
                  <div className="flex flex-wrap gap-2">
                    {["NepalPay QR", "eSewa", "Khalti", "Bank Transfer"].map(method => (
                      <button
                        key={method}
                        onClick={() => {
                          setPayments(prev => 
                            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
                          )
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                          payments.includes(method) 
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                            : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {payments.includes(method) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><RefreshCw className="w-4 h-4 text-[#6366F1]" /> Return & Exchange Policy</label>
                  <select
                    value={returnPolicy}
                    onChange={(e) => setReturnPolicy(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all appearance-none"
                  >
                    <option value="">Select policy</option>
                    <option value="No Returns">No Returns</option>
                    <option value="Exchange Only (3 Days)">Exchange Only (3 Days)</option>
                    <option value="7-Day Return">7-Day Return</option>
                    <option value="14-Day Return">14-Day Return</option>
                    <option value="30-Day Return">30-Day Return</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 p-4 rounded-[16px] bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
                  <div className="flex-1">
                    <span className="text-[14px] font-bold text-slate-900 block">Cash on Delivery (COD)</span>
                    <span className="text-[12px] text-slate-500">Allow customers to pay when they receive their order</span>
                  </div>
                  <div className={`relative w-12 h-6 rounded-full transition-colors ${codEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${codEnabled ? 'translate-x-6' : ''}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={codEnabled} 
                    onChange={(e) => setCodEnabled(e.target.checked)} 
                  />
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 mb-2"><ListTodo className="w-4 h-4 text-[#6366F1]" /> Other AI Instructions</label>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="w-full h-32 p-5 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-800 leading-relaxed focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                  placeholder="Tone of voice, special rules, language preferences..."
                />
              </div>
              <p className="text-[12px] text-slate-500 flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-indigo-500" /> The AI automatically accesses your Products catalog for pricing info
              </p>
            </div>
          </div>

          {/* Vision AI Info */}
          {tier?.vision_ai_enabled && (
            <div className="rounded-[24px] bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[16px] bg-amber-100 flex items-center justify-center shrink-0">
                  <Eye className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">Vision AI Enabled</h3>
                  <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                    Your Pro plan includes Vision AI (gemma-3n). The AI can analyze product screenshots sent by customers and match them to your catalog.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
