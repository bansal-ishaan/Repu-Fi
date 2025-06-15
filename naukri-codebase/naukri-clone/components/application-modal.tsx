"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Github, Star, Calendar, Wallet } from "lucide-react"
import type { Session } from "next-auth"

interface ApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  jobTitle: string
  company: string
  session: Session
  githubData?: any
  isLoadingGithub?: boolean
}

export function ApplicationModal({
  isOpen,
  onClose,
  jobTitle,
  company,
  session,
  githubData,
  isLoadingGithub,
}: ApplicationModalProps) {
  const [formData, setFormData] = useState({
    fullName: session?.user?.name || "",
    email: session?.user?.email || "",
    walletAddress: "", // User can fill this manually
    githubUsername: session?.user?.githubUsername || "",
    phone: "",
    address: "",
    experience: "",
    currentSalary: "",
    expectedSalary: "",
    noticePeriod: "",
    coverLetter: "",
    resume: null as File | null,
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Create application object
    const applicationData = {
      id: Date.now().toString(),
      applicantName: formData.fullName,
      email: formData.email,
      walletAddress: formData.walletAddress,
      githubUsername: formData.githubUsername,
      phone: formData.phone,
      address: formData.address,
      jobTitle,
      company,
      appliedDate: new Date().toISOString().split("T")[0],
      status: "pending",
      experience: formData.experience,
      currentSalary: formData.currentSalary,
      expectedSalary: formData.expectedSalary,
      noticePeriod: formData.noticePeriod,
      coverLetter: formData.coverLetter,
      hasGitHubData: !!githubData,
      githubData: githubData || null,
    }

    // Save to localStorage (in real app, this would be sent to backend)
    const existingApplications = JSON.parse(localStorage.getItem("applications") || "[]")
    existingApplications.push(applicationData)
    localStorage.setItem("applications", JSON.stringify(existingApplications))

    alert("Application submitted successfully!")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Apply for {jobTitle} at {company}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Application Form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    required
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">From GitHub profile</p>
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">From GitHub profile</p>
                </div>
              </div>

              <div>
                <Label htmlFor="githubUsername">GitHub Username *</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="githubUsername"
                    value={formData.githubUsername}
                    onChange={(e) => handleInputChange("githubUsername", e.target.value)}
                    required
                    disabled
                    className="pl-10 bg-gray-50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">From GitHub profile</p>
              </div>

              <div>
                <Label htmlFor="walletAddress">Wallet Address (Optional)</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="walletAddress"
                    value={formData.walletAddress}
                    onChange={(e) => handleInputChange("walletAddress", e.target.value)}
                    placeholder="Enter your crypto wallet address (e.g., 0x742d35Cc...)"
                    className="pl-10 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Optional: Enter your cryptocurrency wallet address</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Total Experience</Label>
                  <Select onValueChange={(value) => handleInputChange("experience", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-8">5-8 years</SelectItem>
                      <SelectItem value="8+">8+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Current Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentSalary">Current Salary (LPA)</Label>
                  <Input
                    id="currentSalary"
                    value={formData.currentSalary}
                    onChange={(e) => handleInputChange("currentSalary", e.target.value)}
                    placeholder="e.g., 12"
                  />
                </div>
                <div>
                  <Label htmlFor="expectedSalary">Expected Salary (LPA)</Label>
                  <Input
                    id="expectedSalary"
                    value={formData.expectedSalary}
                    onChange={(e) => handleInputChange("expectedSalary", e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Select onValueChange={(value) => handleInputChange("noticePeriod", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select notice period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="15-days">15 days</SelectItem>
                    <SelectItem value="1-month">1 month</SelectItem>
                    <SelectItem value="2-months">2 months</SelectItem>
                    <SelectItem value="3-months">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resume">Upload Resume *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button type="button" variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      Choose File
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">PDF, DOC, DOCX up to 5MB</p>
                </div>
              </div>

              <div>
                <Label htmlFor="coverLetter">Cover Letter</Label>
                <Textarea
                  id="coverLetter"
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                  rows={4}
                  placeholder="Tell us why you're interested in this role..."
                />
              </div>
            </div>

            {/* GitHub Data Panel */}
            {githubData && (
              <div className="lg:col-span-1">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-800">
                      <Github className="mr-2 h-5 w-5" />
                      GitHub Profile Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">GitHub Score</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-bold text-green-700">{githubData.score || 85}/100</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Username:</span>
                        <span className="font-medium">@{githubData.login || session.user.githubUsername}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Repositories:</span>
                        <span className="font-medium">{githubData.public_repos || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Followers:</span>
                        <span className="font-medium">{githubData.followers || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Following:</span>
                        <span className="font-medium">{githubData.following || 0}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>
                          Joined {githubData.created_at ? new Date(githubData.created_at).getFullYear() : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs font-medium text-gray-600 mb-1">Profile Summary:</div>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span>Account Type:</span>
                          <Badge variant="outline">{githubData.type || "User"}</Badge>
                        </div>
                        {githubData.bio && (
                          <div className="text-xs text-gray-600 mt-2">
                            <strong>Bio:</strong> {githubData.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={githubData.html_url} target="_blank" rel="noopener noreferrer">
                        View GitHub Profile
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit Application</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
