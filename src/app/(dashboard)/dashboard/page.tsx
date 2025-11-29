'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

export default function DashboardPage() {
  const { user } = useUser()

  // Mock data - will come from database
  const stats = {
    totalInterviews: 0,
    activeFlows: 0,
    avgScore: '--',
    thisWeek: 0,
  }

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName || 'there'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your interviews.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Total Interviews</p>
          <p className="text-3xl font-bold">{stats.totalInterviews}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Active Interview Flows</p>
          <p className="text-3xl font-bold">{stats.activeFlows}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Average Score</p>
          <p className="text-3xl font-bold">{stats.avgScore}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">This Week</p>
          <p className="text-3xl font-bold">{stats.thisWeek}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/interviews/new" className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Interview
          </Link>
          <Link href="/interviews" className="btn-secondary">
            View All Interviews
          </Link>
        </div>
      </div>

      {/* Empty state */}
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No interviews yet</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Create your first AI interview to start screening candidates.
        </p>
        <Link href="/interviews/new" className="btn-primary">
          Create Your First Interview
        </Link>
      </div>
    </div>
  )
}
