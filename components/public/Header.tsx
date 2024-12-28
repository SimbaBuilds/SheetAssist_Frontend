"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
// import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'

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

  return (
    <header className="bg-background shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          Sheet Assist
        </Link>
        <div className="flex items-center space-x-4">
          {/* <Link href="/about" className="text-foreground hover:text-primary">About</Link> */}
          {/* <Link href="/faq" className="text-foreground hover:text-primary">FAQ</Link> */}
          {user ? (
            <>
              <Link href="/dashboard" className="text-foreground hover:text-primary">Dashboard</Link>
              <Link href="/user-account" className="text-foreground hover:text-primary">Account</Link>
              <Button onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Link href="/demos" className="text-foreground hover:text-primary">Demos</Link>
              <Link href="/auth/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Button onClick={handleSignUp}>Sign Up</Button>
            </>
          )}
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button> */}
        </div>
      </nav>
    </header>
  );
}
