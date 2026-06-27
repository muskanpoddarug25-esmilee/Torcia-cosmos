import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { OrbitalAnimation } from "@/components/landing/orbital-animation"
import { MessageSquare, Users, Zap, Search, ShieldCheck, Check } from "lucide-react"
import Link from "next/link"

export default function OmnichannelInboxPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      
      <div className="flex-1 pt-32 pb-20">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 mb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-6">
              <MessageSquare className="w-4 h-4" /> Omnichannel Inbox
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-8">
              Manage all customer conversations in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">one place</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed mb-10">
              Simplify customer communication with Torcia's omnichannel inbox. Connect WhatsApp, Instagram, Facebook Messenger, TikTok, and more into a single, powerful workspace.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/signup" className="px-8 py-4 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl">
                Start your free trial
              </Link>
              <Link href="/#pricing" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-all">
                View Pricing
              </Link>
            </div>
          </div>
        </div>

        {/* Animation Section */}
        <div className="mb-32">
          <OrbitalAnimation />
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to talk to customers</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Bring your team and your channels together to provide lightning-fast support and close more sales.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Collaborate with your team",
                desc: "Assign conversations, leave internal notes, and work together seamlessly without switching apps.",
                color: "text-purple-600",
                bg: "bg-purple-50"
              },
              {
                icon: Zap,
                title: "Automate repetitive tasks",
                desc: "Use Torcia AI to instantly answer common questions and route complex issues to the right human agent.",
                color: "text-amber-600",
                bg: "bg-amber-50"
              },
              {
                icon: Search,
                title: "Full customer context",
                desc: "See a customer's entire order history and past conversations right next to the chat window.",
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

        {/* Statistics Section */}
        <div className="max-w-6xl mx-auto px-6 mb-16 mt-8">
          <div className="grid md:grid-cols-3 gap-12 text-left">
            <div>
              <h3 className="text-5xl font-bold text-indigo-500 mb-4 tracking-tight">150%</h3>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Faster response time</h4>
              <p className="text-slate-500 leading-relaxed">When you centralise channels and use workflow automations and AI.</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-purple-500 mb-4 tracking-tight">80%</h3>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Of FAQs instantly resolved</h4>
              <p className="text-slate-500 leading-relaxed">AI picks up FAQs and resolves them before they land in the inbox.</p>
            </div>
            <div>
              <h3 className="text-5xl font-bold text-blue-500 mb-4 tracking-tight">70%</h3>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Increase in lead generation</h4>
              <p className="text-slate-500 leading-relaxed">With all conversations centralised you'll never miss an opportunity.</p>
            </div>
          </div>
        </div>

        {/* Trust/Benefits Section */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-[3rem] p-12 lg:p-20 overflow-hidden relative shadow-2xl">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Stop losing customers to slow replies.
                </h2>
                <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                  In eCommerce, speed is everything. When you manage all your channels from a single inbox, no message slips through the cracks.
                </p>
                
                <div className="space-y-4">
                  {[
                    "Reply 3x faster with AI drafting",
                    "Never miss a WhatsApp or Instagram DM",
                    "Convert casual chats into instant sales",
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-blue-300" />
                      </div>
                      <span className="text-white font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  <Link href="/auth/signup" className="inline-block px-8 py-4 bg-white text-indigo-900 rounded-full font-bold hover:bg-blue-50 transition-colors">
                    Try Torcia Omnichannel
                  </Link>
                </div>
              </div>
              
              <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 to-transparent z-10 rounded-2xl"></div>
                <img 
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop" 
                  alt="Team collaborating" 
                  className="rounded-2xl shadow-2xl opacity-80"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
