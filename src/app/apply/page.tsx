"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, CheckCircle2 } from "lucide-react"
import { jobsData } from "@/data/jobs"

const formSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  position: z.string().min(1, {
    message: "Please select a position.",
  }),
  experience: z.string().min(1, {
    message: "Please select your experience level.",
  }),
  coverLetter: z.string().min(50, {
    message: "Cover letter must be at least 50 characters.",
  }),
})

export default function ApplyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get("job")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [selectedJob, setSelectedJob] = useState<(typeof jobsData)[0] | null>(null)

  // Find the selected job if jobId is provided
  useEffect(() => {
    if (jobId) {
      const job = jobsData.find((job) => job.id === jobId)
      if (job) {
        setSelectedJob(job)
      }
    }
  }, [jobId])

  // Check if user has already applied
  useEffect(() => {
    const appliedStatus = localStorage.getItem("aibos-application-submitted")
    if (appliedStatus === "true") {
      setHasApplied(true)
    }
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      position: selectedJob?.id || "",
      experience: "",
      coverLetter: "",
    },
  })

  // Update position when selectedJob changes
  useEffect(() => {
    if (selectedJob) {
      form.setValue("position", selectedJob.id)
    }
  }, [selectedJob, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (hasApplied) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Store application status in localStorage
    localStorage.setItem("aibos-application-submitted", "true")

    // Redirect to success page
    router.push("/apply/success")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  if (hasApplied) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Tech-themed background elements */}
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            opacity: 0.2,
          }}
        ></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-50/80 rounded-full opacity-70 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-sky-50 rounded-full opacity-70 transform translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-blue-100 opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-blue-100 opacity-20"></div>

        <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 shadow-md text-center relative z-10">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-aibos-blue" />
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Application Already Submitted</h1>
          <p className="text-gray-600 mb-6">
            You have already submitted an application. Multiple submissions are not allowed.
          </p>
          <Link href="/jobs">
            <Button className="bg-aibos-blue hover:bg-aibos-darkBlue text-white">Return to Jobs</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Tech-themed background elements */}
      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: 0.2,
        }}
      ></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/80 rounded-full opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-50 rounded-full opacity-50 transform -translate-x-1/3 translate-y-1/3"></div>

      {/* Tech elements */}
      <div className="absolute top-1/3 right-20 w-12 h-12 bg-aibos-blue/10 rounded-md opacity-20 transform rotate-45"></div>
      <div className="absolute bottom-1/4 left-20 w-16 h-16 bg-sky-100 rounded-md opacity-20 transform -rotate-12"></div>
      <div className="absolute top-1/4 left-1/3 w-8 h-8 bg-aibos-blue/10 rounded-full opacity-20"></div>
      <div className="absolute top-40 right-40 w-6 h-6 rounded-md bg-blue-200 opacity-30 transform rotate-12"></div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <header className="flex justify-between items-center mb-8">
          <Link href="/" className="flex items-center">
            <Image src="/aibos-logo.png" alt="AIBOS Logo" width={80} height={80} className="object-contain" />
          </Link>
          <Link href={selectedJob ? `/jobs/${selectedJob.id}` : "/jobs"}>
            <Button variant="ghost" className="text-gray-600 hover:text-aibos-blue hover:bg-blue-50">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to {selectedJob ? "Job Details" : "Jobs"}
            </Button>
          </Link>
        </header>

        <main className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <div className="inline-block relative mb-4">
              <div className="absolute inset-0 bg-aibos-blue/10 rounded-full transform rotate-45 scale-150 opacity-30"></div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 relative z-10">
                Job <span className="text-aibos-blue">Application</span>
              </h1>
            </div>
            {selectedJob ? (
              <p className="text-gray-600">
                You are applying for: <span className="font-medium">{selectedJob.title}</span>
              </p>
            ) : (
              <p className="text-gray-600">Fill out the form below to apply for a position at AIBOS.</p>
            )}
          </div>

          <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-md relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/80 rounded-full opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            {...field}
                            className="border-gray-300 focus-visible:ring-aibos-blue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john.doe@example.com"
                            {...field}
                            className="border-gray-300 focus-visible:ring-aibos-blue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(123) 456-7890"
                            {...field}
                            className="border-gray-300 focus-visible:ring-aibos-blue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Position</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:ring-aibos-blue">
                              <SelectValue placeholder="Select a position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {jobsData.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:ring-aibos-blue">
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                          <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                          <SelectItem value="senior">Senior Level (6-9 years)</SelectItem>
                          <SelectItem value="expert">Expert Level (10+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label
                    htmlFor="resume"
                    className="text-sm font-medium text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Resume/CV
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-aibos-lightBlue transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-20 h-20 bg-blue-50/80 rounded-full opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
                    <input
                      type="file"
                      id="resume"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <div className="relative z-10 pointer-events-none">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-1">
                        {resumeFile ? resumeFile.name : "Click to upload your resume (PDF, DOC, DOCX)"}
                      </p>
                      <p className="text-xs text-gray-400">Max file size: 5MB</p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="coverLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Cover Letter</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us why you're interested in this position and what makes you a great candidate..."
                          className="min-h-[150px] border-gray-300 focus-visible:ring-aibos-blue"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-white"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  )
}
