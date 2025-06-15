"use client"

import Link from "next/link"

import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Github } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SignIn() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push("/")
      }
    })
  }, [router])

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true)
      const result = await signIn("github", {
        callbackUrl: "/",
        redirect: false,
      })

      if (result?.error) {
        console.error("Sign in error:", result.error)
        router.push(`/auth/error?error=${result.error}`)
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      console.error("Sign in failed:", error)
      router.push("/auth/error?error=Default")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">JobPortal</CardTitle>
          <p className="text-gray-600">Sign in to apply for jobs</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2"
            size="lg"
          >
            <Github className="h-5 w-5" />
            <span>{isLoading ? "Signing in..." : "Continue with GitHub"}</span>
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>

          <div className="text-center">
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
