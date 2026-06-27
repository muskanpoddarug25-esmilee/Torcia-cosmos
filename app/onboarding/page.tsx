"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Store, ArrowRight, Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("")
  const [phone, setPhone] = useState("")
  const [category, setCategory] = useState("physical")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: starterTier } = await supabase
        .from("subscription_tiers")
        .select("id")
        .eq("name", "starter")
        .single()

      const { error: insertError } = await supabase.from("merchants").insert({
        user_id: user.id,
        business_name: businessName,
        email: user.email,
        phone,
        country: "Nepal",
        currency: "NPR",
        store_category: category,
        subscription_tier_id: starterTier?.id,
        subscription_status: "active",
      })

      if (insertError) throw insertError

      const { data: merchants } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      const merchant = merchants?.[0]

      if (merchant) {
        await supabase.from("merchant_settings").insert({
          merchant_id: merchant.id,
          ai_system_prompt: `You are a friendly AI sales assistant for ${businessName}. Follow these rules:\n\n- Talk in Nepali-English mix (Nepanglish) matching how the customer talks\n- Keep messages SHORT (2-3 sentences). WhatsApp messages should be concise.\n- Be warm and friendly like a Nepali shopkeeper.\n- Only mention products from the catalog. Never invent products.\n- Quote prices in Rs. exactly as listed.\n- Use Namaste as greeting when appropriate.`,
        })
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to create store")
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="h-screen w-full flex items-center justify-center relative bg-[#f4f6f8] overflow-hidden">
      {/* Background Blobs for Glassmorphism effect */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-200/50 rounded-full -translate-x-1/3 -translate-y-1/3 blur-[100px]"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-200/50 rounded-full translate-x-1/3 translate-y-1/3 blur-[100px]"></div>
      
      <div className="w-full max-w-md bg-[#f4f6f8] p-10 rounded-[2.5rem] shadow-[-20px_-20px_60px_#ffffff,20px_20px_60px_#d1d5db] border-2 border-white/60 relative z-20">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 text-center">Set up your store</h2>
          <p className="text-slate-500 text-[14px] mt-2 text-center">
            You're logged in, but you haven't created a store profile yet. Let's get that sorted!
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateStore} className="space-y-5">
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-2">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. StyleNepal"
              required
              className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-2">Business Phone (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+977 98XXXXXXXX"
              className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-2">What are you selling?</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "physical", label: "Physical Goods", desc: "Clothes, Electronics" },
                { id: "digital", label: "Digital Goods", desc: "Gift Cards, Keys" },
                { id: "consultancy", label: "Consultancy", desc: "Services, Invoices" }
              ].map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => setCategory(opt.id)}
                  className={`cursor-pointer rounded-xl p-3 border-2 transition-all ${
                    category === opt.id 
                      ? "border-indigo-500 bg-indigo-50/50" 
                      : "border-gray-200 bg-white/80 hover:border-indigo-200"
                  }`}
                >
                  <div className={`text-[12px] font-bold ${category === opt.id ? "text-indigo-700" : "text-gray-700"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !businessName.trim()}
            className="w-full py-3.5 mt-2 rounded-xl bg-[#f4f6f8] border-2 border-white/60 text-slate-800 shadow-[-5px_-5px_15px_#ffffff,5px_5px_15px_#d1d5db] hover:shadow-[inset_-5px_-5px_15px_#ffffff,inset_5px_5px_15px_#d1d5db] active:shadow-[inset_-5px_-5px_15px_#ffffff,inset_5px_5px_15px_#d1d5db] transition-all font-bold text-[14px] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <ArrowRight className="w-4 h-4 text-indigo-500" />}
            {loading ? "Creating store..." : "Create my store"}
          </button>
        </form>

        <button 
          onClick={handleLogout}
          className="w-full mt-6 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
