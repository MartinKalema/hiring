'use client'

import { useState, useEffect } from 'react'

interface TerminalTextWordProps {
  text: string
  typingSpeed?: number
  className?: string
}

export function TerminalTextWord({ text, typingSpeed = 250, className = '' }: TerminalTextWordProps) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([])

  useEffect(() => {
    if (!text) {
      setDisplayedWords([])
      return
    }

    const words = text.split(/\s+/)
    setDisplayedWords([])
    let currentIndex = 0

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedWords(prev => [...prev, words[currentIndex]])
        currentIndex++
      } else {
        // Keep cursor blinking after typing is done
        clearInterval(interval)
      }
    }, typingSpeed)

    return () => clearInterval(interval)
  }, [text, typingSpeed])

  return (
    <div className={`font-mono relative ${className}`}>
      <span>{displayedWords.join(' ')}</span>
      {/* Show cursor while typing AND after typing is done (always blink when text is present) */}
      {text && (
        <span className="inline-block w-2 h-5 ml-1 bg-[#0066cc] animate-pulse align-middle"></span>
      )}
    </div>
  )
}
