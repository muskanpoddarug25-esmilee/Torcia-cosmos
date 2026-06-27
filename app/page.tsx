import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { OrbitalAnimation } from "@/components/landing/orbital-animation"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { Footer } from "@/components/landing/footer"
import { TrustBanner } from "@/components/landing/trust-banner"

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1">
        <Hero />
        <TrustBanner />
        <Features />
        <Pricing />
        <OrbitalAnimation />
      </div>
      <Footer />
    </main>
  )
}
