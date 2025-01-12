import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // Required for Gmail
    rejectUnauthorized: true,
    minVersion: "TLSv1.2"
  },
  debug: true, // Enable debug output
  logger: true  // Log information to console
})

export async function POST(request: Request) {
  try {
    // Verify SMTP connection configuration
    await transporter.verify()
    console.log('SMTP connection verified successfully')

    const body = await request.json()
    const { name, email, subject, message } = body

    const info = await transporter.sendMail({
      from: {
        name: "Contact Form",
        address: process.env.SMTP_USER as string
      },
      to: process.env.CONTACT_EMAIL,
      replyTo: email,
      subject: `SheetAssist Contact Form: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    })

    console.log('Message sent: %s', info.messageId)
    return NextResponse.json({ 
      success: true,
      messageId: info.messageId,
      response: info.response
    })

  } catch (error) {
    console.error('SMTP Error:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 