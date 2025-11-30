'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DeepgramVoiceAgent,
  AgentState,
  ConnectionState,
  AgentOptions,
} from '@/infrastructure/ai/deepgram-voice-agent'

export interface UseVoiceAgentOptions {
  apiKey: string
  instructions: string
  voice?: string
  thinkModel?: string
  thinkProvider?: string
  language?: string
  greeting?: string
  speechSpeed?: number  // Playback speed (1.0 = normal, 1.2 = 20% faster)
  onTranscript?: (text: string, isFinal: boolean) => void
  onAgentUtterance?: (text: string) => void
  onError?: (error: Error) => void
}

export interface ConnectOptions {
  apiKey?: string
  instructions?: string
  voice?: string
  thinkModel?: string
  thinkProvider?: string
  language?: string
  greeting?: string
  speechSpeed?: number  // Playback speed (1.0 = normal, 1.2 = 20% faster)
}

export interface UseVoiceAgentReturn {
  // State
  connectionState: ConnectionState
  agentState: AgentState
  isConnected: boolean
  isListening: boolean
  isSpeaking: boolean
  isThinking: boolean

  // Transcript
  currentTranscript: string
  agentText: string

  // Actions
  connect: (overrides?: ConnectOptions) => Promise<void>
  disconnect: () => void
  interrupt: () => void
  injectMessage: (text: string) => void
}

export function useVoiceAgent(options: UseVoiceAgentOptions): UseVoiceAgentReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [agentState, setAgentState] = useState<AgentState>('idle')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [agentText, setAgentText] = useState('')

  const agentRef = useRef<DeepgramVoiceAgent | null>(null)

  const connect = useCallback(async (overrides?: ConnectOptions) => {
    if (agentRef.current) {
      agentRef.current.disconnect()
    }

    // Use overrides if provided, otherwise fall back to hook options
    // Defaults match Deepgram Voice Agent documentation
    const apiKey = overrides?.apiKey || options.apiKey
    const instructions = overrides?.instructions || options.instructions
    const voice = overrides?.voice || options.voice || 'aura-2-thalia-en'  // Per docs
    const thinkModel = overrides?.thinkModel || options.thinkModel || 'gpt-4o-mini'  // Per docs
    const thinkProvider = overrides?.thinkProvider || options.thinkProvider || 'open_ai'  // Per docs
    const language = overrides?.language || options.language || 'en'  // Per docs
    const greeting = overrides?.greeting || options.greeting
    const speechSpeed = overrides?.speechSpeed || options.speechSpeed || 1.15  // Default 15% faster

    if (!apiKey) {
      const error = new Error('API key is required to connect')
      console.error('Voice agent error:', error)
      options.onError?.(error)
      return
    }

    const agentOptions: AgentOptions = {
      instructions,
      voice,
      thinkModel,
      thinkProvider,
      language,
      greeting,
      speechSpeed,
    }

    const agent = new DeepgramVoiceAgent(apiKey, agentOptions, {
      onConnectionStateChange: (state) => {
        setConnectionState(state)
      },
      onAgentStateChange: (state) => {
        setAgentState(state)
      },
      onUserTranscript: (transcript, isFinal) => {
        setCurrentTranscript(transcript)
        options.onTranscript?.(transcript, isFinal)
      },
      onAgentUtterance: (text) => {
        setAgentText(text)
        options.onAgentUtterance?.(text)
      },
      onError: (error) => {
        console.error('Voice agent error:', error)
        options.onError?.(error)
      },
    })

    agentRef.current = agent
    await agent.connect()
  }, [options])

  const disconnect = useCallback(() => {
    if (agentRef.current) {
      agentRef.current.disconnect()
      agentRef.current = null
    }
    setConnectionState('disconnected')
    setAgentState('idle')
  }, [])

  const interrupt = useCallback(() => {
    agentRef.current?.interrupt()
  }, [])

  const injectMessage = useCallback((text: string) => {
    agentRef.current?.injectMessage(text)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agentRef.current) {
        agentRef.current.disconnect()
      }
    }
  }, [])

  return {
    connectionState,
    agentState,
    isConnected: connectionState === 'connected',
    isListening: agentState === 'listening',
    isSpeaking: agentState === 'speaking',
    isThinking: agentState === 'thinking',
    currentTranscript,
    agentText,
    connect,
    disconnect,
    interrupt,
    injectMessage,
  }
}
