// app/api/github-score/route.js
import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // From .env.local (server-side only)

async function fetchGitHubData(username) {
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub API token is not configured on the server.");
  }
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    const userResponse = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!userResponse.ok) {
      if (userResponse.status === 404) throw new Error("GitHub user not found.");
      throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
    }
    const user = await userResponse.json();

    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`, { headers });
    const repos = reposResponse.ok ? await reposResponse.json() : [];

    let recentCommits = 0;
    if (repos.length > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // Fetch commits for a few recent repos to get a sense of activity
      // This can be slow if user has many repos; consider limiting or parallelizing carefully.
      // For simplicity, checking the most recently updated one.
      try {
        const commitsUrl = repos[0].commits_url.replace('{/sha}', ''); // Get base commits URL
        const commitsResponse = await fetch(`${commitsUrl}?author=${username}&since=${thirtyDaysAgo}&per_page=100`, { headers });
        if (commitsResponse.ok) {
          const commits = await commitsResponse.json();
          recentCommits = commits.length;
        }
      } catch (commitError) {
        console.warn(`Could not fetch commits for ${repos[0].name}:`, commitError.message);
      }
    }
    return { user, repos, recentCommits };
  } catch (error) {
    console.error(`Error in fetchGitHubData for ${username}:`, error);
    throw error; // Rethrow to be caught by POST handler
  }
}

function calculateScore(user, repos, recentCommits) {
  const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
  const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
  const languages = new Set(repos.map((repo) => repo.language).filter(Boolean));
  const languageCount = languages.size;

  let profileFields = 0;
  if (user.name) profileFields++;
  if (user.bio) profileFields++;
  if (user.location) profileFields++;
  if (user.company) profileFields++;
  if (user.blog) profileFields++;
  const profileCompleteness = (profileFields / 5) * 100;

  const scores = {
    repositories: Math.min(10, 5 + (user.public_repos / 20) * 5),
    followers: Math.min(10, 5 + Math.log10(Math.max(1, user.followers)) * 1.5),
    stars: Math.min(10, 5 + Math.log10(Math.max(1, totalStars)) * 1.2),
    forks: Math.min(10, 5 + Math.log10(Math.max(1, totalForks)) * 1.0),
    accountAge: Math.min(10, 5 + Math.min(5, accountAge * 1.5)),
    activity: Math.min(10, 5 + (recentCommits / 30) * 5), // Adjusted threshold for 30-day commit check
    profile: 5 + (profileCompleteness / 100) * 5,
    languages: Math.min(10, 5 + (languageCount / 5) * 5), // Adjusted threshold
  };
  // Ensure scores are at least 5
  for (const key in scores) {
    scores[key] = Math.max(5, scores[key]);
  }

  const weights = {
    repositories: 0.15, followers: 0.15, stars: 0.2, forks: 0.1,
    accountAge: 0.1, activity: 0.15, profile: 0.05, languages: 0.1,
  };

  let weightedScore = 0;
  for (const key in scores) {
    weightedScore += scores[key] * weights[key];
  }
  const totalScore = Math.max(5, Math.min(10, weightedScore)); // Ensure final score is 5-10

  return {
    username: user.login,
    totalScore: parseFloat(totalScore.toFixed(1)), // Ensure one decimal place
    breakdown: Object.fromEntries(Object.entries(scores).map(([k,v]) => [k, parseFloat(v.toFixed(1))])),
    details: {
      publicRepos: user.public_repos, followers: user.followers, totalStars, totalForks,
      accountAgeYears: parseFloat(accountAge.toFixed(1)), recentCommits,
      profileCompleteness: Math.round(profileCompleteness), languageCount,
      avatarUrl: user.avatar_url,
      githubUrl: user.html_url,
      name: user.name || user.login,
      bio: user.bio,
    },
  };
}

export async function POST(request) {
  try {
    const { username } = await request.json();
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json({ error: "Username is required and must be a string." }, { status: 400 });
    }

    const { user, repos, recentCommits } = await fetchGitHubData(username.trim());
    const scoreData = calculateScore(user, repos, recentCommits);

    return NextResponse.json(scoreData);
  } catch (error) {
    console.error("API Error /api/github-score:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error processing GitHub data." },
      { status: error.message === "GitHub user not found." ? 404 : 500 }
    );
  }
}