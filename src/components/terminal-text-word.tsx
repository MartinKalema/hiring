'use client'

import { useState, useEffect } from 'react'

interface TerminalTextWordProps {
  text: string
  typingSpeed?: number
  className?: string
}

export function TerminalTextWord({ text, typingSpeed = 250, className = '' }: TerminalTextWordProps) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    if (!text) {
      setDisplayedWords([])
      setIsTyping(false)
      return
    }

    const words = text.split(/\s+/)
    setDisplayedWords([])
    setIsTyping(true)
    let currentIndex = 0

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedWords(prev => [...prev, words[currentIndex]])
        currentIndex++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, typingSpeed)

    return () => clearInterval(interval)
  }, [text, typingSpeed])

  return (
    <div className={`font-mono relative ${className}`}>
      <span>{displayedWords.join(' ')}</span>
      {isTyping && (
        <span className="inline-block w-2 h-5 ml-1 bg-[#0066cc] animate-pulse align-middle"></span>
      )}
    </div>
  )
}
