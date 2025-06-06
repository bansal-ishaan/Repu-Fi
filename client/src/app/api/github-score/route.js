// app/api/github-score/route.js
import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                const resetTime = parseInt(response.headers.get('X-RateLimit-Reset')) * 1000;
                const waitTime = Math.max(0, resetTime - Date.now() + 1000); // Add a buffer
                console.warn(`Rate limit hit. Waiting for ${waitTime / 1000}s to retry...`);
                if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, waitTime));
                else throw new Error(`Rate limit exceeded after ${retries} retries for ${url}`);
            } else if (!response.ok) {
                 if (i < retries - 1) {
                    console.warn(`Request to ${url} failed with status ${response.status}. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff might be better
                 } else {
                    throw new Error(`Failed to fetch from ${url} after ${retries} retries: ${response.status} ${response.statusText}`);
                 }
            }
        } catch (error) {
            if (i < retries - 1) {
                console.warn(`Request to ${url} encountered an error: ${error.message}. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} retries.`);
}


async function fetchGitHubData(username) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub API token is not configured on the server.");
    }
    const headers = {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
    };

    try {
        // Fetch user data
        const userResponse = await fetchWithRetry(`https://api.github.com/users/${username}`, { headers });
        if (!userResponse.ok && userResponse.status === 404) throw new Error("GitHub user not found.");
        if (!userResponse.ok) throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
        const user = await userResponse.json();

        // Fetch repositories (owned by the user)
        const reposResponse = await fetchWithRetry(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`, { headers });
        const repos = reposResponse.ok ? await reposResponse.json() : [];

        // Fetch recent commits (across multiple recent repositories, if possible)
        let recentCommitsCount = 0;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        // Check commits in top N recently updated repos (e.g., 5)
        const reposToScanForCommits = repos.slice(0, 5);
        for (const repo of reposToScanForCommits) {
            try {
                const commitsUrl = repo.commits_url.replace('{/sha}', '');
                // Note: `author` param on list commits endpoint is for commit author, not committer.
                // For contributions by the user, searching events or using GraphQL is more reliable for "total commits".
                // This simplified approach counts commits where the user is an author in their own repos.
                const commitsResponse = await fetchWithRetry(`${commitsUrl}?author=${username}&since=${thirtyDaysAgo}&per_page=100`, { headers });
                if (commitsResponse.ok) {
                    const commits = await commitsResponse.json();
                    recentCommitsCount += commits.length;
                }
            } catch (commitError) {
                console.warn(`Could not fetch commits for ${repo.name}:`, commitError.message);
            }
        }

        // Fetch total PRs created by the user
        const prsResponse = await fetchWithRetry(`https://api.github.com/search/issues?q=author:${username}+type:pr&per_page=1`, { headers });
        const prsData = prsResponse.ok ? await prsResponse.json() : { total_count: 0 };
        const totalPRs = prsData.total_count || 0;

        // Fetch total issues created by the user
        const issuesResponse = await fetchWithRetry(`https://api.github.com/search/issues?q=author:${username}+type:issue&per_page=1`, { headers });
        const issuesData = issuesResponse.ok ? await issuesResponse.json() : { total_count: 0 };
        const totalIssues = issuesData.total_count || 0;

        // Estimate "Contributed To" (PRs to repos not owned by the user)
        // This is a rough estimate. GraphQL is better.
        const contribResponse = await fetchWithRetry(`https://api.github.com/search/issues?q=author:${username}+type:pr+-user:${username}&per_page=1`, { headers });
        const contribData = contribResponse.ok ? await contribResponse.json() : { total_count: 0 };
        const contributedToPRs = contribData.total_count || 0;

        // NOTE: "Total commits across all time" is very hard with REST API.
        // You might use user events, but it's paginated and complex.
        // GraphQL is highly recommended for this.
        // For now, we'll use `recentCommitsCount` for activity and not aim for "total lifetime commits".

        return { user, repos, recentCommits: recentCommitsCount, totalPRs, totalIssues, contributedToPRs };

    } catch (error) {
        console.error(`Error in fetchGitHubData for ${username}:`, error.message);
        throw error;
    }
}

function calculateScore(user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs) {
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
        repositories: Math.min(10, 5 + (user.public_repos / 25) * 5), // Adjusted threshold
        followers: Math.min(10, 5 + Math.log10(Math.max(1, user.followers + 1)) * 1.5), // Added +1 to avoid log(1)=0 edge case in base
        stars: Math.min(10, 5 + Math.log10(Math.max(1, totalStars + 1)) * 1.2),
        forks: Math.min(10, 5 + Math.log10(Math.max(1, totalForks + 1)) * 1.0),
        accountAge: Math.min(10, 5 + Math.min(5, accountAge * 1.25)), // Slightly adjusted
        activity: Math.min(10, 5 + (recentCommits / 25) * 5), // Commits in last 30 days
        prs: Math.min(10, 5 + Math.log10(Math.max(1, totalPRs + 1)) * 1.5), // Score for PRs
        issues: Math.min(10, 5 + Math.log10(Math.max(1, totalIssues + 1)) * 1.0), // Score for Issues
        contributions: Math.min(10, 5 + Math.log10(Math.max(1, contributedToPRs + 1)) * 2.0), // Higher weight for external contributions
        profile: 5 + (profileCompleteness / 100) * 5,
        languages: Math.min(10, 5 + (languageCount / 4) * 5), // Adjusted threshold
    };
    for (const key in scores) { scores[key] = Math.max(5, parseFloat(scores[key].toFixed(1))); }

    const weights = {
        repositories: 0.10, followers: 0.10, stars: 0.15, forks: 0.05,
        accountAge: 0.10, activity: 0.15, prs: 0.10, issues: 0.05,
        contributions: 0.10, profile: 0.05, languages: 0.05,
    };

    let weightedScore = 0;
    let totalWeight = 0; // Recalculate total weight in case some metrics are zero but have weights
    for (const key in scores) {
        if (weights[key]) { // only consider keys that have weights
            weightedScore += scores[key] * weights[key];
            totalWeight += weights[key];
        }
    }
    // Normalize if totalWeight is not 1 (though it should be if all keys in scores have weights)
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 5;
    const totalScore = Math.max(5, Math.min(10, finalScore));


    return {
        username: user.login,
        totalScore: parseFloat(totalScore.toFixed(1)),
        breakdown: scores, // Already has .toFixed(1) applied
        details: {
            publicRepos: user.public_repos, followers: user.followers, totalStars, totalForks,
            accountAgeYears: parseFloat(accountAge.toFixed(1)),
            recentCommits, totalPRs, totalIssues, contributedToPRs,
            profileCompleteness: Math.round(profileCompleteness), languageCount,
            avatarUrl: user.avatar_url, githubUrl: user.html_url,
            name: user.name || user.login, bio: user.bio,
        },
    };
}

export async function POST(request) {
    try {
        const { username } = await request.json();
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return NextResponse.json({ error: "Username is required and must be a string." }, { status: 400 });
        }

        const { user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs } = await fetchGitHubData(username.trim());
        const scoreData = calculateScore(user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs);

        return NextResponse.json(scoreData);
    } catch (error) {
        console.error("API Error /api/github-score for user:", (await request.clone().json()).username, "Error:", error.message);
        return NextResponse.json(
            { error: error.message || "Internal server error processing GitHub data." },
            { status: error.message === "GitHub user not found." ? 404 : (error.message.startsWith("Rate limit exceeded") ? 429 : 500) }
        );
    }
}