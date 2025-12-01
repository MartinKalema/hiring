"use client"

import { useState, useEffect } from "react"

interface TerminalTextProps {
  text: string
  typingSpeed?: number
  resetInterval?: number
}

export function TerminalText({ text, typingSpeed = 100, resetInterval = 5000 }: TerminalTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    let typingTimer: NodeJS.Timeout
    let resetTimer: NodeJS.Timeout

    if (isTyping && currentIndex < text.length) {
      // Type the next character
      typingTimer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, typingSpeed)
    } else if (currentIndex >= text.length) {
      // Finished typing, wait for reset
      resetTimer = setTimeout(() => {
        setDisplayedText("")
        setCurrentIndex(0)
      }, resetInterval)
    }

    return () => {
      clearTimeout(typingTimer)
      clearTimeout(resetTimer)
    }
  }, [text, currentIndex, isTyping, typingSpeed, resetInterval])

  return (
    <div className="font-mono text-sm text-gray-700 relative">
      <pre className="inline">{displayedText}</pre>
      <span className="inline-block w-2 h-5 ml-0.5 bg-aibos-blue absolute bottom-0"></span>
    </div>
  )
}
