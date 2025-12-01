export interface Job {
  id: string
  title: string
  location: string
  team: string
  category: string
  employmentType: string
  roleType: string
  postedDate: string
  shortDescription: string
  description: string
  responsibilities: string[]
  basicQualifications: string[]
  preferredQualifications: string[]
  aboutTeam: string
  basePay?: string
  payRange?: string
  benefits?: string[]
  jobId?: string
  level?: string
}
