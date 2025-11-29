'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AIOrb } from '@/presentation/components/ai-orb'
import { useVoiceAgent } from '@/presentation/hooks/use-voice-agent'
import { AgentState } from '@/infrastructure/ai/deepgram-voice-agent'

type InterviewStage = 'setup' | 'ready' | 'joining' | 'active' | 'completed'

interface CandidateInfo {
  firstName: string
  lastName: string
  email: string
}

export default function InterviewPage() {
  const params = useParams()
  const token = params.token as string

  const [stage, setStage] = useState<InterviewStage>('setup')
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ speaker: 'ai' | 'user', text: string }>>([])
  const [currentAgentText, setCurrentAgentText] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // TODO: Replace with actual API key from backend
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || ''

  // Interview configuration - would come from API based on token
  const interviewConfig = {
    jobTitle: 'Senior Software Engineer',
    companyName: 'TechCorp',
    maxDuration: 9, // minutes
  }

  const instructions = `You are AIR, an AI interviewer conducting an interview for a ${interviewConfig.jobTitle} position at ${interviewConfig.companyName}.

Your role:
- Conduct a professional, conversational interview
- Ask behavioral and technical questions
- Probe deeper when answers are vague
- Keep track of time (max ${interviewConfig.maxDuration} minutes)
- Be warm but professional

Start by greeting the candidate by name, introduce yourself as AIR, state the role they're interviewing for, mention the time limit, and ask if they're ready to begin.

Candidate name: ${candidateInfo.firstName}

Interview focus areas:
1. Technical experience and skills
2. Problem-solving approach
3. Communication and collaboration
4. Career motivation`

  const voiceAgent = useVoiceAgent({
    apiKey: deepgramApiKey,
    instructions,
    voice: 'aura-asteria-en',
    thinkProvider: 'anthropic',
    thinkModel: 'claude-3-haiku-20240307',
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setTranscript(prev => [...prev, { speaker: 'user', text }])
      }
    },
    onAgentUtterance: (text) => {
      setCurrentAgentText(text)
      if (text.trim()) {
        setTranscript(prev => [...prev, { speaker: 'ai', text }])
      }
    },
    onError: (error) => {
      console.error('Interview error:', error)
    },
  })

  // Initialize camera and microphone
  useEffect(() => {
    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        mediaStreamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        setCameraReady(true)
        setMicReady(true)
      } catch (error) {
        console.error('Failed to access media devices:', error)
      }
    }

    if (stage === 'setup' || stage === 'ready') {
      initMedia()
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [stage])

  // Timer for interview duration
  useEffect(() => {
    if (stage === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [stage])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartInterview = async () => {
    setStage('joining')

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
      await voiceAgent.connect()
      setStage('active')
    } catch (error) {
      console.error('Failed to start interview:', error)
      setStage('ready')
    }
  }

  const handleEndInterview = () => {
    voiceAgent.disconnect()
    setStage('completed')
  }

  // Setup Screen
  if (stage === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AIR</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {candidateInfo.firstName || 'Your'} AI Interview for {interviewConfig.jobTitle}
              </h1>
              <p className="text-sm text-gray-500">{interviewConfig.companyName}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Form */}
            <div>
              <div className="card">
                <h2 className="text-xl font-semibold mb-2">Interview setup</h2>
                <h3 className="text-2xl font-bold mb-6">Final step before your AI interview</h3>

                <div className="mb-6">
                  <p className="font-medium mb-2">Before you begin:</p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Make sure your <strong>camera and microphone</strong> are working</li>
                    <li>• Find a quiet, well-lit space</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Your interview will be conducted in <strong>English</strong> and led by AIR, our AI-powered
                  interviewer. Responses are reviewed by the hiring team — AIR supports fair, consistent
                  evaluations but doesn&apos;t make hiring decisions.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setStage('ready')
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">First name</label>
                    <input
                      type="text"
                      className="input"
                      value={candidateInfo.firstName}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last name</label>
                    <input
                      type="text"
                      className="input"
                      value={candidateInfo.lastName}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={candidateInfo.email}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full justify-center"
                    disabled={!candidateInfo.firstName || !candidateInfo.lastName || !candidateInfo.email}
                  >
                    Continue to interview
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Video Preview */}
            <div>
              <div className="card">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white">Requesting camera access...</p>
                    </div>
                  )}
                </div>

                {/* Device selectors */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className={cameraReady ? 'text-green-600' : 'text-yellow-600'}>
                      {cameraReady ? 'Camera ready' : 'Checking camera...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className={micReady ? 'text-green-600' : 'text-yellow-600'}>
                      {micReady ? 'Microphone ready' : 'Checking microphone...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 mb-3">What to expect with your AI interview</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span>⏸</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pauses are Normal</p>
                    <p className="text-sm text-gray-500">Allow AIR time to process before the next question.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ready Screen
  if (stage === 'ready') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="card text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to begin, {candidateInfo.firstName}?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your interview will last up to {interviewConfig.maxDuration} minutes.
              Find a quiet spot and speak naturally.
            </p>

            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6 max-w-md mx-auto">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <button
              onClick={handleStartInterview}
              className="btn-primary"
              disabled={!cameraReady || !micReady}
            >
              Start AI Interview
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Joining Screen
  if (stage === 'joining') {
    return (
      <div className="interview-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium">Joining your AI Interview...</p>
        </div>
      </div>
    )
  }

  // Completed Screen
  if (stage === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Interview Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for taking the time to interview with us, {candidateInfo.firstName}.
            The hiring team will review your responses and be in touch soon.
          </p>
          <p className="text-sm text-gray-500">
            Duration: {formatTime(elapsedTime)}
          </p>
        </div>
      </div>
    )
  }

  // Active Interview Screen
  return (
    <div className="interview-gradient min-h-screen flex flex-col">
      {/* Header - AI message */}
      <div className="flex-shrink-0 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="transcript-text animate-fade-in">
            {currentAgentText || 'Welcome to your interview...'}
          </p>
        </div>
      </div>

      {/* Center - AI Orb */}
      <div className="flex-1 flex items-center justify-center">
        <AIOrb state={voiceAgent.agentState} size="lg" />
      </div>

      {/* Bottom - Controls and Video */}
      <div className="flex-shrink-0 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Playback controls - like Braintrust AIR */}
          <div className="flex justify-center mb-6">
            <div className="video-controls flex items-center gap-4 px-6 py-3">
              <button
                onClick={() => voiceAgent.interrupt()}
                className="text-white/80 hover:text-white"
                title="Interrupt"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {voiceAgent.isSpeaking ? (
                <button
                  onClick={() => voiceAgent.interrupt()}
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                </button>
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${voiceAgent.isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                </div>
              )}

              <button className="text-white/80 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              {/* Timer */}
              <span className="text-white/60 text-sm ml-4">
                {formatTime(elapsedTime)} / {formatTime(interviewConfig.maxDuration * 60)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Branding */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">AIR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {candidateInfo.firstName} × {interviewConfig.companyName}
              </span>
            </div>

            {/* Candidate video + controls */}
            <div className="flex items-center gap-4">
              {/* Mini video preview */}
              <div className="candidate-video w-48 h-32">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* End interview button */}
              <button
                onClick={handleEndInterview}
                className="btn-danger"
              >
                End interview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
