"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import confetti from "canvas-confetti"

export default function SuccessPage() {
  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#0066cc", "#0099ff", "#004c99"],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#0066cc", "#0099ff", "#004c99"],
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Tech-themed background elements */}
      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: 0.2,
        }}
      ></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-50/80 rounded-full opacity-50 transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-sky-50 rounded-full opacity-50 transform translate-x-1/2 translate-y-1/2"></div>

      {/* Tech elements */}
      <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-aibos-blue/10 rounded-md opacity-20 transform rotate-45"></div>
      <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-sky-100 rounded-md opacity-30"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-blue-100 opacity-20"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-blue-100 opacity-20"></div>

      <div className="container mx-auto px-4 py-12 flex-grow flex flex-col items-center justify-center relative z-10">
        <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 shadow-md text-center relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/80 rounded-full opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>

          <div className="mb-6 relative z-10">
            <Image src="/aibos-logo.png" alt="AIBOS Logo" width={120} height={120} className="mx-auto" />
          </div>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50/80 mb-6 relative z-10">
            <CheckCircle2 className="w-10 h-10 text-aibos-blue" />
          </div>

          <h1 className="text-2xl font-bold mb-4 text-gray-800 relative z-10">
            Application <span className="text-aibos-blue">Submitted!</span>
          </h1>

          <div className="space-y-4 mb-8 relative z-10">
            <p className="text-gray-600">
              Thank you for applying to join our team. We've received your application and will review it shortly.
            </p>
            <p className="text-gray-600">
              You'll receive a confirmation email with more details about the next steps in our hiring process.
            </p>
          </div>

          <div className="space-y-3 relative z-10">
            <Link href="/">
              <Button className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-white">Return to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
