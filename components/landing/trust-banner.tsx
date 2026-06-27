export function TrustBanner() {
  const channels = [
    { name: "WhatsApp", url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" },
    { name: "Messenger", url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg" },
    { name: "Instagram", url: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" },
    { name: "TikTok", url: "https://www.vectorlogo.zone/logos/tiktok/tiktok-icon.svg" },
    { name: "Gmail", url: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" },
  ]

  // Double the array for seamless infinite scrolling
  const duplicatedChannels = [...channels, ...channels, ...channels, ...channels]

  return (
    <section className="py-12 border-t border-slate-100 bg-white overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">
        Connects with your customer's favorite channels
      </p>

      <div className="flex w-full overflow-hidden">
        <div className="flex items-center gap-16 min-w-max animate-[scroll_40s_linear_infinite]">
          {duplicatedChannels.map((channel, i) => (
            <div key={i} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
              <img src={channel.url} alt={channel.name} className="w-10 h-10 object-contain" />
              <span className="font-semibold text-slate-800 text-lg">{channel.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
