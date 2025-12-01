import Link from "next/link"
import { MapPin, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Job } from "@/types/job"

interface JobCardProps {
  job: Job
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white">
        <h3 className="text-base font-bold text-aibos-blue mb-2">{job.title}</h3>

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex items-center text-gray-600">
            <MapPin size={14} className="mr-1" />
            <span className="text-xs">{job.location}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar size={14} className="mr-1" />
            <span className="text-xs">Posted {formatDistanceToNow(new Date(job.postedDate))} ago</span>
          </div>
        </div>

        <p className="text-gray-600 text-xs font-mono mb-3">{job.shortDescription}</p>

        <div className="text-aibos-blue font-medium text-xs">View details</div>
      </div>
    </Link>
  )
}
