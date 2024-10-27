import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">About Reggie</h1>
      <div className="max-w-3xl mx-auto">
        <p className="mb-6 text-lg">
          This application was designed by Cameron Higtower, a former school Registrar and IT professional with a software engineering background. The Reggie Assistant is a distillation of the AI tools and processes that Cameron used on the job made available to you.
        </p>
        <p className="mb-6 text-lg">
          Our mission is to streamline administrative workflows in educational institutions, saving time and resources while improving efficiency.
        </p>
        <div className="text-center mb-12">
          <Link href="/demos">
            <Button size="lg">See Reggie in Action</Button>
          </Link>
        </div>
        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
        <p className="mb-6">
          If you have any questions or would like to learn more about how Reggie can help your institution, please don't hesitate to get in touch.
        </p>
        <p className="mb-2">Email: info@reggie.edu</p>
        <p>Phone: (555) 123-4567</p>
      </div>
    </div>
  );
}