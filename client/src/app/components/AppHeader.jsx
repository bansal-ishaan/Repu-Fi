// app/(components)/AppHeader.jsx
'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { Sun, Moon, ShieldCheck, Github, LogOut, HelpCircle, Handshake, Users, UserPlus, ShieldQuestion, UserCog, BarChart3, Info, Loader2 } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react'; // Removed useCallback, it's in context now
import { useAccount, useReadContract } from 'wagmi';
// Assuming lib is at root, and constants.js is now config.js
// Correct the import paths if your `lib` folder is elsewhere or you are not using `@` alias
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
// import { getGitHubData, storeGitHubData, clearGitHubData } from '@/lib/localStorageHelper'; // No longer needed directly here, context handles it
import { useGitHubScore } from '../context/GitHubScoreContext'; // Adjust path if context is elsewhere

// Simple Tooltip Component (can be moved to ui/Tooltip.jsx)
const Tooltip = ({ content, children, position = "bottom" }) => {
  const [show, setShow] = useState(false);
  let positionClasses = "bottom-full left-1/2 -translate-x-1/2 mb-2";
  if (position === "top") positionClasses = "top-full left-1/2 -translate-x-1/2 mt-2";

  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
    >
      {children}
      {show && content && (
        <div
          className={`absolute ${positionClasses} w-max max-w-xs p-2 text-xs text-white bg-slate-800 dark:bg-slate-900 rounded-md shadow-lg z-[100] pointer-events-none opacity-95 animate-fadeIn`}
        >
          {content}
        </div>
      )}
    </div>
  );
};


export default function AppHeader() {
  // Get score data and functions from the context
  const { scoreData, isFetchingScore, fetchScoreError, refreshScore, clearScore } = useGitHubScore();

  const { theme, setTheme } = useTheme();
  const { address: connectedAddress, isConnected: isWalletConnected } = useAccount();
  const { data: session, status: sessionStatus } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The useEffects for fetching and setting score are now handled within GitHubScoreContext.jsx

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const AuthButton = () => {
    if (sessionStatus === "loading") {
      return <div className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse w-28 h-9"></div>;
    }
    if (session) {
      return (
        <div className="flex items-center gap-2">
            {session.user.image && (
                <img src={session.user.image} alt="User" className="h-8 w-8 rounded-full border border-border" />
            )}
            <span className="text-sm font-medium hidden sm:inline">{session.user.name || session.user.githubUsername}</span>
            <Tooltip content="Sign Out">
              <button
                  onClick={() => {
                    signOut(); // NextAuth signout
                    clearScore(); // Clear GitHub score from context & localStorage
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                  <LogOut className="h-5 w-5 text-red-500" />
              </button>
            </Tooltip>
        </div>
      );
    }
    return (
        <button
            onClick={() => signIn('github')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-md transition-colors"
        >
            <Github className="h-5 w-5"/>
            <span>Login</span>
        </button>
    );
  };

  const GitHubScoreDisplay = () => {
    if (isFetchingScore) { // Use from context
      return <div className="flex items-center text-xs text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin mr-1" /> Score...</div>;
    }
    if (fetchScoreError) { // Use from context
      return (
        <Tooltip content={`Error: ${fetchScoreError}. Click to retry.`}>
          <button
            onClick={() => refreshScore()} // Use refreshScore from context
            className="flex items-center text-xs text-red-500 dark:text-red-400"
          >
            <Info className="h-4 w-4 mr-1" /> Score Error
          </button>
        </Tooltip>
      );
    }
    // Use scoreData from context
    if (sessionStatus === 'authenticated' && scoreData && scoreData.totalScore !== undefined) {
      const scoreBreakdownContent = (
        <div className="space-y-1 text-left">
          <p className="font-semibold text-center mb-1 border-b border-slate-600 pb-1">Score Details ({scoreData.username})</p>
          {scoreData.breakdown && Object.entries(scoreData.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="font-semibold">{value?.toFixed ? value.toFixed(1) : value}/10</span>
            </div>
          ))}
          {/* Link to a page that might show more details or allow re-analysis */}
          <p className="text-center text-primary hover:underline pt-1 mt-1 border-t border-slate-600">
            <Link href="/become-backer">Full Analysis / Re-Analyze</Link>
          </p>
        </div>
      );
      return (
        <Tooltip content={scoreBreakdownContent} position="bottom">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold cursor-pointer hover:bg-primary/20 dark:hover:bg-primary/30">
            <BarChart3 className="h-4 w-4" />
            <span>Score: {scoreData.totalScore.toFixed(1)}</span>
          </div>
        </Tooltip>
      );
    }
    return null;
  };


  const { data: contractOwner } = useReadContract({
   address: REPUFI_SBT_CONTRACT_ADDRESS,
   abi: REPUFI_SBT_ABI,
   functionName: 'owner',
   enabled: isWalletConnected // wagmi v2 syntax for query options
 });
 const isAdmin = isWalletConnected && connectedAddress && contractOwner && connectedAddress.toLowerCase() === contractOwner.toLowerCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl sm:inline-block">RepuFi</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-sm font-medium flex-grow">
          <Link href="/explore" className="transition-colors hover:text-primary flex items-center gap-1"><Handshake size={16}/>Explore</Link>
          <Link href="/become-backer" className="transition-colors hover:text-primary flex items-center gap-1"><Users size={16}/>Become Backer</Link>
          <Link href="/request-reputation" className="transition-colors hover:text-primary flex items-center gap-1"><UserPlus size={16}/>Request Vouch</Link>
          {isWalletConnected && <Link href="/my-vouches" className="transition-colors hover:text-primary">My Vouches</Link>}
          <Link href="/challenge-vouch" className="transition-colors hover:text-primary flex items-center gap-1"><ShieldQuestion size={16}/>Challenge</Link>
         {isAdmin && <Link href="/admin/challenges" className="transition-colors hover:text-orange-500 flex items-center gap-1"><UserCog size={16}/>Admin</Link>}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-3">
          {mounted && <AuthButton />}
          {/* Display score if user is authenticated with GitHub and score data is available */}
          {mounted && sessionStatus === 'authenticated' && scoreData && <GitHubScoreDisplay />}
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
          {mounted && (
            <button onClick={toggleTheme} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}