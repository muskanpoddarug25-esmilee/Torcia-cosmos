import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { OrbitalAnimation } from "@/components/landing/orbital-animation"
import { Wallet, LineChart, Receipt, Check, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AutomatedPaymentPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      
      <div className="flex-1 pt-32 pb-20">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 mb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-semibold mb-6">
              <Wallet className="w-4 h-4" /> Automated Payments
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-8">
              Turn conversations into <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">instant sales</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed mb-10">
              Process payments directly within WhatsApp and social conversations. Eliminate friction, stop switching between apps, and watch your conversion rates soar.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/signup" className="px-8 py-4 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl">
                Start selling today
              </Link>
            </div>
          </div>
        </div>



        {/* Value Prop / Dashboard Features */}
        <div className="max-w-6xl mx-auto px-6 mb-32">
          <div className="bg-[#f4f6f8] rounded-[3rem] p-12 lg:p-20 shadow-[inset_20px_20px_60px_#d1d5db,inset_-20px_-20px_60px_#ffffff] border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Payments routed directly into your account
                </h2>
                <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                  No more manual reconciliation or chasing customers for payment screenshots. Torcia automates the entire flow, from generating a unique payment link/QR to verifying the transaction.
                </p>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-emerald-500">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Full Order History</h4>
                      <p className="text-slate-600">Merchants can view the full order history and exact transaction details directly on the Orders tab in their dashboard.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-500">
                      <LineChart className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Sales Analytics</h4>
                      <p className="text-slate-600">View real-time analysis of the sales you've made. Track revenue, identify top-selling products, and monitor conversion rates effortlessly.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                  {/* Mockup Dashboard Header */}
                  <div className="h-12 border-b border-slate-100 bg-slate-50 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  {/* Mockup Dashboard Content */}
                  <div className="p-6 bg-white flex-1 flex flex-col gap-4">
                    <div className="h-8 w-1/3 bg-slate-100 rounded-lg"></div>
                    <div className="flex gap-4">
                      <div className="h-24 flex-1 bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                        <div className="h-4 w-1/2 bg-emerald-200 rounded mb-2"></div>
                        <div className="h-8 w-3/4 bg-emerald-300 rounded"></div>
                      </div>
                      <div className="h-24 flex-1 bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                        <div className="h-4 w-1/2 bg-indigo-200 rounded mb-2"></div>
                        <div className="h-8 w-3/4 bg-indigo-300 rounded"></div>
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 mt-2 p-4">
                       <div className="h-4 w-1/4 bg-slate-200 rounded mb-4"></div>
                       <div className="space-y-3">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-200">
                             <div className="flex gap-3 items-center">
                               <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                               <div className="w-24 h-3 bg-slate-200 rounded"></div>
                             </div>
                             <div className="w-16 h-3 bg-slate-200 rounded"></div>
                             <div className="w-20 h-6 bg-emerald-100 rounded-full"></div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Payment Verified</p>
                    <p className="text-xs text-slate-500">Order #4092 created</p>
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
