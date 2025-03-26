"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
// import { useTheme } from "next-themes"
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function Header() {
  // const { setTheme, theme } = useTheme()
  const router = useRouter();
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSignUp = () => {
    router.push('/auth/signup');
  };

  const NavLinks = () => (
    <>
      {user ? (
        <>
          <Link href="/dashboard" className="text-foreground hover:text-primary">Dashboard</Link>
          <Link href="/user-account" className="text-foreground hover:text-primary">Account</Link>
          <Link href="/privacy-policy" className="text-foreground hover:text-primary">Privacy</Link>
          <Button onClick={handleLogout}>Logout</Button>
        </>
      ) : (
        <>
          <Link href="/examples" className="text-foreground hover:text-primary">Example Use</Link>
          <Link href="/privacy-policy" className="text-foreground hover:text-primary">Privacy</Link>
          <Link href="/auth/login">
            <Button variant="outline">Login</Button>
          </Link>
          <Button onClick={handleSignUp}>Try Free</Button>
        </>
      )}
    </>
  );

  return (
    <header className="bg-background shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          SheetAssist
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <NavLinks />
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col space-y-4 mt-6">
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
