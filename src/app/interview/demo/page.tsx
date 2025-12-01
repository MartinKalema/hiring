'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useVoiceAgent } from '@/hooks/use-voice-agent'

type InterviewStage = 'welcome' | 'setup' | 'joining' | 'active' | 'completed'

interface CandidateInfo {
  firstName: string
  lastName: string
  email: string
}

interface VoiceConfig {
  apiKey: string
  instructions: string
  voice: string
  speechSpeed?: number
  thinkModel: string
  thinkProvider: string
}


export default function DemoInterviewPage() {
  const [stage, setStage] = useState<InterviewStage>('welcome')
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    firstName: 'Demo',
    lastName: 'Candidate',
    email: 'demo@example.com',
  })
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[], mics: MediaDeviceInfo[] }>({ cameras: [], mics: [] })
  const [displayedText, setDisplayedText] = useState('')
  const [isRevealingText, setIsRevealingText] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timeCheckpointsTriggered = useRef<Set<number>>(new Set())

  // Refs for word-by-word text reveal
  const targetTextRef = useRef('')
  const wordIndexRef = useRef(0)
  const wordRevealIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Demo interview configuration
  const interviewConfig = {
    jobTitle: 'Senior Software Engineer',
    companyName: 'Demo Company',
    maxDuration: 9,
    language: 'English',
  }

  // Build instructions for the AI interviewer
  const buildInstructions = useCallback(() => {
    return `You are AIR, an AI interviewer conducting a demo interview for a ${interviewConfig.jobTitle} position at ${interviewConfig.companyName}.

Your role:
- Conduct a professional, conversational interview
- Ask behavioral and technical questions relevant to the role
- When answers are vague, probe deeper using the STAR method (Situation, Task, Action, Result)
- Be warm, encouraging, but professional
- Listen carefully and ask relevant follow-up questions

Interview structure:
1. Start with a warm greeting, introduce yourself as AIR
2. Ask about their background and interest in the role
3. Ask 2-3 behavioral questions about relevant competencies
4. For each answer, probe deeper if needed
5. Close with thanks

Candidate name: ${candidateInfo.firstName} ${candidateInfo.lastName}
Maximum duration: ${interviewConfig.maxDuration} minutes

Start by greeting ${candidateInfo.firstName}, introducing yourself as AIR, and asking if they're ready to get started.`
  }, [candidateInfo.firstName, candidateInfo.lastName])

  // Word-by-word text reveal - shows text progressively as the agent speaks
  const startWordReveal = useCallback((text: string) => {
    // Clear any existing interval
    if (wordRevealIntervalRef.current) {
      clearInterval(wordRevealIntervalRef.current)
    }

    // Store the full text and reset index
    targetTextRef.current = text
    wordIndexRef.current = 0
    setIsRevealingText(true)
    setDisplayedText('')

    // Split text into words
    const words = text.split(/\s+/)
    if (words.length === 0) {
      setDisplayedText(text)
      setIsRevealingText(false)
      return
    }

    // Reveal words at ~240 words per minute (250ms per word)
    const msPerWord = 250

    wordRevealIntervalRef.current = setInterval(() => {
      wordIndexRef.current++
      const currentWords = words.slice(0, wordIndexRef.current)
      setDisplayedText(currentWords.join(' '))

      // Stop when all words are revealed
      if (wordIndexRef.current >= words.length) {
        if (wordRevealIntervalRef.current) {
          clearInterval(wordRevealIntervalRef.current)
          wordRevealIntervalRef.current = null
        }
        setIsRevealingText(false)
      }
    }, msPerWord)
  }, [])

  const stopWordReveal = useCallback(() => {
    if (wordRevealIntervalRef.current) {
      clearInterval(wordRevealIntervalRef.current)
      wordRevealIntervalRef.current = null
    }
    // Show full text when stopping
    if (targetTextRef.current) {
      setDisplayedText(targetTextRef.current)
    }
    setIsRevealingText(false)
  }, [])

  // Voice agent hook - connected to real Deepgram API
  const voiceAgent = useVoiceAgent({
    apiKey: voiceConfig?.apiKey || '',
    instructions: voiceConfig?.instructions || buildInstructions(),
    voice: voiceConfig?.voice || 'aura-asteria-en',
    speechSpeed: voiceConfig?.speechSpeed || 1.0,
    thinkProvider: voiceConfig?.thinkProvider || 'anthropic',
    thinkModel: voiceConfig?.thinkModel || 'claude-3-5-sonnet',
    onTranscript: () => {
      // Transcript handling removed for cleaner demo UI
    },
    onAgentUtterance: (text) => {
      // Start word-by-word reveal
      startWordReveal(text)
    },
    onAgentStoppedSpeaking: () => {
      // Stop word reveal and show full text when agent stops
      stopWordReveal()
    },
    onError: (error) => {
      console.error('Demo interview error:', error)
    },
  })

  // Enumerate available devices
  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const cameras = deviceList.filter(d => d.kind === 'videoinput')
        const mics = deviceList.filter(d => d.kind === 'audioinput')
        setDevices({ cameras, mics })
        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId)
        if (mics.length > 0) setSelectedMic(mics[0].deviceId)
      } catch (error) {
        console.error('Failed to enumerate devices:', error)
      }
    }

    if (stage === 'setup') {
      getDevices()
    }
  }, [stage])

  // Initialize camera and microphone
  useEffect(() => {
    async function initMedia() {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
        }

        // Only request video for preview - the voice agent handles audio separately
        // Having two active audio streams can interfere with echo cancellation
        const constraints: MediaStreamConstraints = {
          video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
          audio: false,  // Voice agent manages its own audio stream
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        mediaStreamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        setCameraReady(true)
        setMicReady(true)
      } catch (error) {
        console.error('Failed to access media devices:', error)
        // For demo, allow continuing even without camera
        setCameraReady(true)
        setMicReady(true)
      }
    }

    if (stage === 'setup' || stage === 'active') {
      initMedia()
    }

    return () => {
      if (mediaStreamRef.current && stage !== 'active') {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [stage, selectedCamera, selectedMic])

  // Timer for interview duration with time-based checkpoints
  useEffect(() => {
    if (stage === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1
          const maxSeconds = interviewConfig.maxDuration * 60

          // Define time checkpoints (in seconds)
          const checkpoints = {
            halfway: Math.floor(maxSeconds * 0.5),      // 50% - 4.5 min for 9 min interview
            threeQuarters: Math.floor(maxSeconds * 0.75), // 75% - 6.75 min
            twoMinLeft: maxSeconds - 120,                 // 2 minutes remaining
            oneMinLeft: maxSeconds - 60,                  // 1 minute remaining
            thirtySecLeft: maxSeconds - 30,               // 30 seconds remaining
          }

          if (newTime === checkpoints.halfway && !timeCheckpointsTriggered.current.has(checkpoints.halfway)) {
            timeCheckpointsTriggered.current.add(checkpoints.halfway)
            console.log('[Interview] 50% checkpoint')
          }

          if (newTime === checkpoints.threeQuarters && !timeCheckpointsTriggered.current.has(checkpoints.threeQuarters)) {
            timeCheckpointsTriggered.current.add(checkpoints.threeQuarters)
            console.log('[Interview] 75% checkpoint')
          }

          if (newTime === checkpoints.twoMinLeft && !timeCheckpointsTriggered.current.has(checkpoints.twoMinLeft)) {
            timeCheckpointsTriggered.current.add(checkpoints.twoMinLeft)
            console.log('[Interview] 2 min remaining')
          }

          if (newTime === checkpoints.oneMinLeft && !timeCheckpointsTriggered.current.has(checkpoints.oneMinLeft)) {
            timeCheckpointsTriggered.current.add(checkpoints.oneMinLeft)
            console.log('[Interview] 1 min remaining')
          }

          if (newTime >= maxSeconds) {
            handleEndInterview()
          }

          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [stage, interviewConfig.maxDuration, voiceAgent])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleContinueToSetup = (e: React.FormEvent) => {
    e.preventDefault()
    setStage('setup')
  }

  const handleStartInterview = async () => {
    setStage('joining')

    try {
      // Fetch voice configuration from demo API
      const response = await fetch('/api/interview/demo/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateFirstName: candidateInfo.firstName,
          candidateLastName: candidateInfo.lastName,
          candidateEmail: candidateInfo.email,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Failed to get voice config:', data.error)
        setStage('setup')
        return
      }

      const data = await response.json()

      // Update voice config state for UI
      setVoiceConfig({
        apiKey: data.apiKey,
        instructions: data.instructions,
        voice: data.config.voice,
        speechSpeed: data.config.speechSpeed,
        thinkModel: data.config.thinkModel,
        thinkProvider: data.config.thinkProvider,
      })

      await voiceAgent.connect({
        apiKey: data.apiKey,
        instructions: data.instructions,
        voice: data.config.voice,
        speechSpeed: data.config.speechSpeed,
        thinkModel: data.config.thinkModel,
        thinkProvider: data.config.thinkProvider,
        language: data.config.language,
        greeting: data.config.greeting,
      })
      setStage('active')
    } catch (error) {
      console.error('Failed to start demo interview:', error)
      setStage('setup')
    }
  }

  const handleEndInterview = () => {
    // Disconnect from voice agent
    voiceAgent.disconnect()

    setShowCompletionModal(true)
    setTimeout(() => {
      setStage('completed')
    }, 100)
  }

  // Demo Banner Component
  const DemoBanner = () => (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-amber-900 py-2 px-4 text-center text-sm font-medium z-50">
      Demo Mode - This is a preview of the candidate interview experience.{' '}
      <a href="/interviews/new" className="underline hover:no-underline">
        Create a real interview
      </a>
    </div>
  )

  // Welcome Screen
  if (stage === 'welcome') {
    return (
      <div className="min-h-screen bg-white overflow-hidden relative">
        {/* AIBOS Background decorative elements */}
        <div className="absolute top-20 right-40 w-80 h-80 rounded-full bg-[#0066cc]/10 opacity-50 blur-3xl"></div>
        <div className="absolute top-40 left-20 w-80 h-80 rounded-full bg-sky-100 opacity-40 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-[#0099ff]/10 opacity-30 blur-3xl"></div>

        {/* Grid pattern */}
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            opacity: 0.3,
          }}
        ></div>

        {/* Header */}
        <header className="relative z-10 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/aibos-logo.png" alt="AIBOS" width={60} height={60} className="object-contain" />
            <span className="ml-2 px-2.5 py-0.5 bg-blue-50 text-[#0066cc] text-xs rounded-full border border-[#0066cc]/20">Demo Mode</span>
          </div>
          <a href="/" className="text-sm text-gray-600 hover:text-[#0066cc] transition-colors">
            ← Back to Home
          </a>
        </header>

        <div className="grid lg:grid-cols-2 min-h-[calc(100vh-100px)]">
          {/* Left side - Full height decorative area */}
          <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#0066cc]/5 to-blue-50/30">
            {/* Background decorative elements */}
            <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[#0066cc]/5 opacity-60"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-blue-100 opacity-40"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-2 border-blue-100 opacity-30"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-blue-100 opacity-30"></div>
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center p-8 lg:p-12 relative z-10">
            <div className="w-full max-w-md">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 font-mono">
                Welcome to your AI interview
              </h1>

              <p className="text-gray-600 mb-8 text-sm">
                Enter your details to begin. The interview will be conducted by our AI interviewer for the <strong>{interviewConfig.jobTitle}</strong> position.
              </p>

              <form onSubmit={handleContinueToSetup} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First name<span className="text-[#0066cc]">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 focus:border-[#0066cc] transition-colors"
                      value={candidateInfo.firstName}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last name<span className="text-[#0066cc]">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 focus:border-[#0066cc] transition-colors"
                      value={candidateInfo.lastName}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email<span className="text-[#0066cc]">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 focus:border-[#0066cc] transition-colors"
                    value={candidateInfo.email}
                    onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0066cc] hover:bg-[#004c99] text-white px-6 py-3 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!candidateInfo.firstName || !candidateInfo.lastName || !candidateInfo.email}
                >
                  Continue to Setup
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-[#0066cc] hover:underline">Privacy Policy</a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Setup Screen
  if (stage === 'setup') {
    return (
      <div className="interview-page min-h-screen pt-10">
        <DemoBanner />
        <header className="interview-header sticky top-10 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">AIR</span>
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Demo</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-gray-600">{candidateInfo.firstName}&apos;s AI Interview for {interviewConfig.jobTitle}</span>
          </div>
          <button
            onClick={handleStartInterview}
            className="btn-primary"
            disabled={!cameraReady || !micReady}
          >
            Start AI interview
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </header>

        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Left side - Instructions */}
          <div className="flex-1 p-8 lg:p-12">
            <div className="max-w-lg">
              <p className="text-sm text-gray-500 mb-2">Interview setup</p>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                Final step before your AI interview
              </h1>

              <div className="mb-6">
                <p className="font-medium text-gray-900 mb-2">Before you begin:</p>
                <ul className="text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Make sure your <strong>camera and microphone</strong> are working.
                  </li>
                </ul>
              </div>

              <p className="text-gray-600 mb-6">
                Your interview will be conducted in <strong>{interviewConfig.language}</strong> and led by AIR, our AI-powered interviewer. Responses are reviewed by the hiring team -- AIR supports fair, consistent evaluations but doesn&apos;t make hiring decisions.
              </p>

              <p className="text-gray-600 mb-8">
                When you&apos;re ready, select Start AI interview to begin.
              </p>

              <button
                onClick={handleStartInterview}
                className="btn-primary"
                disabled={!cameraReady || !micReady}
              >
                Start AI interview
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* What to expect section */}
              <div className="mt-12">
                <p className="text-sm text-gray-500 mb-2">Let&apos;s prep</p>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  What to expect with your AI interview
                </h2>

                <div className="space-y-1">
                  <div className="expect-item">
                    <div className="expect-icon expect-icon-check">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Pauses are Normal</p>
                      <p className="text-sm text-gray-600">Allow AIR time to process before the next question.</p>
                    </div>
                  </div>

                  <div className="expect-item">
                    <div className="expect-icon expect-icon-check">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Completion notification</p>
                      <p className="text-sm text-gray-600">You&apos;ll be notified when the interview is done. Stay until it&apos;s complete.</p>
                    </div>
                  </div>

                  <div className="expect-item">
                    <div className="expect-icon expect-icon-video">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Video recordings</p>
                      <p className="text-sm text-gray-600">Your responses will be video recorded and shared only with the hiring team.</p>
                    </div>
                  </div>

                  <div className="expect-item">
                    <div className="expect-icon expect-icon-alert">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">One-time responses</p>
                      <p className="text-sm text-gray-600">No re-dos once you start, so treat it like a live interview.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Video preview */}
          <div className="flex-1 p-8 lg:p-12 flex flex-col">
            <div className="flex-1 relative">
              <div className="relative w-full h-full max-h-[500px] bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-white">Requesting camera access...</p>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-green-500 shadow-lg" />
              </div>
            </div>

            {/* Device selectors */}
            <div className="mt-6 flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <select
                    className="flex-1 bg-transparent border-none text-sm text-gray-700 focus:outline-none"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                  >
                    {devices.cameras.length > 0 ? (
                      devices.cameras.map(camera => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || 'Camera'}
                        </option>
                      ))
                    ) : (
                      <option>Default Camera</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <select
                    className="flex-1 bg-transparent border-none text-sm text-gray-700 focus:outline-none"
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                  >
                    {devices.mics.length > 0 ? (
                      devices.mics.map(mic => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || 'Microphone'}
                        </option>
                      ))
                    ) : (
                      <option>Default Microphone</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Joining Screen
  if (stage === 'joining') {
    return (
      <div className="interview-page min-h-screen flex items-center justify-center pt-10">
        <DemoBanner />
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-300 to-cyan-500" />
          </div>
          <p className="text-xl font-medium text-gray-900">Joining your AI Interview...</p>
          <p className="text-gray-500 mt-2">Please wait while we connect you with AIR</p>
          <p className="text-amber-600 text-sm mt-4">(Demo mode - simulating connection)</p>
        </div>
      </div>
    )
  }

  // Active Interview Screen
  return (
    <div className="min-h-screen bg-white overflow-hidden relative flex flex-col pt-10">
      <DemoBanner />

      {/* AIBOS Background decorative elements */}
      <div className="absolute top-20 right-40 w-80 h-80 rounded-full bg-[#0066cc]/10 opacity-50 blur-3xl"></div>
      <div className="absolute top-40 left-20 w-80 h-80 rounded-full bg-sky-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-20 left-40 w-60 h-60 rounded-full bg-[#0099ff]/10 opacity-30 blur-3xl"></div>

      {/* Grid pattern */}
      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: 0.3,
        }}
      ></div>

      {/* Decorative circles */}
      <div className="absolute top-40 right-1/4 w-6 h-6 rounded-full bg-[#0066cc]/30 opacity-20"></div>
      <div className="absolute top-60 left-1/4 w-4 h-4 rounded-full bg-blue-500 opacity-30"></div>

      {/* Top - AI transcript text */}
      <div className="flex-shrink-0 p-6 md:p-8 pt-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-lg md:text-xl leading-relaxed text-gray-800 text-center">
            {displayedText || 'Welcome to your interview...'}
            {isRevealingText && (
              <span className="inline-block w-0.5 h-6 ml-1 bg-[#0066cc] animate-pulse align-middle" />
            )}
          </p>
        </div>
      </div>

      {/* Center - Main Interview Area */}
      <div className="flex-1 flex items-center justify-center px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl items-center">
          {/* LEFT - Candidate Video (50% larger) */}
          <div className="lg:col-span-1 flex justify-center">
            <div className="candidate-video w-96 h-72 relative rounded-2xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                <span className="text-white text-xs font-medium">{candidateInfo.firstName}</span>
              </div>
            </div>
          </div>

          {/* CENTER - AIBOS Logo with Speaking Animation */}
          <div className="lg:col-span-1 flex justify-center relative">
            {/* Speaking animation rings behind logo */}
            {voiceAgent.isSpeaking && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 rounded-full border-2 border-[#0066cc]/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-56 rounded-full border-2 border-[#0099ff]/30 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-[#0066cc]/40 animate-ping" style={{ animationDuration: '1s' }}></div>
                </div>
              </>
            )}

            {/* AIBOS Logo */}
            <div className="relative z-10">
              <Image src="/aibos-logo.png" alt="AIBOS" width={200} height={200} className="object-contain" />

              {/* State indicator below logo */}
              <div className="mt-4 text-center">
                <span className={`text-sm font-medium ${voiceAgent.isSpeaking ? 'text-[#0066cc]' : 'text-gray-600'}`}>
                  {voiceAgent.isSpeaking ? 'Speaking...' : voiceAgent.isThinking ? 'Thinking...' : 'Listening...'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT - Timer and Status */}
          <div className="lg:col-span-1 flex justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-2">Interview Time</div>
                  <div className="text-3xl font-bold text-gray-800">
                    {formatTime(elapsedTime)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    of {formatTime(interviewConfig.maxDuration * 60)}
                  </div>
                </div>

                <div className="h-px bg-gray-200"></div>

                <button
                  onClick={handleEndInterview}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  End Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - Minimal Footer */}
      <div className="flex-shrink-0 p-4 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-gray-500">
          <Image src="/aibos-logo.png" alt="AIBOS" width={24} height={24} className="object-contain" />
          <span>AIBOS AI Interview</span>
          <span className="mx-2">•</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Demo</span>
          <span className="mx-2">•</span>
          <span>{candidateInfo.firstName} × {interviewConfig.companyName}</span>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">Demo Interview Complete!</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              This was a demo of the candidate interview experience.
            </h2>

            <p className="text-gray-600 mb-6">
              In a real interview, the candidate&apos;s responses would be recorded and evaluated by the AI interviewer. The hiring team would then receive a comprehensive assessment.
            </p>

            <div className="mb-6">
              <p className="font-medium text-gray-900 mb-3">To create a real interview:</p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] mt-2" />
                  <span>Go to <a href="/interviews/new" className="text-[#0066cc] hover:underline font-medium">Create Interview</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] mt-2" />
                  <span>Set up your job description and competencies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] mt-2" />
                  <span>Invite candidates to take the interview</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <a
                href="/interviews/new"
                className="bg-[#0066cc] hover:bg-[#004c99] text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                Create Real Interview
              </a>
              <a
                href="/"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-medium transition-colors"
              >
                Back to Home
              </a>
            </div>

            <button
              onClick={() => setShowCompletionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
