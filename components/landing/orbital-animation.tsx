import Link from "next/link"

export function OrbitalAnimation() {
  const channels = [
    { name: "Gmail", x: 200, y: 150, color: "#EA4335", img: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" },
    { name: "Facebook", x: 120, y: 380, color: "#0084FF", img: "https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg" },
    { name: "Instagram", x: 250, y: 480, color: "#E1306C", img: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" },
    { name: "TikTok", x: 600, y: 150, color: "#000000", img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512' fill='%23000000'><path d='M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z'/></svg>" },
    { name: "WhatsApp", x: 650, y: 250, color: "#25D366", img: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" },
    { name: "VoIP", x: 550, y: 450, color: "#4F46E5", img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234F46E5'><path d='M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z'/></svg>" },
  ]

  // Generates an S-curve that starts horizontally from the center and ends horizontally at the node
  const generatePath = (x: number, y: number) => {
    const cx = 400;
    const cy = 300;
    const midX = cx + (x - cx) / 2;
    return `M ${cx} ${cy} C ${midX} ${cy}, ${midX} ${y}, ${x} ${y}`;
  }

  return (
    <section className="relative py-8 bg-white overflow-hidden border-t border-slate-100">
      <div className="mx-auto max-w-6xl px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-4">
          <h2 className="text-sm font-bold text-indigo-600 tracking-widest uppercase mb-3">Omnichannel Integration</h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Connect customer favourite channels
          </h3>
          <p className="text-lg text-slate-500 font-light mb-6">
            Your audience interacts with multiple channels throughout their journey. That's why businesses with seamless omnichannel customer journeys retain 89% of their customers.
          </p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
            Discover omnichannel inbox <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center ml-2">&rarr;</div>
          </Link>
        </div>

        {/* Container matches the SVG coordinate space 800x600 perfectly */}
        <div className="relative w-full max-w-[800px] mx-auto aspect-[4/3] flex items-center justify-center mt-2">
          
          {/* Background Concentric Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="absolute w-[30%] h-[30%] rounded-full border border-slate-200"></div>
            <div className="absolute w-[50%] h-[50%] rounded-full border border-slate-200"></div>
            <div className="absolute w-[70%] h-[70%] rounded-full border border-slate-200"></div>
            <div className="absolute w-[90%] h-[90%] rounded-full border border-slate-200"></div>
          </div>

          {/* SVG Canvas for Lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Faint base lines */}
            {channels.map((ch, i) => (
              <path key={`base-${i}`} d={generatePath(ch.x, ch.y)} stroke="#E2E8F0" strokeWidth="2" fill="none" />
            ))}

            {/* Single Glowing flowing lines */}
            {channels.map((ch, i) => (
              <path 
                key={`flow-${i}`}
                d={generatePath(ch.x, ch.y)} 
                stroke={ch.color} 
                strokeWidth="4" 
                fill="none" 
                filter="url(#glow)"
                strokeLinecap="round"
                pathLength="100"
                className="animate-flow-dash opacity-90"
                style={{
                  strokeDasharray: "100 100", // Full length line and gap
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: '3.5s'
                }}
              />
            ))}
          </svg>

          {/* Proper CSS for the single flow effect */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes flow-dash {
              0% {
                stroke-dashoffset: -100;
                opacity: 0;
              }
              5% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 100;
                opacity: 0;
              }
            }
            .animate-flow-dash {
              animation: flow-dash 3.5s infinite linear;
            }
          `}} />

          {/* Central Logo (Torcia) */}
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/30 via-amber-500/30 to-rose-500/30 rounded-full blur-2xl animate-pulse" />
            <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center relative z-10">
              <img src="/torcia-icon.png" alt="Torcia Center Logo" className="w-20 h-20 sm:w-28 sm:h-28 object-contain" />
            </div>
          </div>

          {/* Channel Nodes */}
          {channels.map((ch, i) => (
            <div 
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-3xl shadow-xl ring-1 ring-slate-100 flex items-center justify-center transition-transform duration-500 hover:scale-110 border-[6px] border-white"
              style={{
                top: `${(ch.y / 600) * 100}%`,
                left: `${(ch.x / 800) * 100}%`
              }}
            >
              <img src={ch.img} alt={ch.name} className="w-6 h-6 sm:w-10 sm:h-10 object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
