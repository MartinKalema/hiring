import { MapPin, Calendar, Building } from "lucide-react"
import type { Job } from "@/types/job"

interface JobDetailHeaderProps {
  job: Job
}

export default function JobDetailHeader({ job }: JobDetailHeaderProps) {
  return (
    <div className="p-8 border-b border-gray-200">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{job.title}</h1>

      <div className="flex flex-wrap gap-6 mb-6">
        <div className="flex items-center text-gray-600">
          <MapPin size={18} className="mr-2 text-aibos-blue" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Calendar size={18} className="mr-2 text-aibos-blue" />
          <span>Posted on {new Date(job.postedDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Building size={18} className="mr-2 text-aibos-blue" />
          <span>{job.team}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="bg-blue-50 text-aibos-blue px-3 py-1 rounded-full text-sm">{job.employmentType}</span>
        <span className="bg-blue-50 text-aibos-blue px-3 py-1 rounded-full text-sm">{job.category}</span>
        <span className="bg-blue-50 text-aibos-blue px-3 py-1 rounded-full text-sm">{job.roleType}</span>
      </div>
    </div>
  )
}
