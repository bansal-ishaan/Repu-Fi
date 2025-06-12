// src/app/page.jsx
import Link from 'next/link';
import { Github, ShieldCheck, Rocket, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    // Use a container for the entire page content to manage spacing
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* ======================================================= */}
      {/* The Polished Hero Section                             */}
      {/* ======================================================= */}
      <section className="relative py-24 md:py-40 text-center">
        {/* The Glassmorphism Background Element */}
        <div 
          aria-hidden="true" 
          className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 blur-3xl"
        >
          <div 
            className="mx-auto aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary to-blue-500"
            style={{
              clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl">
          Turn Your Reputation
          <br />
          <span className="bg-gradient-to-br from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Into On-Chain Trust.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          RepuFi transforms your proven GitHub history into a verifiable asset, allowing you to back developers and build a new layer of trust for Web3.
        </p>

        {/* Call to Action Button */}
        <div className="mt-10 flex items-center justify-center">
          <Link href="/become-backer">
            <button className="btn btn-primary !text-lg !font-semibold !px-8 !py-3 transform transition-transform hover:scale-105 shadow-lg shadow-primary/20 hover:shadow-primary/30">
              Become a Backer
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* ======================================================= */}
      {/* Features & How-It-Works Sections (Kept as they were good) */}
      {/* ======================================================= */}
      <div className="space-y-24 md:space-y-32 py-16">
        {/* Features Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-8 text-center border-t-2 border-primary transition-transform hover:-translate-y-2">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4"><Github className="h-8 w-8 text-primary" /></div>
              <h3 className="text-xl font-bold mb-2">Analyze & Score</h3>
              <p className="text-muted-foreground">Login and let our system calculate your Developer Reputation Score (DRS) based on your public contributions.</p>
            </div>
            <div className="card p-8 text-center border-t-2 border-primary transition-transform hover:-translate-y-2">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4"><ShieldCheck className="h-8 w-8 text-primary" /></div>
              <h3 className="text-xl font-bold mb-2">Vouch & Stake</h3>
              <p className="text-muted-foreground">Use your high score to back developers you trust by staking collateral and minting a Vouch SBT on-chain.</p>
            </div>
            <div className="card p-8 text-center border-t-2 border-primary transition-transform hover:-translate-y-2">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4"><Rocket className="h-8 w-8 text-primary" /></div>
              <h3 className="text-xl font-bold mb-2">Empower & Grow</h3>
              <p className="text-muted-foreground">Help talented builders access opportunities and strengthen the ecosystem while building your on-chain credibility.</p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">A Simple, Powerful Flow</h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">Follow these steps to become an active participant in the RepuFi network.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0">
            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-primary bg-primary/10 text-primary font-bold text-2xl mb-4">1</div>
              <h3 className="font-semibold mb-1">Login & Connect</h3>
              <p className="text-sm text-muted-foreground">Connect your wallet and securely log in with your GitHub account.</p>
            </div>
            <div className="flex-grow w-full h-px md:h-auto md:w-auto border-t-2 md:border-l-2 border-dashed border-border mx-4 hidden md:block"></div>
            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-primary bg-primary/10 text-primary font-bold text-2xl mb-4">2</div>
              <h3 className="font-semibold mb-1">Get Your Score</h3>
              <p className="text-sm text-muted-foreground">Your profile is automatically analyzed to generate your reputation score.</p>
            </div>
            <div className="flex-grow w-full h-px md:h-auto md:w-auto border-t-2 md:border-l-2 border-dashed border-border mx-4 hidden md:block"></div>
            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-primary bg-primary/10 text-primary font-bold text-2xl mb-4">3</div>
              <h3 className="font-semibold mb-1">Create a Vouch</h3>
              <p className="text-sm text-muted-foreground">If eligible, stake PAS to vouch for others and mint an on-chain credential.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}