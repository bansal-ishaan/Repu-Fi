import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    // Use GitHub's public API
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "JobPortal-App",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      throw new Error(`GitHub API responded with ${response.status}`)
    }

    const user = await response.json()

    // Calculate a simple score based on GitHub activity
    const score = Math.min(
      100,
      Math.floor(
        (user.public_repos || 0) * 2 +
          (user.followers || 0) * 0.5 +
          (user.following || 0) * 0.1 +
          (user.public_gists || 0) * 1,
      ),
    )

    return NextResponse.json({
      login: user.login,
      id: user.id,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      name: user.name,
      company: user.company,
      blog: user.blog,
      location: user.location,
      email: user.email,
      bio: user.bio,
      public_repos: user.public_repos,
      public_gists: user.public_gists,
      followers: user.followers,
      following: user.following,
      created_at: user.created_at,
      updated_at: user.updated_at,
      type: user.type,
      score,
    })
  } catch (error) {
    console.error("Error fetching GitHub data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch GitHub data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
