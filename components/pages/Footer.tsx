import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-background mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <p className="text-foreground">&copy; 2024 Reggie. All rights reserved.</p>
          <div className="flex space-x-4">
            <Link href="/terms" className="text-foreground hover:text-primary"> Contact Support </Link>
            <Link href="/privacy" className="text-foreground hover:text-primary"> Privacy Policy </Link>
            <Link href="/terms" className="text-foreground hover:text-primary"> Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}