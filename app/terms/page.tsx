import Link from "next/link"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-[24px] shadow-sm border border-slate-100">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-slate-500">Last Updated: June 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <p>
            Welcome to Torcia! These Terms of Service ("Terms") govern your use of the Torcia website (torcia.tech) and our AI-powered omnichannel inbox Services.
          </p>
          <p>
            By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, please do not use our Services.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Use of Services</h2>
          <p>
            Torcia provides an AI shopkeeper platform that integrates with Meta Platforms (WhatsApp, Messenger), TikTok, and other platforms to automate customer service and payments.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must be at least 18 years old and operate a valid business to use our Services.</li>
            <li>You agree to comply with all applicable laws and regulations, including Meta's Commerce Policies and WhatsApp Business Terms of Service.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Integration with Meta Platforms</h2>
          <p>
            Our Services utilize the WhatsApp Cloud API and Messenger API provided by Meta Platforms, Inc. By using our Services, you also agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Meta's Terms of Service and Privacy Policy.</li>
            <li>Ensure that you have obtained all necessary consents from your end-customers before messaging them via our platform.</li>
            <li>Not use the Services for spam, fraud, or sending unapproved promotional messages in violation of WhatsApp policies.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Payments and Subscriptions</h2>
          <p>
            Certain features of Torcia are provided on a paid subscription basis. By subscribing, you agree to pay all applicable fees. Subscriptions automatically renew unless canceled prior to the renewal date.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Torcia and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your access to or use of or inability to access or use the Services;</li>
            <li>Any conduct or content of any third party on the Services, including Meta API downtime or NepalPay service interruptions.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Termination</h2>
          <p>
            We may terminate or suspend your access to our Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms or violate Meta's Developer Policies.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">7. Contact Information</h2>
          <p>
            For any questions regarding these Terms, please contact us at support@torcia.tech.
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
