import "@supabase/functions-js"
import { serve } from "std/http"
import { SMTPClient } from "denomailer"

interface WelcomeEmailPayload {
  email: string
  firstName: string
  userId: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Hello from Functions!")

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email, firstName } = await req.json() as WelcomeEmailPayload

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
        port: Number(Deno.env.get("SMTP_PORT")) || 465,
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER") || "",
          password: Deno.env.get("SMTP_PASSWORD") || "",
        }
      }
    });

    // Send email using SMTP
    try {
      await client.send({
        from: 'SheetAssist <cameron.hightower@aidocassist.com>',
        to: [email],
        subject: 'Welcome to SheetAssist! 🎉',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with Logo Placeholder -->
            <div style="text-align: center; margin-bottom: 30px;">
            </div>

            <!-- Greeting -->
            <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 18px;">Hello,</h1>
            <p style="color: #444444; line-height: 1.5; font-size: 18px;">
              Welcome to SheetAssist! Congratulations on being an early adopter of a potentially industry transforming technology. As an early adopter, you are crucially important to the development of SheetAssist - please let us know if you have any requests or desires and we will see what we can do! 😊</p>


            <!-- Quick Steps -->
            <h2 style="color: #1a1a1a; margin: 30px 0 15px;">Get Started</h2>
            <ol style="color: #444444; line-height: 1.6; font-size: 18px;">
              <li>Try a Spreadsheet Task: Connect your Google/Excel Sheet or upload a file - type something like "clean up this spreadsheet" or "sort by date"—watch the magic happen!</li>
              <li>Test Batch Processing: Upload a PDF or image into the app and see it convert to a spreadsheet in seconds.</li>
              <li>Visualize Your Data: Select your data and keep the "Surprise Me" option selected or say something like "make a bar chart"—customize it however you like.</li>
            </ol>

            <!-- CTA Link -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://aidocassist.com/dashboard" 
                 style="color:rgb(1, 9, 18); text-decoration: underline; font-size: 18px;">
                Get Started Now
              </a>
            </div>

            <!-- Help Section -->
            <div style="margin: 30px 0;">
              <h2 style="color: #1a1a1a; margin-bottom: 15px;">We're Here to Help</h2>
              <p style="color: #444444; line-height: 1.5; font-size: 18px;">
                Questions? Tips? Just reply to this email or check out our <a href="https://aidocassist.com/demos" style="color:rgba(0, 5, 11, 0.92); text-decoration: underline;">demos</a> page for tutorials and examples.<br><br>
                Welcome aboard!
              </p>
            </div>

            <!-- Signature -->
            <div style="margin: 40px 0; color: #444444; font-size: 18px;">
              Best,<br>
              Cameron Hightower<br>
              Builder, SheetAssist<br>
              cameron.hightower@aidocassist.com
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #eaeaea; padding-top: 20px; margin-top: 40px; 
                        text-align: center; color: #898989; font-size: 14px;">
              SheetAssist - Automate Spreadsheet Operations, Extract and Visualize Data<br>
              <a href="https://aidocassist.com/privacy" style="color:rgb(0, 4, 9); text-decoration: underline;">Privacy Policy</a>
            </div>
          </div>
        `,    
        text: `Welcome to SheetAssist - Let's Streamline Your Workflows!

Hi,

Welcome to SheetAssist! Congratulations on being an early adopter of a potentially industry transforming technology. As an early adopter, you are crucially important to the development of SheetAssist - please let us know if you have any requests or desires and we will see what we can do! 😊

GET STARTED
1. Try a Spreadsheet Task: Upload a file and type something like "create a pivot table" or "sort by date"—watch the magic happen!
2. Test Batch Processing: Upload a PDF or image into the app and see it convert to a spreadsheet instantly.
3. Visualize Your Data: Select your data and say "make a bar chart"—customize it however you like.

NEED MORE REQUESTS?
If you find yourself running out of requests, our Pro Plan ($25/month) gives you 200 requests, visualizations, and image inputs. Upgrade anytime or stick with free—no pressure!

WE'RE HERE TO HELP
Questions? Tips? Just reply to this email or check out our demos page (https://aidocassist.com/demos) for tutorials and examples.
Let's work smarter, not harder. Welcome aboard!

Best,
Cameron Hightower
Builder, SheetAssist
cameron.hightower@aidocassist.com

---
SheetAssist - Automate Spreadsheet Operations, Extract and Visualize Data
Privacy Policy: https://aidocassist.com/privacy`
      });

      await client.close();
    } catch (emailError) {
      console.error('SMTP Error:', emailError);
      throw emailError;
    }

    return new Response(
      JSON.stringify({ message: 'Welcome email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/* To invoke locally:
  deploy: 
  supabase functions deploy send-welcome-email --project-ref rquddzzbpbyzxtgeeczr
  
  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  
  2. Make an HTTP request:

curl -L -X POST 'https://db.aidocassist.com/functions/v1/send-welcome-email' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdWRkenpicGJ5enh0Z2VlY3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMTYwNDksImV4cCI6MjA0NTU5MjA0OX0.XeEuvbjz-_AzDHtQzZjcvc7f6fTLn5I_qonKgA3-nLg' -H 'Content-Type: application/json' --data '{"email": "cameron.hightower@aidocassist.com", "firstName": "Cameron", "userId": "test-user-id"}'

*/
