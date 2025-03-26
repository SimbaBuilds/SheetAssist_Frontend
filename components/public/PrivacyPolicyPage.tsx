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
            Our service integrates with third-party services Google Sheets and Microsoft Excel Online. 
            When you connect these services, their respective privacy policies also apply to your data.
          </p>
          <p className="text-muted-foreground mt-2">
            To offer you the best experience with our application, we request specific permissions from you to access these services. 
            We ask for the minimum permissions required to offer you the best experience with our application.
          </p>
          <p className="text-muted-foreground mt-2">
            Google Permissions:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
          <li>Google drive.file scope: This is a truly file specific scope that, upon file selection from the picker, gives us access to only your selected file and only for one hour.  You will be prompted to reselect the file once access is close to expiration.
            
          </li>
          </ul>

          <p className="text-muted-foreground mt-2">
              Microsoft Permissions:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
            <li> offline_access, email, User.Read, openid: These are basic permissions that are required to interact with the Microsoft API.
            </li>
            <li> Files.ReadWrite, ReadWrite.Selected: Unfortunately, incorporating only the Microsoft ReadWrite.Selected file specific scope introduces unnecessary friction to the user experience, so we must ask for the broader Read.Write scope.  However, we will not access, modify, or read files that you do not use within the app.  
            </li>
          </ul>
          <p className="text-muted-foreground mt-2">
          Note: Our application will not store, modfiy, or delete your files.  All actions performed on your spreadsheets are true append operations, meaning content can only be added on to existing sheets or to new sheets within the selected workbook — no modification or replacement of existing data can occur.  Furthermore, the AI lanugage models working in the background of this application do not have direct access to your spreadsheets, only to preprocessed versions of low level data (dataframes, strings, lists, etc.).
          </p>
          <p className="text-muted-foreground mt-8">
            If you have any questions about this Privacy Policy, please <Link href="/contact-us" className="underline hover:text-primary">contact us</Link>.
          </p>
        </section>
      </div>
    </div>
  )
} 