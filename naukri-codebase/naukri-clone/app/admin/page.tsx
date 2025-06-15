"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  Users,
  Github,
  Star,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
} from "lucide-react"

interface Application {
  id: string
  applicantName: string
  email: string
  walletAddress: string
  githubUsername: string
  phone: string
  address: string
  jobTitle: string
  company: string
  appliedDate: string
  status: string
  experience: string
  currentSalary: string
  expectedSalary: string
  noticePeriod: string
  coverLetter: string
  hasGitHubData: boolean
  githubData?: any
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    // Load applications from localStorage
    const savedApplications = JSON.parse(localStorage.getItem("applications") || "[]")
    setApplications(savedApplications)
  }, [])

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.githubUsername.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleStatusChange = (applicationId: string, newStatus: string) => {
    const updatedApplications = applications.map((app) =>
      app.id === applicationId ? { ...app, status: newStatus } : app,
    )
    setApplications(updatedApplications)
    localStorage.setItem("applications", JSON.stringify(updatedApplications))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      default:
        return null
    }
  }

  const stats = {
    totalApplications: applications.length,
    pendingReview: applications.filter((app) => app.status === "pending").length,
    approved: applications.filter((app) => app.status === "approved").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline">Settings</Button>
              <Avatar>
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Job Applications</CardTitle>
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </CardHeader>
        </Card>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {application.applicantName}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mb-2">{application.jobTitle}</p>
                    <p className="text-xs text-gray-500">{application.company}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge className={getStatusColor(application.status)}>
                      {getStatusIcon(application.status)}
                      <span className="ml-1 capitalize">{application.status}</span>
                    </Badge>
                    {application.hasGitHubData && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Github className="h-3 w-3 mr-1" />
                        GitHub
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Mail className="h-3 w-3 mr-2 text-gray-400" />
                    <span className="truncate">{application.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 mr-2 text-gray-400" />
                    <span>{application.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Wallet className="h-3 w-3 mr-2 text-gray-400" />
                    <span className="font-mono text-xs truncate">{application.walletAddress}</span>
                  </div>
                  <div className="flex items-center">
                    <Github className="h-3 w-3 mr-2 text-gray-400" />
                    <span>@{application.githubUsername}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-2 text-gray-400" />
                    <span className="truncate">{application.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                    <span>Applied {application.appliedDate}</span>
                  </div>
                </div>

                {/* Experience and Salary */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Experience:</span>
                    <p className="font-medium">{application.experience}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Expected:</span>
                    <p className="font-medium">{application.expectedSalary}</p>
                  </div>
                </div>

                {/* GitHub Data Preview */}
                {application.hasGitHubData && application.githubData && (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-green-800">GitHub Score</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs font-bold text-green-700">{application.githubData.score}/100</span>
                      </div>
                    </div>
                    <div className="text-xs text-green-700">
                      {application.githubData.repositories} repos • {application.githubData.followers} followers
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  {application.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStatusChange(application.id, "approved")}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleStatusChange(application.id, "rejected")}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {application.status !== "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleStatusChange(application.id, "pending")}
                    >
                      Reset to Pending
                    </Button>
                  )}
                </div>

                {/* View Details Button */}
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-3 w-3 mr-1" />
                  View Full Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredApplications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No applications found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
