"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Briefcase, Users, Building2, LogOut } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const featuredJobs = [
  {
    id: 1,
    title: "Senior Frontend Developer",
    company: "TechCorp Solutions",
    location: "Bangalore, Karnataka",
    experience: "3-6 years",
    salary: "₹12-18 LPA",
    skills: ["React", "TypeScript", "Next.js"],
    posted: "2 days ago",
    applicants: 45,
  },
  {
    id: 2,
    title: "Full Stack Developer",
    company: "InnovateTech",
    location: "Mumbai, Maharashtra",
    experience: "2-5 years",
    salary: "₹10-15 LPA",
    skills: ["Node.js", "React", "MongoDB"],
    posted: "1 day ago",
    applicants: 32,
  },
  {
    id: 3,
    title: "DevOps Engineer",
    company: "CloudFirst Inc",
    location: "Hyderabad, Telangana",
    experience: "4-7 years",
    salary: "₹15-22 LPA",
    skills: ["AWS", "Docker", "Kubernetes"],
    posted: "3 days ago",
    applicants: 28,
  },
  {
    id: 4,
    title: "Product Manager",
    company: "StartupXYZ",
    location: "Pune, Maharashtra",
    experience: "5-8 years",
    salary: "₹18-25 LPA",
    skills: ["Product Strategy", "Analytics", "Agile"],
    posted: "1 day ago",
    applicants: 67,
  },
]

export default function HomePage() {
  const { data: session, status } = useSession()

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
              <h1 className="text-2xl font-bold text-blue-600">JobPortal</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                Jobs
              </Link>
              <Link href="/companies" className="text-gray-700 hover:text-blue-600">
                Companies
              </Link>
              <Link href="/services" className="text-gray-700 hover:text-blue-600">
                Services
              </Link>
            </nav>
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
                  <Button variant="secondary" asChild>
                    <Link href="/admin">Admin</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/admin">Admin</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Find Your Dream Job Today</h2>
            <p className="text-xl mb-8">Discover opportunities from top companies across India</p>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto bg-white rounded-lg p-4 shadow-lg">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="Job title, keywords, or company" className="pl-10 h-12" />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="Location" className="pl-10 h-12" />
                </div>
                <Button size="lg" className="h-12 px-8">
                  Search Jobs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">50K+</div>
              <div className="text-gray-600">Active Jobs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">10K+</div>
              <div className="text-gray-600">Companies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">1M+</div>
              <div className="text-gray-600">Job Seekers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">25K+</div>
              <div className="text-gray-600">Success Stories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Featured Jobs</h3>
            <p className="text-gray-600">Discover the latest job opportunities from top companies</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{job.title}</CardTitle>
                      <div className="flex items-center text-gray-600 mb-2">
                        <Building2 className="h-4 w-4 mr-2" />
                        {job.company}
                      </div>
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-2" />
                        {job.location}
                      </div>
                    </div>
                    <Badge variant="secondary">{job.posted}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {job.experience}
                    </div>
                    <div className="text-lg font-semibold text-green-600">{job.salary}</div>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        {job.applicants} applicants
                      </div>
                      <Button asChild>
                        <Link href={`/jobs/${job.id}`}>Apply Now</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              View All Jobs
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">JobPortal</h4>
              <p className="text-gray-400">Your trusted partner in finding the perfect career opportunity.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Browse Jobs</li>
                <li>Career Advice</li>
                <li>Resume Builder</li>
                <li>Salary Guide</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Post Jobs</li>
                <li>Search Resumes</li>
                <li>Recruitment Solutions</li>
                <li>Employer Branding</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 JobPortal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
