
export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      
      <div className="space-y-5">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing and using this website, you accept and agree to be bound by the terms and 
            provisions of the agreement below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground">
            We provide tools for automating spreadsheet operations and data visualization through 
            integration with Google Sheets and Microsoft Excel Online.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. User Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You agree to use the service in compliance with all applicable laws</li>
            <li>You will not use the service for any illegal or unauthorized purpose</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Service Limitations</h2>
          <p className="text-muted-foreground">
            We strive to provide uninterrupted service but do not guarantee the service will be 
            available at all times. We reserve the right to modify or discontinue the service 
            with or without notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Data Usage</h2>
          <p className="text-muted-foreground">
            We process your data as described in our Privacy Policy. You retain all rights to your data
            and are responsible for the content you process through our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify these terms at any time. Continued use of the service 
            after such modifications constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </div>
  )
} 