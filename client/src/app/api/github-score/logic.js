const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                const resetTime = parseInt(response.headers.get('X-RateLimit-Reset')) * 1000;
                const waitTime = Math.max(0, resetTime - Date.now() + 1000);
                console.warn(`Rate limit hit. Waiting for ${waitTime / 1000}s...`);
                if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, waitTime));
                else throw new Error(`Rate limit exceeded after ${retries} retries for ${url}`);
            } else if (!response.ok) {
                 if (i < retries - 1) {
                    console.warn(`Request to ${url} failed with status ${response.status}. Retrying...`);
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                 } else {
                    throw new Error(`Failed to fetch from ${url} after ${retries} retries: ${response.status} ${response.statusText}`);
                 }
            }
        } catch (error) {
            if (i < retries - 1) {
                console.warn(`Request to ${url} encountered an error. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} retries.`);
}


export async function fetchGitHubData(username) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub API token is not configured on the server.");
    }
    const headers = {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
    };

    const userResponse = await fetchWithRetry(`https://api.github.com/users/${username}`, { headers });
    if (!userResponse.ok && userResponse.status === 404) throw new Error("GitHub user not found.");
    if (!userResponse.ok) throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
    const user = await userResponse.json();

    const reposResponse = await fetchWithRetry(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`, { headers });
    const repos = reposResponse.ok ? await reposResponse.json() : [];

    let recentCommitsCount = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const reposToScanForCommits = repos.slice(0, 5);
    for (const repo of reposToScanForCommits) {
        try {
            const commitsUrl = repo.commits_url.replace('{/sha}', '');
            const commitsResponse = await fetchWithRetry(`${commitsUrl}?author=${username}&since=${thirtyDaysAgo}&per_page=100`, { headers });
            if (commitsResponse.ok) {
                const commits = await commitsResponse.json();
                recentCommitsCount += commits.length;
            }
        } catch (commitError) {
            console.warn(`Could not fetch commits for ${repo.name}:`, commitError.message);
        }
    }

    const prsResponse = await fetchWithRetry(`https://api.github.com/search/issues?q=author:${username}+type:pr&per_page=1`, { headers });
    const prsData = prsResponse.ok ? await prsResponse.json() : { total_count: 0 };
    const totalPRs = prsData.total_count || 0;

    const issuesResponse = await fetchWithRetry(`https://api.github.com/search/issues?q=author:${username}+type:issue&per_page=1`, { headers });
    const issuesData = issuesResponse.ok ? await issuesResponse.json() : { total_count: 0 };
    const totalIssues = issuesData.total_count || 0;

    const contribResponse = await fetchWithRetry(`https://api.github.com/search/issues?q=author:${username}+type:pr+-user:${username}&per_page=1`, { headers });
    const contribData = contribResponse.ok ? await contribResponse.json() : { total_count: 0 };
    const contributedToPRs = contribData.total_count || 0;

    return { user, repos, recentCommits: recentCommitsCount, totalPRs, totalIssues, contributedToPRs };
}

export function calculateScore(user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs) {
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
        repositories: Math.min(10, 5 + (user.public_repos / 25) * 50),
        followers: Math.min(10, 5 + Math.log10(Math.max(1, user.followers + 1)) * 10.5),
        stars: Math.min(10, 5 + Math.log10(Math.max(1, totalStars + 1)) * 10.2),
        forks: Math.min(10, 5 + Math.log10(Math.max(1, totalForks + 1)) * 10.0),
        accountAge: Math.min(10, 5 + Math.min(5, accountAge * 10.25)),
        activity: Math.min(10, 5 + (recentCommits / 25) * 50),
        prs: Math.min(10, 5 + Math.log10(Math.max(1, totalPRs + 1)) * 10.5),
        issues: Math.min(10, 5 + Math.log10(Math.max(1, totalIssues + 1)) * 10.0),
        contributions: Math.min(10, 5 + Math.log10(Math.max(1, contributedToPRs + 1)) * 20.0),
        profile: 5 + (profileCompleteness / 100) * 50,
        languages: Math.min(10, 5 + (languageCount / 4) * 50),
    };
    
    for (const key in scores) { scores[key] = Math.max(5, parseFloat(scores[key].toFixed(1))); }

    const weights = {
        repositories: 0.10, followers: 0.10, stars: 0.15, forks: 0.05,
        accountAge: 0.10, activity: 0.15, prs: 0.10, issues: 0.05,
        contributions: 0.10, profile: 0.05, languages: 0.05,
    };

    let weightedScore = Object.keys(scores).reduce((sum, key) => sum + (scores[key] * (weights[key] || 0)), 0);
    const finalScore = Math.max(5, Math.min(10, weightedScore));

    return {
        username: user.login,
        totalScore: parseFloat(finalScore.toFixed(1)),
        breakdown: scores,
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