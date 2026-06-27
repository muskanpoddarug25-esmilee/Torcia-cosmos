"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"

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
    buttonText: "Start for Free",
    highlighted: false,
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
    buttonText: "Start 14-Day Free Trial",
    highlighted: true,
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
  },
]

export function Pricing() {
  const router = useRouter()

  return (
    <section id="pricing" className="py-24 relative bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-indigo-600 tracking-widest uppercase mb-3">Simple Pricing</h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Scale your business, not your overhead.
          </h3>
          <p className="text-lg text-slate-500 font-light">
            Start for free and upgrade when your sales start booming. Works for any industry.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                tier.highlighted 
                  ? "bg-slate-900 text-white shadow-2xl scale-105 z-10 ring-4 ring-indigo-500/30" 
                  : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-indigo-500 rounded-full text-xs font-bold text-white tracking-widest uppercase shadow-sm">
                  Most Popular
                </div>
              )}
              
              <h4 className={`text-xl font-bold mb-2 ${tier.highlighted ? "text-white" : "text-slate-900"}`}>
                {tier.name}
              </h4>
              <p className={`text-sm mb-6 ${tier.highlighted ? "text-slate-300" : "text-slate-500"}`}>
                {tier.description}
              </p>
              
              <div className="mb-8 flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold tracking-tight ${tier.highlighted ? "text-white" : "text-slate-900"}`}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span className={`text-sm font-medium ${tier.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                    {tier.period}
                  </span>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 ${tier.highlighted ? "text-indigo-400" : "text-indigo-600"}`} />
                    <span className={`text-sm ${tier.highlighted ? "text-slate-200" : "text-slate-600"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => router.push('/auth/signup')}
                className={`w-full py-3.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  tier.highlighted 
                    ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)]" 
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
