// app/(components)/AppHeader.jsx
'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { Sun, Moon, ShieldCheck, Users, Handshake } from 'lucide-react'; // Icons
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export default function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

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
          <Link href="/explore" className="transition-colors hover:text-primary">Explore Vouches</Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {mounted && (
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
        </div>
      </div>
    </header>
  );
}