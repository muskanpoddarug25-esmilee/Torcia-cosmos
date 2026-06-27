import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Megaphone, Target, BarChart3, MessageCircle, Check } from "lucide-react"
import Link from "next/link"

export default function BroadcastMessagingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      
      <div className="flex-1 pt-32 pb-20">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 mb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-sm font-semibold mb-6">
              <Megaphone className="w-4 h-4" /> Broadcast Messaging
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-8">
              Transform WhatsApp into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">revenue engine</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed mb-10">
              Run highly targeted broadcast campaigns and automate DM engagement. Reach your customers where they spend the most time and drive massive ROI.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/signup" className="px-8 py-4 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl">
                Start your first campaign
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-6 mb-32">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: "Bulk WhatsApp Messaging",
                desc: "Send promotions, updates, and alerts to thousands of opted-in customers instantly without getting blocked.",
                color: "text-purple-600",
                bg: "bg-purple-50"
              },
              {
                icon: Target,
                title: "Targeted Campaigns",
                desc: "Segment your audience based on past purchases, behavior, and demographics for hyper-personalized messaging.",
                color: "text-pink-600",
                bg: "bg-pink-50"
              },
              {
                icon: BarChart3,
                title: "Analytics & Tracking",
                desc: "Track open rates, click-through rates, and exact revenue generated from every broadcast campaign.",
                color: "text-blue-600",
                bg: "bg-blue-50"
              },
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.bg}`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Deep Dive Section */}
        <div className="max-w-6xl mx-auto px-6 mb-32">
          <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Outperform traditional email marketing by 10x
                </h2>
                <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                  With 98% open rates, WhatsApp is the most powerful marketing channel available today. Torcia makes it effortless to leverage this channel safely and effectively.
                </p>
                
                <div className="space-y-4">
                  {[
                    "Approved template management",
                    "Automated abandoned cart recovery",
                    "Interactive message buttons & lists",
                    "A/B testing for maximum conversion"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-slate-200 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-2xl">
                  {/* Mockup Chat Bubble */}
                  <div className="bg-[#0F172A] rounded-xl p-4 mb-4">
                    <p className="text-slate-400 text-xs mb-2 text-center">Today 10:42 AM</p>
                    <div className="bg-emerald-600 text-white p-4 rounded-xl rounded-tr-sm ml-8 shadow-sm">
                      <p className="font-bold mb-2">🎉 Flash Sale: 24 Hours Only!</p>
                      <p className="text-sm opacity-90 mb-3">Hi Sarah! As one of our top customers, get 30% off our entire summer collection before anyone else.</p>
                      <div className="bg-white/10 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-white/20 transition-colors">
                        <span className="font-semibold text-sm">Shop the Collection</span>
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Campaign Stats Mockup */}
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-700 pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">98%</p>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Open Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-400">42%</p>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Click Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-400">12x</p>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">ROAS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <Footer />
    </main>
  )
}
