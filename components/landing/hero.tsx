"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, MessageSquare, ShoppingBag, BarChart3, Users, Zap, LayoutDashboard, Settings } from "lucide-react"

export function Hero() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    router.push(`/auth/signup?email=${encodeURIComponent(email)}`)
  }

  return (
    <section className="relative pt-40 pb-20 px-4 overflow-hidden bg-[#FAFAFA]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,_var(--tw-gradient-stops))] from-indigo-100/50 via-white to-white pointer-events-none" />
      
      <div className="relative mx-auto max-w-6xl">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-2xl border border-white/60 rounded-full shadow-sm ring-1 ring-black/5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              Built for Nepali Businesses 
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg" alt="Nepal Flag" className="h-3.5 w-auto" />
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-center text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] text-balance max-w-4xl mx-auto">
          Your AI Shopkeeper.
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient"> Automate Sales While You Sleep.</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-8 text-center text-lg sm:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto text-pretty font-light">
          Torcia unifies WhatsApp, Messenger, and Instagram. Let our AI answer customers in Nepanglish, manage inventory, and collect payments via NepalPay automatically.
        </p>

        {/* Email Capture Form */}
        <form onSubmit={handleSubmit} className="mt-12 max-w-md mx-auto relative z-20">
          <div className="relative flex items-center bg-white/80 backdrop-blur-2xl border border-white/50 rounded-full p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 focus-within:shadow-[0_20px_50px_-15px_rgba(79,70,229,0.2)] focus-within:ring-1 focus-within:ring-indigo-200">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-5 py-3 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-full transition-all duration-500 hover:bg-slate-800 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Get Started"
              )}
            </button>
          </div>
        </form>

        {/* Premium Dashboard Mockup */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-20 pointer-events-none" />
          
          <div className="relative rounded-[2rem] border border-slate-200/60 bg-white/40 backdrop-blur-3xl shadow-2xl overflow-hidden ring-1 ring-black/5 ring-offset-2 ring-offset-white">
            {/* Mac Window Header */}
            <div className="h-12 border-b border-slate-200/60 bg-white/60 flex items-center px-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-6 w-48 bg-slate-100 rounded-full border border-slate-200/60 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-slate-400">app.torcia.com</span>
                </div>
              </div>
            </div>

            {/* Dashboard Interface */}
            <div className="flex h-[500px]">
              {/* Sidebar */}
              <div className="w-64 border-r border-slate-200/60 bg-white/50 p-6 hidden md:block">
                <div className="flex items-center gap-2 mb-10">
                  <img src="/torcia-full.png" alt="Torcia" className="h-8 w-auto object-contain" />
                </div>
                <div className="space-y-2">
                  {[
                    { icon: LayoutDashboard, label: "Overview", active: true },
                    { icon: MessageSquare, label: "Inbox", badge: "3" },
                    { icon: ShoppingBag, label: "Orders" },
                    { icon: Users, label: "Customers" },
                    { icon: BarChart3, label: "Analytics" },
                    { icon: Zap, label: "Automations" },
                    { icon: Settings, label: "Settings" }
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${item.active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100/50'}`}>
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </div>
                      {item.badge && (
                        <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">{item.badge}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-[#FAFAFA]/50 p-8 overflow-hidden relative">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Good morning, Store Owner</h2>
                    <p className="text-slate-500 text-sm">Here's what's happening with your store today.</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white">
                    S
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  {[
                    { label: "Total Revenue", value: "Rs. 45,231", trend: "+12.5%" },
                    { label: "AI Handled Chats", value: "842", trend: "+24.1%" },
                    { label: "Active Orders", value: "56", trend: "+5.2%" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                      <p className="text-slate-500 text-sm font-medium mb-2">{stat.label}</p>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{stat.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-64">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900">Live AI Inbox</h3>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-medium text-slate-500">Torcia AI Active</span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">C</div>
                      <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3 max-w-md text-sm text-slate-700">
                        Dai yo black hoodie ko kati ho? delivery cha KTM vitra?
                      </div>
                    </div>
                    <div className="flex gap-4 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                         <img src="/torcia-icon.png" className="w-4 h-4 object-contain" />
                      </div>
                      <div className="bg-indigo-600 rounded-2xl rounded-tr-none p-3 max-w-md text-sm text-white shadow-md">
                        Namaste! Black hoodie ko Rs. 1500 ho. KTM ma delivery free cha. Order confirm garne ho ta?
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
