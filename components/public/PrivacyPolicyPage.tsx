import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="space-y-5">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground">
            We collect information you provide directly to us when using our services, including:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
            <li>Account information (name, email, password)</li>
            <li>Integration data from connected services (Google Sheets, Microsoft Excel)</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="text-muted-foreground">
            We use the collected information to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
            <li>Provide and maintain our services</li>
            <li>Process your requests and transactions</li>
            <li>Send you technical notices and support messages</li>
            <li>Improve and optimize our services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Data Security</h2>
          <p className="text-muted-foreground">
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the Internet is 100% secure, and we cannot 
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Third-Party Services</h2>
          <p className="text-muted-foreground">
            Our service integrates with third-party services like Google Sheets and Microsoft Excel. 
            When you connect these services, their respective privacy policies also apply to your data.
          </p>
          <p className="text-muted-foreground mt-2">
            For optimal functionality, we request specific permissions from these services. 
            Please accept all permissions to get the most out of this application. 
            See <Link href="/scopes-note" className="underline hover:text-primary">here</Link> for 
            a detailed note on drive permissions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy, please <Link href="/contact-us" className="underline hover:text-primary">contact us</Link>.
          </p>
        </section>
      </div>
    </div>
  )
} 