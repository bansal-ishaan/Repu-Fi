// src/app/components/AppHeader.jsx
'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { Sun, Moon, ShieldCheck, Github, LogOut, HelpCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { isConnected } = useAccount();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const AuthButton = () => {
    if (status === "loading") {
      return <div className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse w-28 h-10"></div>;
    }
    if (session) {
      return (
        <div className="flex items-center gap-2">
            {session.user.image && (
                <img src={session.user.image} alt="User" className="h-8 w-8 rounded-full" />
            )}
            <span className="text-sm font-medium hidden sm:inline">{session.user.name}</span>
            <button
                onClick={() => signOut()}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Sign Out"
            >
                <LogOut className="h-5 w-5 text-red-500" />
            </button>
        </div>
      );
    }
    return (
        <button
            onClick={() => signIn('github')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white rounded-md transition-colors"
        >
            <Github className="h-5 w-5"/>
            <span>Login</span>
        </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl sm:inline-block">RepuFi</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium flex-grow">
          <Link href="/become-backer" className="transition-colors hover:text-primary">Become a Backer</Link>
          {isConnected && <Link href="/my-vouches" className="transition-colors hover:text-primary">My Vouches</Link>}
          <Link href="/faq" className="transition-colors hover:text-primary"><HelpCircle size={16} className="inline mr-1"/>FAQ</Link>
          <Link href="/explore" className="transition-colors hover:text-primary">Explore Vouches</Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
          {mounted && <AuthButton />}
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
          {mounted && (
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}