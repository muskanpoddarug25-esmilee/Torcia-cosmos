import { MapPin, Mail, MessageCircle } from "lucide-react"

export function AboutContact() {
  return (
    <>
      {/* About Section */}
      <section id="about" className="py-24 relative overflow-hidden bg-white">
        <div className="mx-auto max-w-6xl px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-sm font-bold text-indigo-600 tracking-widest uppercase mb-3">About Torcia</h2>
              <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                Built in Nepal, for Nepal. 🇳🇵
              </h3>
              <p className="text-lg text-slate-600 font-light leading-relaxed mb-6">
                We noticed a massive problem: Nepali businesses are drowning in WhatsApp messages. You're spending 8 hours a day replying to "Price please?" and manually asking for eSewa screenshots.
              </p>
              <p className="text-lg text-slate-600 font-light leading-relaxed">
                Torcia was built to give every local business an automated, AI-powered shopkeeper. We want you to focus on sourcing great products and growing your brand, while our AI handles the repetitive chats and payments.
              </p>
            </div>
            <div className="relative">
              {/* Image Placeholder / Graphic */}
              <div className="aspect-square rounded-3xl bg-gradient-to-tr from-indigo-100 to-purple-50 p-8 shadow-sm ring-1 ring-slate-100 flex items-center justify-center">
                <div className="text-center flex flex-col items-center">
                  <div className="flex items-center justify-center mb-4">
                    <img src="/torcia-full.png" alt="Torcia" className="h-10 w-auto object-contain" />
                  </div>
                  <p className="text-slate-500 mt-2 font-light">Empowering Local Commerce</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 relative bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-3">Get in Touch</h2>
            <h3 className="text-4xl font-extrabold text-white tracking-tight mb-6">
              Let's talk about your business.
            </h3>
            <p className="text-lg text-slate-400 font-light">
              Have questions about enterprise plans or custom integrations? We're here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: MessageCircle, title: "WhatsApp Us", detail: "+977 9800000000", action: "Chat Now" },
              { icon: Mail, title: "Email Us", detail: "hello@torcia.com", action: "Send Email" },
              { icon: MapPin, title: "Visit Us", detail: "Kathmandu, Nepal", action: "Get Directions" },
            ].map((contact, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center transition-all hover:bg-white/10">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
                  <contact.icon className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">{contact.title}</h4>
                <p className="text-slate-400 text-sm mb-6">{contact.detail}</p>
                <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  {contact.action} &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
