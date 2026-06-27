import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { ShieldAlert, Send } from "lucide-react"

export default function ReportMerchantPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header />
      
      <div className="flex-1 pt-32 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-6 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Report a Merchant
            </h1>
            <p className="text-slate-500 text-lg">
              If you experienced a scam, fraud, or inappropriate behavior from a Torcia merchant, please let us know. We take these reports seriously.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Your Email</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Merchant Name or Store Link</label>
                <input 
                  type="text" 
                  placeholder="e.g. StyleNepal or store link" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description of the Issue</label>
                <textarea 
                  rows={5}
                  placeholder="Please provide details about what happened..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all text-slate-900 placeholder:text-slate-400 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Proof / Screenshots URL (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Link to Google Drive or Image Host" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="button" 
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25"
                >
                  <Send className="w-5 h-5" /> Submit Report
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  )
}
