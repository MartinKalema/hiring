import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Calendar, Building, DollarSign, Briefcase, Users } from "lucide-react"
import { jobsData } from "@/data/jobs"
import { notFound } from "next/navigation"

interface JobDetailPageProps {
  params: {
    id: string
  }
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const job = jobsData.find((job) => job.id === params.id)

  if (!job) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <Image src="/aibos-logo.png" alt="AIBOS Logo" width={70} height={70} className="object-contain" />
            </Link>
            <Link href="/jobs">
              <Button variant="ghost" className="text-sm text-gray-600 hover:text-aibos-blue hover:bg-blue-50">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Jobs
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Job header section with title and apply button - no card styling */}
        <div className="mb-6 pb-5 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">{job.title}</h1>
              <div className="text-sm text-gray-600">Job ID: {job.jobId || job.id}</div>
            </div>
            <Link href={`/apply?job=${job.id}`}>
              <Button className="bg-aibos-blue hover:bg-aibos-darkBlue text-sm">Apply Now</Button>
            </Link>
          </div>
        </div>

        {/* Main content with job description and details side by side - no card styling */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Job description - 2/3 width */}
          <div className="md:col-span-2">
            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Description</h2>
              <div className="prose text-gray-600 font-mono text-[0.8rem]">
                <p>{job.description}</p>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Key Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600 font-mono text-[0.8rem]">
                {job.responsibilities.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Basic Qualifications</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600 font-mono text-[0.8rem]">
                {job.basicQualifications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Preferred Qualifications</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600 font-mono text-[0.8rem]">
                {job.preferredQualifications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {job.benefits && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Benefits</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600 font-mono text-[0.8rem]">
                  {job.benefits.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-3">About the Team</h2>
              <div className="prose text-gray-600 font-mono text-[0.8rem]">
                <p>{job.aboutTeam}</p>
              </div>
            </section>
          </div>

          {/* Job details sidebar - 1/3 width - no card styling */}
          <div className="md:col-span-1">
            <div className="pl-0 md:pl-4 md:border-l border-gray-200">
              <h3 className="text-base font-bold text-gray-800 mb-5">Job Details</h3>

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-aibos-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-700">Location</p>
                    <p className="text-xs text-gray-600">{job.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building size={16} className="text-aibos-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-700">Team</p>
                    <p className="text-xs text-gray-600">{job.team}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase size={16} className="text-aibos-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-700">Job Type</p>
                    <p className="text-xs text-gray-600">{job.employmentType}</p>
                  </div>
                </div>

                {job.level && (
                  <div className="flex items-start gap-3">
                    <Users size={16} className="text-aibos-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-gray-700">Level</p>
                      <p className="text-xs text-gray-600">{job.level}</p>
                    </div>
                  </div>
                )}

                {job.basePay && (
                  <div className="flex items-start gap-3">
                    <DollarSign size={16} className="text-aibos-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-gray-700">Base Pay</p>
                      <p className="text-xs text-gray-600">{job.basePay}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-aibos-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-700">Posted Date</p>
                    <p className="text-xs text-gray-600">{new Date(job.postedDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link href={`/apply?job=${job.id}`}>
                  <Button className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-sm">Apply Now</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
