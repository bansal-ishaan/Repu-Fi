// app/api/github-score/route.js
import { NextResponse } from "next/server";
// Assuming fetchGitHubData and calculateScore are in the same file or correctly imported
// For this example, I'll assume they are in a separate file like './logic.js' as per your snippet
// If they are in this file, you don't need the import { ... } from "./logic";
import { fetchGitHubData, calculateScore } from "./logic"; // Adjust path if needed

// Define the overrides
const SCORE_OVERRIDES = {
    "rohandroid-7341": 10.0, // GitHub usernames are case-insensitive in URLs but often stored lowercase.
    "bansal-ishaan": 6.0,   // Match the exact casing from GitHub if possible, or normalize.
};

// Helper to create a mock breakdown if an override happens and you want to reflect it
// This is optional, you could just override totalScore.
function createMockBreakdown(targetScore) {
    // Distribute the targetScore somewhat plausibly across categories, all out of 10
    // This is a very simplistic approach.
    const numCategories = 11; // Number of categories in your scores object
    const baseScore = 5;
    const scoreAboveBase = targetScore - baseScore; // Score to distribute above the minimum of 5
    
    // If targetScore is below base, it's tricky. For now, let's assume targetScore >= 5
    if (targetScore < baseScore) {
        // Fallback: just set all to targetScore or baseScore
        return {
            repositories: targetScore, followers: targetScore, stars: targetScore, forks: targetScore,
            accountAge: targetScore, activity: targetScore, prs: targetScore, issues: targetScore,
            contributions: targetScore, profile: targetScore, languages: targetScore,
        };
    }

    // Try to distribute scoreAboveBase, ensuring each category gets at least baseScore
    // and doesn't exceed 10. This is a simplification.
    // A more sophisticated mock would require knowing weights or typical distributions.
    let distributedScore = scoreAboveBase / numCategories;
    
    const breakdown = {
        repositories: Math.min(10, baseScore + distributedScore * 1.2), // Slightly vary distribution
        followers:    Math.min(10, baseScore + distributedScore * 1.1),
        stars:        Math.min(10, baseScore + distributedScore * 1.5),
        forks:        Math.min(10, baseScore + distributedScore * 0.8),
        accountAge:   Math.min(10, baseScore + distributedScore * 1.0),
        activity:     Math.min(10, baseScore + distributedScore * 1.3),
        prs:          Math.min(10, baseScore + distributedScore * 1.1),
        issues:       Math.min(10, baseScore + distributedScore * 0.7),
        contributions:Math.min(10, baseScore + distributedScore * 1.2),
        profile:      Math.min(10, baseScore + distributedScore * 0.9),
        languages:    Math.min(10, baseScore + distributedScore * 1.0),
    };

    // Ensure each is at least 5 and format to one decimal
     for (const key in breakdown) {
        breakdown[key] = parseFloat(Math.max(5, breakdown[key]).toFixed(1));
     }
    return breakdown;
}


export async function POST(request) {
    try {
        const { username } = await request.json();
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return NextResponse.json({ error: "Username is required." }, { status: 400 });
        }

        const normalizedUsername = username.trim().toLowerCase(); // Normalize for override check

        // Fetch and calculate score normally
        const { user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs } = await fetchGitHubData(username.trim());
        let scoreData = calculateScore(user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs);

        // Apply overrides
        if (SCORE_OVERRIDES.hasOwnProperty(normalizedUsername)) {
            const overrideScore = SCORE_OVERRIDES[normalizedUsername];
            console.log(`Applying score override for ${username}: ${overrideScore}`);
            scoreData.totalScore = overrideScore;
            // Optionally, adjust breakdown to reflect the override.
            // For simplicity, we can create a mock breakdown.
            // If you want the original breakdown but just change totalScore, skip this.
            scoreData.breakdown = createMockBreakdown(overrideScore);
            // You might also want to add a flag or note that this score was overridden
            scoreData.isOverridden = true;
            scoreData.overrideNote = `Score manually set to ${overrideScore}. Original calculated data is still present in 'details'.`;
        }

        return NextResponse.json(scoreData);
    } catch (error) {
        console.error("API Error in /api/github-score:", error.message);
        // Check if it's a specific error from fetchGitHubData to return appropriate status
        const status = error.message === "GitHub user not found." ? 404 :
                       error.message.startsWith("Rate limit exceeded") ? 429 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}