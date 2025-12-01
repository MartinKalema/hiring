import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Careers at AIBOS",
  description: "Explore job opportunities at AIBOS",
}

export default function JobsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
