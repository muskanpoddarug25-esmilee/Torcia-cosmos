import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { TorciaAIFlow } from "@/components/landing/torcia-ai-flow"

export default function AIPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header />
      <div className="flex-1 pt-24">
        <TorciaAIFlow />
      </div>
      <Footer />
    </main>
  )
}
