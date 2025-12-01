"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import JobFilters, { type FilterOption } from "@/components/job-filters"
import JobCard from "@/components/job-card"
import CategoryHeader from "@/components/category-header"
import { jobsData } from "@/data/jobs"
import type { Job } from "@/types/job"

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(jobsData)
  const [sortOption, setSortOption] = useState("relevant")

  // Get total job count
  const totalJobs = jobsData.length

  // Filter jobs based on selected filters and search query
  useEffect(() => {
    let result = [...jobsData]

    // Apply search filter if there's a search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.shortDescription.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query),
      )
    }

    // Apply selected filters
    if (selectedFilters.length > 0) {
      // Group filters by type
      const filtersByType = selectedFilters.reduce<Record<string, string[]>>((acc, filter) => {
        if (!acc[filter.type]) {
          acc[filter.type] = []
        }
        acc[filter.type].push(filter.id)
        return acc
      }, {})

      // Apply each filter type
      result = result.filter((job) => {
        // Check each filter type
        return Object.entries(filtersByType).every(([type, values]) => {
          switch (type) {
            case "location":
              // Match if job location contains any of the selected locations
              return values.some((value) => {
                if (value === "kampala") return job.location.toLowerCase().includes("kampala")
                if (value === "kyoto") return job.location.toLowerCase().includes("kyoto")
                return false
              })
            case "employmentType":
              // Match employment type
              return values.some((value) => {
                const jobType = job.employmentType.toLowerCase().replace(" ", "-")
                return value === jobType
              })
            case "category":
              // Match category
              return values.some((value) => {
                const jobCategory = job.category.toLowerCase().replace(" ", "-")
                return value === jobCategory
              })
            case "team":
              // Match team - handle the new team options
              return values.some((value) => {
                const teamName = job.team.toLowerCase()
                if (value === "human-resources") return teamName === "human resources"
                if (value === "operations") return teamName === "operations"
                if (value === "ai-research") return teamName === "ai research"
                return value === teamName
              })
            case "roleType":
              // Match role type
              return values.some((value) => {
                const roleType = job.roleType.toLowerCase().replace(" ", "-")
                return value === roleType
              })
            default:
              return true
          }
        })
      })
    }

    // Apply sorting
    switch (sortOption) {
      case "newest":
        result.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
        break
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "relevant":
      default:
        // Default sorting (by relevance) - we'll keep the original order
        break
    }

    setFilteredJobs(result)
  }, [searchQuery, selectedFilters, sortOption])

  const handleFilterChange = (filters: FilterOption[]) => {
    console.log("Filters changed:", filters)
    setSelectedFilters(filters)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // The search is already applied via the useEffect
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Category header with job count */}
      <CategoryHeader
        category="Software Development"
        jobCount={totalJobs}
        description="Technology is in everything we do. We rely on it to provide the excellence our customers deserve. And that's why our engineers are crucial to every aspect of our operations."
        stacked={true}
      />

      {/* Main content area */}
      <div className="container mx-auto px-4 py-6">
        {/* Two-column layout for filters and results */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Filters sidebar - 1/4 width */}
          <div className="md:col-span-1">
            <JobFilters onFilterChange={handleFilterChange} initialSelectedFilters={selectedFilters} />
          </div>

          {/* Job listings column - 3/4 width */}
          <div className="md:col-span-3">
            {/* Search bar at the top of job listings column */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-5">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search for jobs by title or keyword"
                  className="pl-10 bg-white border h-10 text-sm text-gray-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="bg-aibos-blue hover:bg-aibos-darkBlue h-10 px-4 text-sm">
                Search
              </Button>
            </form>

            {/* Sort dropdown */}
            <div className="flex justify-between items-center mb-5">
              <div className="text-xs text-gray-600">
                {filteredJobs.length} {filteredJobs.length === 1 ? "result" : "results"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Sort by:</span>
                <select
                  className="text-xs border border-gray-300 rounded-md px-2 py-1"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="relevant">Most relevant</option>
                  <option value="newest">Newest</option>
                  <option value="title">Job title (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Job listings */}
            {filteredJobs.length > 0 ? (
              <div className="flex flex-col gap-5">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">No jobs match your search criteria.</p>
                <p className="text-xs text-gray-500 mt-2">Try adjusting your filters or search query.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
