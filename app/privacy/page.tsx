import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-[24px] shadow-sm border border-slate-100">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-slate-500">Last Updated: June 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <p>
            Welcome to Torcia ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy governs the privacy policies and practices of our website (torcia.tech) and our AI shopkeeper platform, including integrations with Meta Platforms (WhatsApp, Messenger), TikTok, and Google.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Information We Collect</h2>
          <p>
            We collect information that you voluntarily provide to us when you register on the Services or communicate with our bots. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Merchant Information:</strong> Name, email address, business details, encrypted payment credentials (e.g., NepalPay), and Meta App IDs.</li>
            <li><strong>Customer Information via Meta/WhatsApp APIs:</strong> When customers interact with our AI agents via WhatsApp or Messenger, we receive their phone numbers, display names, and message content to facilitate conversations and process orders.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect or receive:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To facilitate account creation and logon process.</li>
            <li>To power the AI chatbot interactions (messages may be processed by trusted third-party AI providers like OpenAI or NVIDIA NIM).</li>
            <li>To process and verify payments (e.g., generating NepalPay QR codes).</li>
            <li>To comply with Meta Platforms, Inc. Developer Policies.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Data Sharing and Third Parties</h2>
          <p>
            We only share information with the following third parties:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Meta Platforms, Inc:</strong> To send and receive messages via WhatsApp and Messenger Cloud APIs.</li>
            <li><strong>AI Providers:</strong> Anonymized chat content is sent to AI endpoints to generate contextual responses.</li>
            <li><strong>Payment Gateways:</strong> Necessary data is securely sent to NepalPay to verify transactions.</li>
          </ul>
          <p>We do NOT sell, rent, or trade your personal information to third parties.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Data Deletion Instructions (Mandatory for Meta)</h2>
          <p>
            In accordance with Meta's Platform Terms, users have the right to request the deletion of their data. 
          </p>
          <p>
            <strong>For Merchants:</strong> You may delete your account and all associated data at any time from your Dashboard settings or by emailing support@torcia.tech.
          </p>
          <p>
            <strong>For End-Customers:</strong> If you have interacted with a Torcia AI bot via WhatsApp or Messenger and wish to have your chat history deleted, please send an email to support@torcia.tech with your phone number, or request deletion directly in the chat by typing "Delete my data".
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Data Security</h2>
          <p>
            We implement industry-standard security measures, including AES-256 encryption for payment credentials and secure HTTPS connections for all API webhooks, to protect your data.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have questions or comments about this policy, you may email us at support@torcia.tech.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-indigo-600 font-bold hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
