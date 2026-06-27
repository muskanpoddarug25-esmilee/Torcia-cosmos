import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Search, Video, Cloud, Users, ShieldAlert, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function HelpCenter() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header />
      
      <div className="flex-1 pt-32 pb-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium transition-all px-4 py-2 rounded-full shadow-sm backdrop-blur-md text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:shadow-md mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-8">
              How can we help you?
            </h1>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search for articles, tutorials, or guides..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 text-lg"
              />
            </div>
          </div>

          {/* Help Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Video,
                title: "Video tutorials",
                desc: "Discover a wide range of tutorials on all available features of Torcia.",
                action: "Watch now",
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                icon: Cloud,
                title: "API documentation",
                desc: "Unlock the full potential with our comprehensive developer resources.",
                action: "Read docs",
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                icon: Users,
                title: "Torcia Community",
                desc: "Connect with other merchants. Share tips, strategies, and feedback.",
                action: "Join community",
                iconColor: "text-indigo-600",
                iconBg: "bg-indigo-100"
              },
              {
                icon: ShieldAlert,
                title: "Report a Merchant",
                desc: "Faced an issue or scam? Report a Torcia merchant immediately.",
                action: "File report",
                iconColor: "text-rose-600",
                iconBg: "bg-rose-100",
                link: "/report-merchant"
              }
            ].map((card, i) => (
              <Link href={card.link || "#"} key={i} className="bg-white rounded-[2rem] p-8 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow flex flex-col h-full group cursor-pointer block">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
                  <div className={`p-2.5 rounded-xl ${card.iconBg} flex-shrink-0`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                
                <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
                  {card.desc}
                </p>
                
                <div className="bg-slate-50 rounded-full py-3 px-4 flex justify-between items-center group-hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-sm text-slate-700">{card.action}</span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Still Having Trouble Section */}
      <div className="max-w-4xl mx-auto px-4 w-full mb-32 relative z-10">
        <div className="bg-white rounded-[3rem] p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden border border-slate-100">

          <div className="relative z-10">
            <div className="w-12 h-12 mx-auto bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 11H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 11H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M15 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 15H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M15 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Still having trouble?
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
              Not finding the answer to your question? Get in touch with us, and we'll do our best to help you out!
            </p>
            <button className="px-8 py-3.5 bg-[#9353FF] hover:bg-[#8040F0] text-white font-semibold rounded-full transition-colors shadow-lg shadow-purple-500/20">
              Contact support
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
