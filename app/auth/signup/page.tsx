"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, Check } from "lucide-react"

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || password.length < 6) {
      setError(password.length < 6 ? "Password must be at least 6 characters" : "Please fill all fields")
      return
    }
    setLoading(true)
    setError("")

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push("/onboarding")
    router.refresh()
  }

  return (
    <div className="h-screen w-full flex relative bg-[#f4f6f8] overflow-hidden">
      {/* Background Blobs for Glassmorphism effect */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-200/50 rounded-full -translate-x-1/3 -translate-y-1/3 blur-[100px]"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-200/50 rounded-full translate-x-1/3 translate-y-1/3 blur-[100px]"></div>
      
      {/* Global Return Button */}
      <Link href="/" className="absolute top-6 left-6 lg:top-8 lg:left-8 z-50 flex items-center gap-2 text-sm font-medium transition-all px-4 py-2 rounded-full shadow-sm backdrop-blur-md text-slate-600 bg-white/70 border border-white/40 hover:bg-white hover:shadow-md">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      {/* Main Container */}
      <div className="w-full flex h-full z-10">
        
        {/* Left Panel - Brand */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 relative overflow-hidden">
          <div className="relative z-10 pl-12">
            <div className="flex items-center mb-12">
              <img src="/torcia-full.png" alt="Torcia" className="h-14 w-auto object-contain" />
            </div>
            
            <h1 className="text-5xl font-bold text-slate-800 leading-tight mb-6">
              Start selling<br/>in minutes,<br/>
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">not weeks.</span>
            </h1>
            
            <div className="mt-8 space-y-4">
              {[
                "Connect WhatsApp in one click",
                "AI handles customer queries 24/7",
                "Auto-generate payment QR codes",
                "Track orders from chat to delivery",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-500">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                  <span className="text-slate-600 font-medium text-[15px]">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md bg-[#f4f6f8] p-10 rounded-[2.5rem] shadow-[-20px_-20px_60px_#ffffff,20px_20px_60px_#d1d5db] border-2 border-white/60 relative z-20">
            <div className="flex flex-col items-center mb-10">
              <img src="/torcia-full.png" alt="Torcia" className="h-10 mx-auto object-contain lg:hidden mb-4" />
            </div>
            
            {/* Removed Step Indicator since there's only one step now */}

            <h2 className="text-2xl font-bold text-slate-800 mb-1">
              Create your account
            </h2>
            <p className="text-slate-500 text-[14px] mb-8">
              Start with your email and a secure password
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-700 mb-2">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      required
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

              <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#f4f6f8] border-2 border-white/60 text-slate-800 shadow-[-5px_-5px_15px_#ffffff,5px_5px_15px_#d1d5db] hover:shadow-[inset_-5px_-5px_15px_#ffffff,inset_5px_5px_15px_#d1d5db] active:shadow-[inset_-5px_-5px_15px_#ffffff,inset_5px_5px_15px_#d1d5db] transition-all font-bold text-[14px] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <ArrowRight className="w-4 h-4 text-indigo-500" />}
                {loading ? "Creating your account..." : "Continue to setup"}
              </button>
            </form>

            <p className="mt-8 text-center text-[13px] text-gray-500">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                Sign in
              </Link>
            </p>

            <p className="mt-4 text-center text-[11px] text-gray-400">
              Free forever on Starter plan · No credit card required
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
