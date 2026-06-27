"use client"

import { Bot, User, QrCode, CheckCircle2, Clock, Zap, MessageSquare, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function TorciaAIFlow() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      // Start filling when the top of the timeline reaches the middle of the screen
      const topOffset = rect.top - (windowHeight * 0.6)
      const height = rect.height - 100 // adjust for padding
      const progress = Math.min(Math.max(-topOffset / height, 0), 1)
      setScrollProgress(progress)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const steps = [
    {
      icon: User,
      title: "Customer Asks a Question",
      desc: '"Dai, yo kura ko kati ho? KTM vitra delivery cha?" - Customers reach out on WhatsApp, Instagram, or Facebook 24/7. Torcia instantly intercepts the message without you having to lift a finger.',
      color: "bg-blue-50 text-blue-600",
      borderColor: "border-blue-200"
    },
    {
      icon: Bot,
      title: "Torcia AI Replies instantly",
      desc: '"Namaste! Yesko Rs. 1500 ho. KTM ma delivery free cha. Order garne ho?" - Our AI understands Romanized Nepali perfectly, maintains your brand tone, and acts as your personalized 24/7 sales agent. It answers FAQs and drives sales.',
      color: "bg-purple-50 text-purple-600",
      borderColor: "border-purple-200"
    },
    {
      icon: QrCode,
      title: "Auto-generates NepalPay QR",
      desc: "Once the customer confirms, Torcia automatically generates a dynamic NepalPay / FonePay QR code directly in the chat. No more manually taking screenshots of your QR code.",
      color: "bg-emerald-50 text-emerald-600",
      borderColor: "border-emerald-200"
    },
    {
      icon: CheckCircle2,
      title: "Payment Confirmed & Order Placed",
      desc: "Torcia detects the payment instantly, updates your inventory, and places the order on your dashboard. Everything happens seamlessly and automatically while you sleep.",
      color: "bg-amber-50 text-amber-600",
      borderColor: "border-amber-200"
    }
  ]

  const faqs = [
    { q: "Do I need technical knowledge to set this up?", a: "Not at all. You simply connect your social media accounts and upload your products. Torcia learns your catalog automatically and starts selling within minutes." },
    { q: "Can Torcia really speak Nepali properly?", a: "Yes, Torcia is specifically trained on colloquial Romanized Nepali (Nepanglish). It understands local context, slang, and pricing queries effortlessly." },
    { q: "How are the payments handled securely?", a: "Torcia dynamically generates secure NepalPay and FonePay QR codes. Payments are routed directly to your bank account with zero middleman holding your funds." },
  ]

  return (
    <section id="torcia-ai" className="py-24 relative overflow-hidden bg-white border-t border-slate-100">
      <div className="mx-auto max-w-5xl px-4 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full mb-4 ring-1 ring-indigo-100">
            <img src="/torcia-icon.png" className="w-4 h-4 object-contain" alt="AI Icon" />
            <span className="text-sm font-bold text-indigo-700 uppercase tracking-widest">Meet Torcia AI</span>
          </div>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Fluent in Nepanglish & Sales.
          </h3>
          <p className="text-lg text-slate-600 font-light mb-8">
            Torcia acts as your ultimate automated shopkeeper. It saves merchants an average of <span className="font-semibold text-slate-800">4-5 hours daily</span> by handling repetitive inquiries, managing stock, and collecting payments fully automatically.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span className="font-medium">24/7 Instant Replies</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Zero Manual Work</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">Nepanglish Support</span>
            </div>
          </div>
        </div>

        {/* Vertical Flow Diagram */}
        <div className="relative max-w-2xl mx-auto mt-16" ref={containerRef}>
          {/* Vertical Connecting line Base */}
          <div className="absolute left-8 md:left-1/2 top-8 bottom-8 w-1 bg-slate-100 rounded-full -translate-x-1/2" />
          
          {/* Vertical Connecting line Active (Scroll Driven) */}
          <div 
            className="absolute left-8 md:left-1/2 top-8 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500 rounded-full -translate-x-1/2 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out"
            style={{ height: `calc(${scrollProgress * 100}% - 4rem)` }}
          />

          <div className="space-y-12">
            {steps.map((step, i) => {
              const isActive = scrollProgress > (i * 0.25);
              return (
                <div key={i} className={`relative flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Content */}
                  <div className={`flex-1 w-full pl-20 md:pl-0 ${i % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 relative ${i % 2 === 0 ? 'md:mr-8' : 'md:ml-8'} ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-50'}`}>
                      <h4 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h4>
                      <p className="text-slate-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={`absolute left-0 md:left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-white border-4 border-white flex items-center justify-center z-10 transition-all duration-500 ${isActive ? 'scale-110 shadow-xl shadow-indigo-500/20' : 'scale-100 shadow-sm'}`}>
                    <div className={`w-full h-full rounded-xl ${isActive ? step.color : 'bg-slate-50 text-slate-400'} ${isActive ? step.borderColor : 'border-slate-200'} border flex items-center justify-center transition-colors duration-500`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                  </div>
                  
                  {/* Empty space for alternating layout on desktop */}
                  <div className="hidden md:block flex-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Premium FAQ Section */}
        <div className="max-w-3xl mx-auto mt-32 pt-16 border-t border-slate-100">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Frequently Asked Questions</h3>
            <p className="text-lg text-slate-500">Everything you need to know about Torcia AI.</p>
          </div>
          <div className="grid gap-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between font-semibold text-slate-900 outline-none">
                  {faq.q}
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors group-open:rotate-45">
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </summary>
                <div className="mt-4 text-slate-600 text-sm leading-relaxed pr-8 border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
