"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const MAX_LENGTH = 1000;

export default function ContactUsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      toast.success('Message sent successfully!')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof FormData
  ) => {
    const value = e.target.value.slice(0, MAX_LENGTH);
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Contact Us</h1>
      
      <div className="bg-background rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange(e, 'name')}
              required
              maxLength={MAX_LENGTH}
              placeholder=""
            />
            {/* <p className="text-xs text-muted-foreground mt-1">
              {formData.name.length}/{MAX_LENGTH}
            </p> */}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange(e, 'email')}
              required
              maxLength={MAX_LENGTH}
              placeholder=""
            />
            {/* <p className="text-xs text-muted-foreground mt-1">
              {formData.email.length}/{MAX_LENGTH}
            </p> */}
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              Subject
            </label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleChange(e, 'subject')}
              required
              maxLength={MAX_LENGTH}
              placeholder=""
            />
            {/* <p className="text-xs text-muted-foreground mt-1">
              {formData.subject.length}/{MAX_LENGTH}
            </p> */}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Message
            </label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange(e, 'message')}
              required
              maxLength={MAX_LENGTH}
              placeholder=""
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {formData.message.length}/{MAX_LENGTH}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </div>
    </div>
  )
} 