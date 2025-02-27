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
              [Insert Logo]
            </div>

            <!-- Greeting -->
            <h1 style="color: #1a1a1a; margin-bottom: 20px;">Hi ${firstName},</h1>
            
            <p style="color: #444444; line-height: 1.5;">
              Welcome to SheetAssist! We're thrilled you're here to unlock the power of AI for your spreadsheets, 
              documents, and data visualizations. Whether you're crunching numbers, entering data, or creating 
              stunning charts, we've got you covered—all with simple, intuitive commands.
            </p>

            <!-- Free Plan Features -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h2 style="color: #1a1a1a; margin-bottom: 15px;">Your Free Plan at a Glance</h2>
              <p style="color: #444444;">With your free account, you get:</p>
              <ul style="color: #444444; line-height: 1.6;">
                <li>10 Standard Requests: Merge, sort, filter, or analyze spreadsheets with natural language.</li>
                <li>30 Input Images: Turn PDFs or scans into editable data in minutes.</li>
                <li>10 Visualizations: Transform your data into beautiful charts, no design skills needed.</li>
              </ul>
            </div>

            <!-- Quick Steps -->
            <h2 style="color: #1a1a1a; margin: 30px 0 15px;">Three Quick Steps to Success</h2>
            <ol style="color: #444444; line-height: 1.6;">
              <li>Try a Spreadsheet Task: Upload a file and type something like "create a pivot table" or "sort by date"—watch the magic happen!</li>
              <li>Test Batch Processing: Upload a PDF or image into the app and see it convert to a spreadsheet instantly.</li>
              <li>Visualize Your Data: Select your data and say "make a bar chart"—customize it however you like.</li>
            </ol>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://aidocassist.com/dashboard" 
                 style="background-color: #0070f3; color: white; padding: 12px 24px; 
                        border-radius: 5px; text-decoration: none; font-weight: bold;">
                Get Started Now
              </a>
            </div>

            <!-- Pro Plan -->
            <div style="margin: 30px 0;">
              <h2 style="color: #1a1a1a; margin-bottom: 15px;">Need More Power?</h2>
              <p style="color: #444444; line-height: 1.5;">
                If you find yourself running out of requests, our Pro Plan ($25/month) gives you 200 requests, 
                visualizations, and image inputs. Upgrade anytime or stick with free—no pressure!
              </p>
            </div>

            <!-- Help Section -->
            <div style="margin: 30px 0;">
              <h2 style="color: #1a1a1a; margin-bottom: 15px;">We're Here to Help</h2>
              <p style="color: #444444; line-height: 1.5;">
                Questions? Tips? Just reply to this email or check out our demos page for tutorials and examples.<br><br>
                Let's make work smarter, not harder. Welcome aboard!
              </p>
            </div>

            <!-- Signature -->
            <div style="margin: 40px 0; color: #444444;">
              Best,<br>
              Cameron Hightower<br>
              Founder, SheetAssist<br>
              cameron.hightower@aidocassist.com
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #eaeaea; padding-top: 20px; margin-top: 40px; 
                        text-align: center; color: #898989; font-size: 14px;">
              SheetAssist – Automate Spreadsheet Operations, Extract Data, Visualize Insights<br>
              <a href="https://aidocassist.com/privacy" style="color: #0070f3; text-decoration: underline;">Privacy Policy</a>
            </div>
          </div>
        `,
        text: `Welcome to SheetAssist – Let's Streamline Your Workflows!

Hi,

Welcome to SheetAssist! We're thrilled you're here to unlock the power of AI for your spreadsheets, documents, and data visualizations. Whether you're crunching numbers, entering data, or creating stunning charts, we've got you covered—all with simple, intuitive commands.

YOUR FREE PLAN AT A GLANCE
With your free account, you get:
• 10 Standard Requests: Merge, sort, filter, or analyze spreadsheets with natural language.
• 30 Input Images: Turn PDFs or scans into editable data in minutes.
• 10 Visualizations: Transform your data into beautiful charts, no design skills needed.

THREE QUICK STEPS TO SUCCESS
1. Try a Spreadsheet Task: Upload a file and type something like "create a pivot table" or "sort by date"—watch the magic happen!
2. Test Batch Processing: Upload a PDF or image into the app and see it convert to a spreadsheet instantly.
3. Visualize Your Data: Select your data and say "make a bar chart"—customize it however you like.

NEED MORE REQUESTS?
If you find yourself running out of requests, our Pro Plan ($25/month) gives you 200 requests, visualizations, and image inputs. Upgrade anytime or stick with free—no pressure!

WE'RE HERE TO HELP
Questions? Tips? Just reply to this email or check out our demos page for tutorials and examples.
Let's make work smarter, not harder. Welcome aboard!

Best,
Cameron Hightower
Founder, SheetAssist
cameron.hightower@aidocassist.com

---
SheetAssist – Automate Spreadsheet Operations, Extract Data, Visualize Insights
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

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-welcome-email' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
