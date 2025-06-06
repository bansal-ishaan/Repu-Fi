// app/(components)/GitHubAnalyzerClient.jsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/Button'; // Simple Button component (see below)
import { Input } from './ui/Input';   // Simple Input component (see below)
import { Loader2, Github, Star, GitFork, Users, CalendarDays, CodeXml, Award, CheckCircle2, XCircle } from 'lucide-react';

// Helper function to create a Progress bar
const ProgressBar = ({ value, className = "" }) => (
  <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 ${className}`}>
    <div
      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    ></div>
  </div>
);

export default function GitHubAnalyzerClient({ onAnalysisComplete }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState("");

  const analyzeProfile = async () => {
    if (!username.trim()) {
      setError("Please enter a GitHub username.");
      return;
    }
    setLoading(true);
    setError("");
    setScoreData(null);

    try {
      const response = await fetch("/api/github-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze profile.");
      }
      setScoreData(data);
      if (onAnalysisComplete) {
        onAnalysisComplete(data); // Pass data to parent
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColorClass = (scoreVal) => {
    if (scoreVal >= 8) return "text-green-500 dark:text-green-400";
    if (scoreVal >= 6) return "text-yellow-500 dark:text-yellow-400";
    return "text-red-500 dark:text-red-400";
  };

  const ScoreItem = ({ icon, label, value, unit, total, detail }) => (
    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow">
      <div className="flex justify-between items-center mb-1">
        <span className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
          {icon}
          {label}
        </span>
        <span className={`font-semibold text-sm ${getScoreColorClass(value)}`}>{value.toFixed(1)}/{total}</span>
      </div>
      <ProgressBar value={(value / total) * 100} />
      {detail && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{detail}</p>}
    </div>
  );

  return (
    <div className="card p-6 animate-fadeIn">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-1">GitHub Reputation Analysis</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter a GitHub username to calculate their developer score.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="e.g., octocat"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !loading && analyzeProfile()}
          className="flex-grow"
          aria-label="GitHub Username"
        />
        <Button onClick={analyzeProfile} disabled={loading || !username.trim()} className="w-full sm:w-auto btn-primary">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing..." : "Analyze Profile"}
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm text-center mb-4 animate-fadeIn">{error}</p>}

      {scoreData && (
        <div className="animate-fadeIn space-y-6 mt-6">
          <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-xl shadow-inner">
            {scoreData.details.avatarUrl && (
              <img src={scoreData.details.avatarUrl} alt={scoreData.username} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white dark:border-slate-700 shadow-lg"/>
            )}
            <h3 className="text-3xl font-bold tracking-tight ${getScoreColorClass(scoreData.totalScore)}">
              {scoreData.totalScore.toFixed(1)} / 10
            </h3>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              Overall Score for <a href={scoreData.details.githubUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{scoreData.details.name || scoreData.username}</a>
            </p>
             {scoreData.totalScore >= 7 ?
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1"><CheckCircle2 size={16}/>Eligible to be a Backer</p> :
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center gap-1"><XCircle size={16}/>Score too low to be a Backer (Min 7 required)</p>
            }
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreItem icon={<CodeXml size={16} className="mr-2"/>} label="Repositories" value={scoreData.breakdown.repositories} total={10} detail={`${scoreData.details.publicRepos} public repos`}/>
            <ScoreItem icon={<Users size={16} className="mr-2"/>} label="Followers" value={scoreData.breakdown.followers} total={10} detail={`${scoreData.details.followers} followers`}/>
            <ScoreItem icon={<Star size={16} className="mr-2"/>} label="Stars Received" value={scoreData.breakdown.stars} total={10} detail={`${scoreData.details.totalStars} total stars`}/>
            <ScoreItem icon={<GitFork size={16} className="mr-2"/>} label="Forks Received" value={scoreData.breakdown.forks} total={10} detail={`${scoreData.details.totalForks} total forks`}/>
            <ScoreItem icon={<CalendarDays size={16} className="mr-2"/>} label="Account Age" value={scoreData.breakdown.accountAge} total={10} detail={`${scoreData.details.accountAgeYears} years`}/>
            <ScoreItem icon={<Award size={16} className="mr-2"/>} label="Recent Activity" value={scoreData.breakdown.activity} total={10} detail={`${scoreData.details.recentCommits} commits (last 30d)`}/>
            <ScoreItem icon={<Users size={16} className="mr-2"/>} label="Profile Quality" value={scoreData.breakdown.profile} total={10} detail={`${scoreData.details.profileCompleteness}% complete`}/>
            <ScoreItem icon={<CodeXml size={16} className="mr-2"/>} label="Language Diversity" value={scoreData.breakdown.languages} total={10} detail={`${scoreData.details.languageCount} languages`}/>
          </div>
        </div>
      )}
    </div>
  );
}