"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, ChevronDown, MessageSquare, ShieldCheck, Zap, Video, Cloud, ShieldAlert, HelpCircle, Wallet, Megaphone } from "lucide-react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <nav className="mx-auto max-w-6xl bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.04)] px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-80 z-50 -ml-2"
            >
              <img src="/torcia-full.png" alt="Torcia" className="h-8 w-auto object-contain" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {/* Solutions Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm text-slate-600 font-medium transition-all hover:text-slate-900 py-2">
                  Solutions <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
                  <div className="w-64 bg-white/90 backdrop-blur-2xl rounded-2xl p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-black/5">
                    {[
                      { icon: MessageSquare, title: "Omnichannel Inbox", desc: "Manage all chats in one place", color: "text-blue-500", bg: "bg-blue-50", link: "/omnichannel-inbox" },
                      { icon: Wallet, title: "Automated Payments", desc: "Secure NepalPay checkout", color: "text-emerald-500", bg: "bg-emerald-50", link: "/automated-payment" },
                      { icon: Megaphone, title: "Broadcast Marketing", desc: "Send WhatsApp blasts", color: "text-purple-500", bg: "bg-purple-50", link: "/broadcast-marketing" },
                    ].map((item, i) => (
                      <Link key={i} href={item.link} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link href="/#features" className="text-sm text-slate-600 font-medium transition-all hover:text-slate-900">Features</Link>
              
              {/* Torcia AI (Styled like Astra) */}
              <Link href="/ai" className="flex items-center gap-1.5 transition-all hover:opacity-80">
                <img src="/torcia-icon.png" alt="Torcia AI" className="w-7 h-7 object-contain" />
                <span className="text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Torcia AI</span>
              </Link>

              <Link href="/#pricing" className="text-sm text-slate-600 font-medium transition-all hover:text-slate-900">Pricing</Link>
              
              {/* Help Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm text-slate-600 font-medium transition-all hover:text-slate-900 py-2">
                  Help <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
                  <div className="w-56 bg-white/90 backdrop-blur-2xl rounded-2xl p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-black/5">
                    {[
                      { icon: HelpCircle, title: "Help Center", link: "/help", color: "text-slate-500", bg: "bg-slate-100" },
                      { icon: Video, title: "Video Tutorials", link: "/help", color: "text-purple-500", bg: "bg-purple-100" },
                      { icon: Cloud, title: "API Docs", link: "/help", color: "text-blue-500", bg: "bg-blue-100" },
                      { icon: ShieldAlert, title: "Report Merchant", link: "/report-merchant", color: "text-rose-500", bg: "bg-rose-100" },
                    ].map((item, i) => (
                      <Link key={i} href={item.link} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-full transition-all duration-300 hover:bg-slate-800 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)]"
              >
                Try for Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 transition-all hover:text-slate-900 z-50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col gap-4 pb-4">
                <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base text-slate-600 font-medium px-2">Features</Link>
                <Link href="#torcia-ai" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent px-2">Torcia AI</Link>
                <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base text-slate-600 font-medium px-2">Pricing</Link>
                <Link href="/help" onClick={() => setMobileMenuOpen(false)} className="text-base text-slate-600 font-medium px-2">Help Center</Link>
                <div className="h-px bg-slate-100 my-2" />
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-base text-slate-600 font-medium px-2">Log in</Link>
                <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="flex justify-center w-full py-3 text-sm font-bold text-white bg-slate-900 rounded-xl">
                  Try for Free
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
