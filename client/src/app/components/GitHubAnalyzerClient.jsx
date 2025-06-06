// app/(components)/GitHubAnalyzerClient.jsx
'use client';
import { useState } from 'react'; // Removed useEffect as it's not used directly here now
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader2, Github, Star, GitCommit, GitPullRequest, AlertCircle, Briefcase, CheckCircle2, XCircle } from 'lucide-react'; // Added new icons

// Helper function to get letter grade and colors
const getLetterGrade = (score) => {
  if (score >= 9.5) return { grade: "A+", color: "text-green-500 dark:text-green-400", ringColorCss: "stroke-green-500", label: "Exceptional" };
  if (score >= 9.0) return { grade: "A", color: "text-green-500 dark:text-green-400", ringColorCss: "stroke-green-500", label: "Excellent" };
  if (score >= 8.5) return { grade: "A-", color: "text-green-500 dark:text-green-400", ringColorCss: "stroke-green-500", label: "Very Strong" };
  if (score >= 8.0) return { grade: "B+", color: "text-sky-500 dark:text-sky-400", ringColorCss: "stroke-sky-500", label: "Strong" };
  if (score >= 7.0) return { grade: "B", color: "text-sky-500 dark:text-sky-400", ringColorCss: "stroke-sky-500", label: "Good" };
  if (score >= 6.0) return { grade: "B-", color: "text-yellow-500 dark:text-yellow-400", ringColorCss: "stroke-yellow-500", label: "Above Average" };
  if (score >= 5.5) return { grade: "C+", color: "text-orange-500 dark:text-orange-400", ringColorCss: "stroke-orange-500", label: "Average" };
  if (score >= 5.0) return { grade: "C", color: "text-orange-500 dark:text-orange-400", ringColorCss: "stroke-orange-500", label: "Fair" };
  return { grade: "C-", color: "text-red-500 dark:text-red-400", ringColorCss: "stroke-red-500", label: "Needs Improvement" }; // Min score is 5
};

// Simple SVG Circular Progress for Grade
const CircularGradeDisplay = ({ score, size = 120, strokeWidth = 10 }) => {
  const { grade, ringColorCss } = getLetterGrade(score);
  // Scale score 5-10 to a 0-100 percentage for the ring's fullness
  const normalizedScoreForRing = Math.max(0, Math.min(100, ((score - 5) / 5) * 100));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Make the ring start from the top (12 o'clock)
  const offset = circumference - (normalizedScoreForRing / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
        <circle
          className="text-slate-200 dark:text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${ringColorCss} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getLetterGrade(score).color}`}>{grade}</span>
        {/* <span className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Grade</span> */}
      </div>
    </div>
  );
};


// Stat Item component
const StatItem = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3 py-2">
    <div className="text-primary">{icon}</div>
    <div className="flex-1">
      <p className="text-sm text-slate-600 dark:text-slate-300">{label}:</p>
    </div>
    <p className="text-lg font-semibold text-foreground">{value}</p>
  </div>
);


export default function GitHubAnalyzerClient({ onAnalysisComplete }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState("");

  const analyzeProfile = async () => {
    if (!username.trim()) { setError("Please enter a GitHub username."); return; }
    setLoading(true); setError(""); setScoreData(null);

    try {
      const response = await fetch("/api/github-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || "Failed to analyze profile."); }
      setScoreData(data);
      if (onAnalysisComplete) { onAnalysisComplete(data); }
    } catch (err) { setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="card p-6 md:p-8 animate-fadeIn">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">GitHub Profile Analyzer</h2>
        <p className="text-md text-slate-500 dark:text-slate-400">
          Enter a GitHub username to calculate their Developer Reputation Score (DRS).
        </p>
      </div>
      <div className="max-w-lg mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            type="text"
            placeholder="e.g., octocat"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && analyzeProfile()}
            className="flex-grow !text-base !py-2.5"
            aria-label="GitHub Username"
          />
          <Button onClick={analyzeProfile} disabled={loading || !username.trim()} className="w-full sm:w-auto btn-primary !py-2.5 !text-base">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Github className="mr-2 h-5 w-5" />}
            {loading ? "Analyzing..." : "Analyze Profile"}
          </Button>
        </div>
        {error && <p className="text-red-500 text-sm text-center mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md animate-fadeIn"><AlertCircle className="inline mr-1 h-4 w-4"/>{error}</p>}
      </div>

      {scoreData && (
        <div className="mt-8 pt-6 border-t border-border dark:border-dark-border animate-fadeIn">
          <div className="text-center mb-6">
            {scoreData.details.avatarUrl && (
              <img src={scoreData.details.avatarUrl} alt={scoreData.username} className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-slate-200 dark:border-slate-700 shadow-lg"/>
            )}
            <h3 className="text-2xl font-semibold text-foreground">
              <a href={scoreData.details.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                {scoreData.details.name || scoreData.username}
              </a>
            </h3>
            <p className={`text-sm font-medium ${getLetterGrade(scoreData.totalScore).color}`}>
              Overall Score: {scoreData.totalScore.toFixed(1)}/10 ({getLetterGrade(scoreData.totalScore).label})
            </p>
            {scoreData.totalScore >= 7 ?
              <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1"><CheckCircle2 size={14}/>Eligible to be a Backer</p> :
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-center gap-1"><XCircle size={14}/>Score too low to be a Backer (Min 7 required)</p>
            }
          </div>

          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 items-center">
            {/* Left Column: Stats List */}
            <div className="space-y-1 pr-4 md:border-r border-border dark:border-dark-border">
              <h4 className="text-lg font-semibold text-foreground mb-3">Key Metrics:</h4>
              <StatItem icon={<Star size={18} />} label="Total Stars Earned" value={scoreData.details.totalStars} />
              <StatItem icon={<GitCommit size={18} />} label="Recent Commits (owned, 30d)" value={scoreData.details.recentCommits} />
              <StatItem icon={<GitPullRequest size={18} />} label="Total PRs Created" value={scoreData.details.totalPRs} />
              <StatItem icon={<AlertCircle size={18} />} label="Total Issues Created" value={scoreData.details.totalIssues} />
              <StatItem icon={<Briefcase size={18} />} label="PRs to Other Repos" value={scoreData.details.contributedToPRs} />
            </div>

            {/* Right Column: Circular Grade */}
            <div className="flex flex-col items-center justify-center py-6 md:py-0">
              <CircularGradeDisplay score={scoreData.totalScore} />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">RepuFi Grade</p>
            </div>
          </div>

           {/* Optional: Full Score Breakdown (can be hidden behind a toggle) */}
           <details className="mt-8 group">
            <summary className="text-sm font-medium text-primary hover:underline cursor-pointer list-none flex items-center">
              View Detailed Score Breakdown
              <svg className="ml-1 w-4 h-4 transform transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </summary>
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-border dark:border-dark-border grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              {Object.entries(scoreData.breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="capitalize text-slate-600 dark:text-slate-300">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className={`font-semibold ${getLetterGrade(value).color}`}>{value.toFixed(1)}/10</span>
                </div>
              ))}
            </div>
          </details>

        </div>
      )}
    </div>
  );
}