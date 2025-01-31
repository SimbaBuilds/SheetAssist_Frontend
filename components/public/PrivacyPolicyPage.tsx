import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="space-y-5">
      <section>
          <h2 className="text-lg font-semibold mb-3">1. Our Data Practices </h2>
          <p className="text-muted-foreground">
            We are committed to safeguarding your privacy and data:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
            <li>Our application employs industry-standard encryption, secure storage practices, and strict access controls to ensure user data is fully safeguarded.</li>
            <li>Our application retains data only for the duration required to provide the intended services.  All copies of user data created for processing are immediately deleted.</li>
            <li>Your data is not used by this application or shared with othersto develop, improve, or train AI/ML models:
              <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
                <li>Large language models do not have direct access to your data or files -- they only have access to pre-processed versions.</li>
              </ul>
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="text-muted-foreground mt-2">
            We use the collected information to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
            <li>Provide and maintain our services</li>
            <li>Process your requests and transactions</li>
            <li>Send you technical notices and support messages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Third-Party Services</h2>
          <p className="text-muted-foreground">
            Our service integrates with third-party services like Google Sheets and Microsoft Excel Online. 
            When you connect these services, their respective privacy policies also apply to your data.
          </p>
          <p className="text-muted-foreground mt-2">
            To offer you the best experience with our application, we request specific permissions from you to access these services. 
            Please accept all Google and/or Microsoft permissions to get the most out of this application. 
            See <Link href="/scopes-note" className="underline hover:text-primary">here</Link> for 
            a detailed note on drive permissions.  App verification pending.

          </p>
          <p className="text-muted-foreground mt-8">
            If you have any questions about this Privacy Policy, please <Link href="/contact-us" className="underline hover:text-primary">contact us</Link>.
          </p>
        </section>
      </div>
    </div>
  )
} 