// src/app/api/github-score/route.js
import { NextResponse } from "next/server";
import { fetchGitHubData, calculateScore } from "./logic"; // Import our refactored logic

export async function POST(request) {
    try {
        const { username } = await request.json();
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return NextResponse.json({ error: "Username is required." }, { status: 400 });
        }

        const { user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs } = await fetchGitHubData(username.trim());
        const scoreData = calculateScore(user, repos, recentCommits, totalPRs, totalIssues, contributedToPRs);

        return NextResponse.json(scoreData);
    } catch (error) {
        console.error("API Error in /api/github-score:", error.message);
        const status = error.message === "GitHub user not found." ? 404 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}