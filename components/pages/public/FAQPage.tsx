"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQPage() {
  const faqs = [
    {
      question: "How long does it take to scan files?",
      answer: "About 1 minute per person record."
    },
    {
      question: "How long after we scan will we have access to the digitized records?",
      answer: "You will have access to the digitized records within 24 hours."
    },
    {
      question: "Is this application FERPA compliant?",
      answer: "Yes, we are in compliance with all FERPA regulations -- this application does not permanently store student records, only rosters."
    },
    {
      question: "My records are already digitized -- can I still use Reggie?",
      answer: "Yes, but you will have to work with Reggie to get your records organized in a way that Reggie can understand."
    },
    {
      question: "Can Reggie work with Microsoft 365?",
      answer: "Currently, Reggie is only compatible with Google Workspace and GSuite. You will need to create a school-managed Google account to use our services"
    }
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
      <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}