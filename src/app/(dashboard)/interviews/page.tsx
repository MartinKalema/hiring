'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Interview {
  id: string
  name: string
  jobTitle: string
  status: 'active' | 'paused' | 'draft'
  candidateCount: number
  createdAt: string
}

export default function InterviewsPage() {
  // Mock data - will come from database
  const [interviews] = useState<Interview[]>([])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Interviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your AI interview flows
          </p>
        </div>
        <Link href="/interviews/new" className="btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Interview
        </Link>
      </div>

      {/* Interview list or empty state */}
      {interviews.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No interviews created</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by creating your first AI interview flow.
          </p>
          <Link href="/interviews/new" className="btn-primary">
            Create Interview
          </Link>
        </div>
      ) : (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Job Title</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Candidates</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((interview) => (
                <tr key={interview.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 font-medium">{interview.name}</td>
                  <td className="py-4 text-gray-600 dark:text-gray-400">{interview.jobTitle}</td>
                  <td className="py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      interview.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : interview.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {interview.status}
                    </span>
                  </td>
                  <td className="py-4">{interview.candidateCount}</td>
                  <td className="py-4 text-gray-600 dark:text-gray-400">
                    {new Date(interview.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4">
                    <Link
                      href={`/interviews/${interview.id}`}
                      className="text-violet-600 hover:text-violet-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
