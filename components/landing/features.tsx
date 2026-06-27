import { Bot, QrCode, Shirt, ShieldCheck, Megaphone, Users } from "lucide-react"

const features = [
  {
    title: "Nepanglish AI Agent",
    description: "Our AI understands English, Nepali, and Romanized Nepali (Nepanglish). It chats naturally, answers FAQs, and never sleeps.",
    icon: Bot,
    color: "from-blue-500 to-indigo-500",
  },
  {
    title: "Direct NepalPay Checkout",
    description: "Stop asking for screenshots manually. Torcia generates dynamic NepalPay & FonePay QR codes directly inside WhatsApp.",
    icon: QrCode,
    color: "from-emerald-400 to-teal-500",
  },
  {
    title: "Fashion Inventory Ready",
    description: "Manage colors, sizes, and stock easily. The AI checks your inventory in real-time before confirming any orders.",
    icon: Shirt,
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Human Handoff",
    description: "AI handles the repetitive greetings. If a customer has a complex request, the AI pauses and alerts you to take over.",
    icon: Users,
    color: "from-amber-400 to-orange-500",
  },
  {
    title: "Broadcast Marketing",
    description: "Send WhatsApp blasts for your new Dashain collection directly to thousands of past customers with one click.",
    icon: Megaphone,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Enterprise Grade Security",
    description: "Your data and banking credentials are encrypted. We act as the software, keeping you in full control of your business.",
    icon: ShieldCheck,
    color: "from-slate-600 to-slate-800",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden bg-white">
      <div className="mx-auto max-w-6xl px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-indigo-600 tracking-widest uppercase mb-3">Powering Local Commerce</h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Everything you need to scale your store on WhatsApp.
          </h3>
          <p className="text-lg text-slate-500 font-light">
            We've built the perfect toolkit for Nepali businesses to automate sales and eliminate manual admin work.
          </p>
        </div>

        {/* Bento Box Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="group relative bg-slate-50 rounded-3xl p-8 transition-all duration-500 hover:bg-white hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-slate-100 overflow-hidden"
            >
              {/* Subtle gradient hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none from-indigo-500 to-purple-500" />
              
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-sm transform group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              
              <h4 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
