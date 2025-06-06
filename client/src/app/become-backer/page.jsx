// app/become-backer/page.jsx
'use client'; // This page now heavily relies on client-side state
import { useState } from 'react';
import { useAccount } from 'wagmi';
import GitHubAnalyzerClient from '../components/GitHubAnalyzerClient';
import CreateVouchForm from '../components/CreateVouchForm';
import { ShieldAlert, LockKeyhole } from 'lucide-react';

export default function BecomeBackerPage() {
  const { isConnected } = useAccount();
  const [githubAnalysisData, setGithubAnalysisData] = useState(null);

  const handleAnalysisComplete = (data) => {
    setGithubAnalysisData(data);
  };

  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <LockKeyhole className="h-12 w-12 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Connect Wallet to Proceed</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Please connect your wallet to analyze a GitHub profile and become a backer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Become a RepuFi Backer</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Analyze a GitHub profile to establish your credibility, then stake PAS to vouch for others.
        </p>
      </div>

      <GitHubAnalyzerClient onAnalysisComplete={handleAnalysisComplete} />

      {githubAnalysisData && githubAnalysisData.totalScore >= 7 && (
        <CreateVouchForm githubProfileData={githubAnalysisData} />
      )}

      {githubAnalysisData && githubAnalysisData.totalScore < 7 && (
        <div className="card p-6 text-center border-l-4 border-red-500 animate-fadeIn">
          <ShieldAlert className="h-10 w-10 mx-auto text-red-500 mb-3" />
          <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">GitHub Score Too Low</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            The analyzed GitHub profile score is {githubAnalysisData.totalScore.toFixed(1)}.
            A minimum score of 7 is required to create vouches.
          </p>
        </div>
      )}
    </div>
  );
}