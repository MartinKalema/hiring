'use client'

import { AgentState } from '@/infrastructure/ai/deepgram-voice-agent'

interface AIORbProps {
  state: AgentState
  size?: 'sm' | 'md' | 'lg'
}

export function AIOrb({ state, size = 'lg' }: AIORbProps) {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56',
  }

  const getOrbClass = () => {
    switch (state) {
      case 'speaking':
        return 'ai-orb-speaking'
      case 'thinking':
        return 'ai-orb animate-pulse'
      case 'listening':
        return 'ai-orb'
      default:
        return ''
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'speaking':
        return 'Speaking...'
      case 'thinking':
        return 'Thinking...'
      case 'listening':
        return 'Listening...'
      default:
        return 'Ready'
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Outer rings */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 opacity-20 blur-xl ai-orb-ring ${sizeClasses[size]}`}
          style={{ transform: 'scale(1.3)' }}
        />

        {/* Middle ring */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r from-violet-300 to-purple-400 opacity-30 blur-md ai-orb-ring ${sizeClasses[size]}`}
          style={{ transform: 'scale(1.15)', animationDelay: '0.5s' }}
        />

        {/* Main orb */}
        <div
          className={`relative rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 ${sizeClasses[size]} ${getOrbClass()}`}
        >
          {/* Inner highlight */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/30 to-transparent" />

          {/* Center pattern - like Braintrust AIR */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-3/4 h-3/4 text-white/50"
            >
              {/* Circular pattern */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="10 5"
                className={state === 'speaking' ? 'animate-spin' : ''}
                style={{ animationDuration: '10s' }}
              />
              <circle
                cx="50"
                cy="50"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="8 4"
                className={state === 'speaking' ? 'animate-spin' : ''}
                style={{ animationDuration: '8s', animationDirection: 'reverse' }}
              />
              <circle
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 3"
                className={state === 'speaking' ? 'animate-spin' : ''}
                style={{ animationDuration: '6s' }}
              />
              {/* Center dot */}
              <circle
                cx="50"
                cy="50"
                r="5"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Status text */}
      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
        {getStatusText()}
      </span>
    </div>
  )
}
