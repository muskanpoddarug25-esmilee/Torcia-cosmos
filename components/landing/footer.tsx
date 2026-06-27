import Link from "next/link"
import { Facebook, Instagram, MessageCircle } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          <div className="col-span-1 sm:col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 -ml-2">
              <img src="/torcia-full.png" alt="Torcia" className="h-8 w-auto object-contain" />
            </Link>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Your AI Shopkeeper for Nepali Businesses. Automate WhatsApp, manage inventory, and accept NepalPay effortlessly.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/#features" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Pricing</Link></li>
              <li><Link href="/auth/signup" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Start Free Trial</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
            <ul className="space-y-3">
              <li><Link href="/help" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Help Center</Link></li>
              <li><Link href="/help" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Video Tutorials</Link></li>
              <li><Link href="/help" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">API Docs</Link></li>
              <li><Link href="/help" className="text-sm text-slate-500 hover:text-rose-600 transition-colors">Report Merchant</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Get in Touch</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5 object-contain" alt="WhatsApp" /> WhatsApp Us
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-5 h-5 object-contain" alt="Instagram" /> Instagram
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-5 h-5 object-contain" alt="Facebook" /> Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400 flex items-center gap-1.5 flex-wrap">
            © {new Date().getFullYear()} Torcia Inc. All rights reserved. Built in 🇳🇵
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg" alt="Nepal Flag" className="h-3.5 w-auto" />
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-sm text-slate-400 hover:text-slate-600">Privacy Policy</Link>
            <Link href="#" className="text-sm text-slate-400 hover:text-slate-600">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
