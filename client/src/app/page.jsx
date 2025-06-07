// app/page.jsx
'use client';
import  Link  from 'next/link';
import { ShieldCheck, Users, Handshake, TrendingUp, Github ,ArrowRight} from 'lucide-react';
import { Button } from './components/ui/Button'; 
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
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Powered by GitHub & PassetHub</h2>
              <p className="text-lg text-muted-foreground mb-6">
                RepuFi leverages your GitHub history to establish your developer reputation, creating a bridge between
                off-chain contributions and on-chain credibility.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <div className="mr-4 mt-1 bg-primary/10 p-1 rounded-full">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span>Analyze GitHub profiles to establish developer credibility</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 bg-primary/10 p-1 rounded-full">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span>Convert open-source contributions into on-chain reputation</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 bg-primary/10 p-1 rounded-full">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span>Secure and transparent reputation verification</span>
                </li>
              </ul>
              <Button >
                <Link href="/become-backer">Analyze Your GitHub Profile</Link>
              </Button>
            </div>
            <div className="bg-muted p-8 rounded-xl">
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <Github className="h-20 w-20 mx-auto mb-4 text-slate-700 dark:text-slate-300" />
                  <p className="font-medium">GitHub</p>
                </div>
                <div className="text-4xl font-light">+</div>
                <div className="text-center">
                  <div className="h-20 w-20 mx-auto mb-4 rounded-full overflow-hidden">
                    <img
                      src="https://avatars.githubusercontent.com/u/59930810?s=200&v=4"
                      alt="PassetHub/Polkadot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="font-medium">PassetHub</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
    </div>
  );
}