'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DeepgramVoiceAgent,
  AgentState,
  ConnectionState,
  AgentOptions,
} from '@/lib/deepgram-voice-agent'

export interface UseVoiceAgentOptions {
  apiKey: string
  instructions: string
  voice?: string
  thinkModel?: string
  thinkProvider?: string
  language?: string
  greeting?: string
  speechSpeed?: number
  onTranscript?: (text: string, isFinal: boolean) => void
  onAgentUtterance?: (text: string) => void
  onAgentStoppedSpeaking?: () => void
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
  speechSpeed?: number
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
  updatePrompt: (additionalInstructions: string) => void
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

    const apiKey = overrides?.apiKey || options.apiKey
    const instructions = overrides?.instructions || options.instructions
    const voice = overrides?.voice || options.voice || 'aura-2-thalia-en'
    const thinkModel = overrides?.thinkModel || options.thinkModel || 'gpt-4o-mini'
    const thinkProvider = overrides?.thinkProvider || options.thinkProvider || 'open_ai'
    const language = overrides?.language || options.language || 'en'
    const greeting = overrides?.greeting || options.greeting
    const speechSpeed = overrides?.speechSpeed || options.speechSpeed || 1.0

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

    const agent = new DeepgramVoiceAgent(agentOptions, {
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
      onAudioPlaybackEnd: () => {
        options.onAgentStoppedSpeaking?.()
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
    // SDK doesn't support interrupt - disconnect and reconnect would be needed
    console.warn('[Voice Agent] Interrupt not supported with SDK implementation')
  }, [])

  const injectMessage = useCallback((text: string) => {
    agentRef.current?.injectMessage(text)
  }, [])

  const updatePrompt = useCallback((additionalInstructions: string) => {
    agentRef.current?.updatePrompt(additionalInstructions)
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
    updatePrompt,
  }
}
