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
  onTranscript?: (text: string, isFinal: boolean) => void
  onAgentUtterance?: (text: string) => void
  onError?: (error: Error) => void
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
  connect: () => Promise<void>
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

  const connect = useCallback(async () => {
    if (agentRef.current) {
      agentRef.current.disconnect()
    }

    const agentOptions: AgentOptions = {
      instructions: options.instructions,
      voice: options.voice || 'aura-asteria-en',
      thinkModel: options.thinkModel || 'claude-3-haiku-20240307',
      thinkProvider: options.thinkProvider || 'anthropic',
    }

    const agent = new DeepgramVoiceAgent(options.apiKey, agentOptions, {
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
