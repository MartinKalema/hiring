import type React from "react"
import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "AIBOS - Job Application Portal",
  description: "Apply for open positions at AIBOS",
  icons: {
    icon: '/aibos-logo.png',
    shortcut: '/aibos-logo.png',
    apple: '/aibos-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined, // Use light mode (default)
        variables: {
          colorPrimary: '#0066cc', // AIBOS blue
          colorBackground: '#ffffff', // White background
          colorInputBackground: '#ffffff',
          colorInputText: '#1f2937',
          colorText: '#374151',
          colorTextSecondary: '#6b7280',
          borderRadius: '0.5rem',
        },
        elements: {
          card: 'bg-white shadow-xl',
          headerTitle: 'text-gray-900 font-mono',
          headerSubtitle: 'text-gray-600',
          socialButtonsBlockButton: 'border-gray-200 hover:bg-gray-50',
          formButtonPrimary: 'bg-[#0066cc] hover:bg-[#004c99] text-white',
          footerActionLink: 'text-[#0066cc] hover:text-[#004c99]',
        },
      }}
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body className="font-mono text-[0.85rem]">{children}</body>
      </html>
    </ClerkProvider>
  )
}
