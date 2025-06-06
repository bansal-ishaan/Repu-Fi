// app/page.jsx
import { Link } from 'next/link';
import { ShieldCheck, Users, Handshake, TrendingUp, Github } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center py-12 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-xl shadow-inner">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          Repu<span className="text-primary">Fi</span>: <span className="block sm:inline">Decentralized Reputation</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8">
          Stake your credibility, empower new talent. An on-chain reputation lending market on PassetHub.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/become-backer" className="btn btn-primary !text-base !px-8 !py-3">
            Become a Backer
          </Link>
          <Link href="/explore" className="btn btn-outline !text-base !px-8 !py-3 border-primary text-primary hover:bg-primary/10">
            Explore Vouches
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8 text-center">
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <ShieldCheck className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Secure Staking</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Backers stake PAS tokens as collateral to vouch for borrowers' credibility.</p>
        </div>
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <Users className="h-12 w-12 mx-auto text-secondary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Build Reputation</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Borrowers gain access and build on-chain history with VouchSBTs.</p>
        </div>
        <div className="card p-6 hover:shadow-xl transition-shadow">
          <Handshake className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Trust Marketplace</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">A transparent market for lending and borrowing reputation.</p>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-bold mb-2">Powered by GitHub & PassetHub</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">Leveraging developer history and robust blockchain infrastructure.</p>
        <div className="flex justify-center items-center gap-6">
            <Github className="h-10 w-10 text-slate-700 dark:text-slate-300"/>
            <span className="text-2xl font-light">+</span>
            <img src="https://avatars.githubusercontent.com/u/59930810?s=200&v=4" alt="PassetHub/Polkadot" className="h-10 w-10 rounded-full" title="PassetHub (Polkadot Tech)"/>
        </div>
      </section>
    </div>
  );
}