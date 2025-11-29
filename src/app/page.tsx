import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId } = await auth()

  // If logged in, redirect to dashboard
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">AIR</span>
          </div>
          <span className="font-semibold text-xl">AIR</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
          >
            Sign in
          </Link>
          <Link href="/sign-up" className="btn-primary">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
          AI-Powered Technical Interviews
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Conduct real-time conversational interviews with AI. Screen more candidates,
          faster, with consistent evaluations.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Link href="/sign-up" className="btn-primary text-lg px-8 py-4">
            Start Free Trial
          </Link>
          <Link href="#demo" className="btn-secondary text-lg px-8 py-4">
            Watch Demo
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 text-left mt-20">
          <div className="card">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Conversational AI</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time voice conversations with adaptive follow-up questions.
              Not scripted questions — true dialogue.
            </p>
          </div>

          <div className="card">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Probing</h3>
            <p className="text-gray-600 dark:text-gray-400">
              When answers are vague, AI digs deeper. Extracts specific examples
              and validates experience claims.
            </p>
          </div>

          <div className="card">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Structured Evaluation</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get consistent scorecards with evidence. Compare candidates fairly
              across standardized competencies.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create Interview', desc: 'Paste your job description, AI configures the interview' },
              { step: '2', title: 'Share Link', desc: 'Send interview links to candidates' },
              { step: '3', title: 'AI Interviews', desc: 'Candidates have a real-time conversation with AI' },
              { step: '4', title: 'Review Results', desc: 'Get transcripts, scores, and recommendations' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-24 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 dark:text-gray-400">
          <p>Built for tech recruiting. Powered by Claude + Deepgram.</p>
        </div>
      </footer>
    </div>
  )
}
