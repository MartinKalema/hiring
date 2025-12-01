import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In - AIBOS',
  description: 'Sign in to your AIBOS account',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden relative flex items-center justify-center px-4">
      {/* AIBOS Background decorative elements */}
      <div className="absolute top-20 right-40 w-80 h-80 rounded-full bg-[#0066cc]/10 opacity-50 blur-3xl"></div>
      <div className="absolute top-40 left-20 w-80 h-80 rounded-full bg-sky-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-20 left-40 w-60 h-60 rounded-full bg-[#0099ff]/10 opacity-30 blur-3xl"></div>

      {/* Grid pattern */}
      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: 0.3,
        }}
      ></div>

      {/* Decorative circles */}
      <div className="absolute top-40 right-1/4 w-6 h-6 rounded-full bg-[#0066cc]/30 opacity-20"></div>
      <div className="absolute top-60 left-1/4 w-4 h-4 rounded-full bg-blue-500 opacity-30"></div>

      <div className="relative z-10">
        <SignIn />
      </div>
    </div>
  )
}
