"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Briefcase, Clock, Building2, Users, DollarSign, ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"
import { ApplicationModal } from "@/components/application-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "next-auth/react"

const jobDetails = {
  id: 1,
  title: "Senior Frontend Developer",
  company: "TechCorp Solutions",
  location: "Bangalore, Karnataka",
  experience: "3-6 years",
  salary: "₹12-18 LPA",
  skills: ["React", "TypeScript", "Next.js", "JavaScript", "CSS", "HTML"],
  posted: "2 days ago",
  applicants: 45,
  description: `We are looking for a Senior Frontend Developer to join our dynamic team. You will be responsible for developing user-facing web applications and ensuring great user experience.`,
  responsibilities: [
    "Develop and maintain web applications using React and Next.js",
    "Collaborate with design and backend teams to implement features",
    "Optimize applications for maximum speed and scalability",
    "Write clean, maintainable, and well-documented code",
    "Participate in code reviews and technical discussions",
    "Stay updated with latest frontend technologies and best practices",
  ],
  requirements: [
    "3+ years of experience in frontend development",
    "Strong proficiency in React, TypeScript, and Next.js",
    "Experience with modern CSS frameworks and preprocessors",
    "Knowledge of RESTful APIs and GraphQL",
    "Familiarity with version control systems (Git)",
    "Strong problem-solving and communication skills",
  ],
  benefits: [
    "Competitive salary and performance bonuses",
    "Health insurance for you and your family",
    "Flexible working hours and remote work options",
    "Professional development opportunities",
    "Modern office with latest technology",
    "Team outings and company events",
  ],
}

export default function JobDetailsPage() {
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [githubData, setGithubData] = useState<any>(null)
  const [isLoadingGithub, setIsLoadingGithub] = useState(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    // Fetch GitHub data when user is authenticated
    if (session?.user?.githubUsername) {
      fetchGitHubData()
    }
  }, [session])

  const fetchGitHubData = async () => {
    if (!session?.user?.githubUsername) return

    try {
      setIsLoadingGithub(true)
      const response = await fetch(`/api/github-data?username=${session.user.githubUsername}`)
      if (response.ok) {
        const data = await response.json()
        setGithubData(data)
      } else {
        console.error("Failed to fetch GitHub data")
      }
    } catch (error) {
      console.error("Error fetching GitHub data:", error)
    } finally {
      setIsLoadingGithub(false)
    }
  }

  const handleApplyClick = () => {
    if (!session) {
      alert("Please sign in with GitHub to apply for jobs")
      return
    }
    setShowApplicationModal(true)
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-blue-600 hover:text-blue-700">
                <ArrowLeft className="h-5 w-5 mr-2" />
                <h1 className="text-2xl font-bold">JobPortal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {status === "loading" ? (
                <div className="animate-pulse">Loading...</div>
              ) : session ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback>{session.user.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">Welcome, {session.user.name}</span>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-3">{jobDetails.title}</CardTitle>
                <div className="flex items-center text-gray-600 mb-2">
                  <Building2 className="h-5 w-5 mr-2" />
                  <span className="text-lg font-medium">{jobDetails.company}</span>
                </div>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  {jobDetails.location}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-1" />
                    {jobDetails.experience}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {jobDetails.salary}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Posted {jobDetails.posted}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {jobDetails.applicants} applicants
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {jobDetails.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button size="lg" className="ml-6" onClick={handleApplyClick}>
                Apply Now
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Rest of the component remains the same */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{jobDetails.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDetails.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-gray-700">{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDetails.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ready to Apply?</CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full mb-4" onClick={handleApplyClick}>
                  Apply Now
                </Button>
                <p className="text-sm text-gray-600 text-center">Join {jobDetails.applicants} other applicants</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benefits & Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobDetails.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span className="text-gray-700 text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About {jobDetails.company}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4">
                  TechCorp Solutions is a leading technology company specializing in innovative software solutions for
                  businesses worldwide.
                </p>
                <Button variant="outline" className="w-full">
                  View Company Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {session && (
        <ApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          jobTitle={jobDetails.title}
          company={jobDetails.company}
          session={session}
          githubData={githubData}
          isLoadingGithub={isLoadingGithub}
        />
      )}
    </div>
  )
}
