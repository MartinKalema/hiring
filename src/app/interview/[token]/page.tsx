'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useVoiceAgent } from '@/presentation/hooks/use-voice-agent'

type InterviewStage = 'loading' | 'error' | 'welcome' | 'setup' | 'joining' | 'active' | 'completed'

interface CandidateInfo {
  firstName: string
  lastName: string
  email: string
}

interface InterviewConfig {
  jobTitle: string
  companyName: string
  maxDuration: number // minutes
  language: string
  competencies: string[]
}

interface VoiceConfig {
  apiKey: string
  instructions: string
  voice: string
  thinkModel: string
  thinkProvider: string
}

// Decorative photos for the welcome screen
const DECORATIVE_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
]

export default function InterviewPage() {
  const params = useParams()
  const token = params.token as string

  const [stage, setStage] = useState<InterviewStage>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[], mics: MediaDeviceInfo[] }>({ cameras: [], mics: [] })
  const [transcript, setTranscript] = useState<Array<{ speaker: 'ai' | 'user', text: string, timestamp: number }>>([])
  const [currentAgentText, setCurrentAgentText] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [timeWarningGiven, setTimeWarningGiven] = useState(false)
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Interview configuration - fetched from API or fallback to defaults
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig>({
    jobTitle: 'Front End Developer',
    companyName: 'Our Great Company',
    maxDuration: 9,
    language: 'English',
    competencies: [],
  })

  // Fetch interview data on mount
  useEffect(() => {
    async function fetchInterviewData() {
      try {
        const response = await fetch(`/api/interview/${token}`)
        if (!response.ok) {
          const data = await response.json()
          setErrorMessage(data.error || 'Interview not found')
          setStage('error')
          return
        }

        const data = await response.json()
        const template = data.template
        const config = template?.config || {}

        setInterviewConfig({
          jobTitle: template?.job_title || 'Position',
          companyName: template?.company_name || 'Company',
          maxDuration: config.maxDurationMinutes || 9,
          language: config.language || 'English',
          competencies: template?.competencies_to_assess || [],
        })

        // Pre-fill candidate info if available
        if (data.candidate) {
          setCandidateInfo({
            firstName: data.candidate.first_name || '',
            lastName: data.candidate.last_name || '',
            email: data.candidate.email || '',
          })
        }

        setStage('welcome')
      } catch (error) {
        console.error('Error fetching interview:', error)
        setErrorMessage('Failed to load interview')
        setStage('error')
      }
    }

    fetchInterviewData()
  }, [token])

  const remainingTime = interviewConfig.maxDuration * 60 - elapsedTime
  const remainingMinutes = Math.floor(remainingTime / 60)
  const isTimeWarning = remainingMinutes <= 2 && remainingMinutes > 1
  const isTimeCritical = remainingMinutes <= 1

  // Build dynamic instructions for the AI interviewer
  const buildInstructions = useCallback(() => {
    const timeContext = elapsedTime > 0
      ? `\n\nIMPORTANT TIME CONTEXT: ${remainingMinutes} minutes remaining in the interview.`
      : ''

    const timeInstructions = isTimeCritical
      ? '\n\nCRITICAL: Less than 1 minute remaining. Wrap up the interview now. Thank the candidate and end gracefully.'
      : isTimeWarning
      ? '\n\nNOTE: Only 2 minutes remaining. Start wrapping up the current topic and prepare to close the interview.'
      : ''

    return `You are AIR, an AI interviewer conducting an interview for a ${interviewConfig.jobTitle} position at ${interviewConfig.companyName}.

Your role:
- Conduct a professional, conversational interview
- Ask behavioral and technical questions relevant to the role
- When answers are vague, probe deeper using the STAR method (Situation, Task, Action, Result)
- Be warm, encouraging, but professional
- Listen carefully and ask relevant follow-up questions

Interview structure:
1. Start with a warm greeting, introduce yourself as AIR, mention the role and company
2. Ask about their background and interest in the role
3. Ask 2-3 behavioral questions about relevant competencies
4. For each answer, probe deeper if needed (ask for specific examples, outcomes, learnings)
5. Allow time for candidate questions
6. Close with next steps and thanks

PROBING GUIDELINES:
- If an answer lacks specifics, ask: "Can you walk me through a specific example?"
- If no measurable outcomes, ask: "What was the result of that approach?"
- If unclear on their role, ask: "What was your specific contribution to that?"
- Maximum 2 follow-up probes per topic before moving on

Candidate name: ${candidateInfo.firstName} ${candidateInfo.lastName}
Maximum duration: ${interviewConfig.maxDuration} minutes
${timeContext}
${timeInstructions}

Start by greeting ${candidateInfo.firstName}, introducing yourself as AIR, explaining you'll be conducting their interview for the ${interviewConfig.jobTitle} role at ${interviewConfig.companyName}. Mention the interview will take about ${interviewConfig.maxDuration} minutes and ask if they're ready to get started.`
  }, [candidateInfo.firstName, candidateInfo.lastName, interviewConfig.jobTitle, interviewConfig.companyName, interviewConfig.maxDuration, elapsedTime, remainingMinutes, isTimeWarning, isTimeCritical])

  const voiceAgent = useVoiceAgent({
    apiKey: voiceConfig?.apiKey || '',
    instructions: voiceConfig?.instructions || buildInstructions(),
    voice: voiceConfig?.voice || 'aura-asteria-en',
    thinkProvider: voiceConfig?.thinkProvider || 'anthropic',
    thinkModel: voiceConfig?.thinkModel || 'claude-sonnet-4-20250514',
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setTranscript(prev => [...prev, { speaker: 'user', text, timestamp: elapsedTime }])
      }
    },
    onAgentUtterance: (text) => {
      setCurrentAgentText(text)
      if (text.trim()) {
        setTranscript(prev => {
          // Avoid duplicates
          const lastEntry = prev[prev.length - 1]
          if (lastEntry?.speaker === 'ai' && lastEntry?.text === text) {
            return prev
          }
          return [...prev, { speaker: 'ai', text, timestamp: elapsedTime }]
        })
      }
    },
    onError: (error) => {
      console.error('Interview error:', error)
    },
  })

  // Enumerate available devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Request permission first
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
        // Stop existing stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
        }

        const constraints: MediaStreamConstraints = {
          video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
          audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
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
        setCameraReady(false)
        setMicReady(false)
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

  // Timer for interview duration
  useEffect(() => {
    if (stage === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1
          // Check for time limit
          if (newTime >= interviewConfig.maxDuration * 60) {
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
  }, [stage, interviewConfig.maxDuration])

  // Time warning injection
  useEffect(() => {
    if (stage === 'active' && isTimeWarning && !timeWarningGiven) {
      // Inject time warning to agent
      voiceAgent.injectMessage(`[SYSTEM: 2 minutes remaining in the interview. Start wrapping up.]`)
      setTimeWarningGiven(true)
    }
  }, [stage, isTimeWarning, timeWarningGiven, voiceAgent])

  // Start recording when interview begins
  useEffect(() => {
    if (stage === 'active' && mediaStreamRef.current) {
      try {
        const recorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType: 'video/webm;codecs=vp9'
        })

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        recorder.start(1000) // Collect data every second
        mediaRecorderRef.current = recorder
      } catch (error) {
        console.error('Failed to start recording:', error)
      }
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [stage])

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
      // Fetch voice configuration from API
      const response = await fetch(`/api/interview/${token}/voice`, {
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
        thinkModel: data.config.thinkModel,
        thinkProvider: data.config.thinkProvider,
      })

      // Update interview config if provided
      if (data.interview) {
        setInterviewConfig(prev => ({
          ...prev,
          ...data.interview,
          maxDuration: data.config.maxDuration || prev.maxDuration,
        }))
      }

      // Connect to Deepgram Voice Agent - pass config directly to avoid stale closure
      await voiceAgent.connect({
        apiKey: data.apiKey,
        instructions: data.instructions,
        voice: data.config.voice,
        thinkModel: data.config.thinkModel,
        thinkProvider: data.config.thinkProvider,
      })
      setStage('active')
    } catch (error) {
      console.error('Failed to start interview:', error)
      setStage('setup')
    }
  }

  const handleEndInterview = () => {
    voiceAgent.disconnect()

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    setShowCompletionModal(true)
    setTimeout(() => {
      setStage('completed')
    }, 100)
  }

  // Loading Screen
  if (stage === 'loading') {
    return (
      <div className="interview-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-lg font-medium text-gray-900">Loading your interview...</p>
        </div>
      </div>
    )
  }

  // Error Screen
  if (stage === 'error') {
    return (
      <div className="interview-page min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Interview</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the hiring team or try again later.
          </p>
        </div>
      </div>
    )
  }

  // Welcome Screen - matches Braintrust AIR design
  if (stage === 'welcome') {
    return (
      <div className="interview-page min-h-screen">
        {/* Header */}
        <header className="interview-header sticky top-0 z-10 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Braintrust AIR</span>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-80px)]">
          {/* Left side - Decorative */}
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-12">
            {/* Decorative circles with photos */}
            <div className="relative w-full h-full">
              {/* Large circle top */}
              <div className="absolute top-0 left-1/4 w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img src={DECORATIVE_PHOTOS[0]} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Speech bubble */}
              <div className="absolute top-16 left-4 bg-white rounded-2xl p-4 shadow-lg max-w-xs">
                <p className="text-sm text-gray-700">
                  Hi! Welcome to your interview with {interviewConfig.companyName}. I&apos;m AIR, the AI assistant who will be conducting the interview with you. Just relax and chat with me like you would in any regular conversation.
                </p>
              </div>

              {/* Medium circle */}
              <div className="absolute top-1/3 right-8 w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img src={DECORATIVE_PHOTOS[1]} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Small circles */}
              <div className="absolute top-1/2 left-8 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img src={DECORATIVE_PHOTOS[2]} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Settings icon circle */}
              <div className="absolute top-[45%] left-1/3 w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              {/* AI Orb preview */}
              <div className="absolute bottom-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 shadow-lg flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-300/50 to-cyan-500/50 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20" />
                </div>
              </div>

              {/* More decorative photos */}
              <div className="absolute bottom-1/4 right-1/4 w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img src={DECORATIVE_PHOTOS[3]} alt="" className="w-full h-full object-cover" />
              </div>

              <div className="absolute bottom-8 left-1/3 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img src={DECORATIVE_PHOTOS[4]} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Video icon circle */}
              <div className="absolute bottom-16 left-8 w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
            <div className="w-full max-w-md">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to your AI interview with {interviewConfig.companyName}
              </h1>

              <p className="text-gray-600 mb-8">
                The interview will be conducted by AIR, our AI-powered interviewer. Your responses will be reviewed by the hiring team using criteria specific to the role to help ensure a fair and consistent evaluation.
              </p>

              <form onSubmit={handleContinueToSetup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={candidateInfo.firstName}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Martin"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={candidateInfo.lastName}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Kalema"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={candidateInfo.email}
                    onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="kalema.martin@aibos.co.jp"
                    required
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!candidateInfo.firstName || !candidateInfo.lastName || !candidateInfo.email}
                  >
                    Continue
                  </button>
                  <p className="text-xs text-gray-500 pt-2">
                    By starting the interview, you agree to the collection and processing of your data as outlined in our{' '}
                    <a href="#" className="privacy-link">Privacy Policy</a>.
                  </p>
                </div>
              </form>

              {/* What to expect link */}
              <button className="mt-8 flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium">
                What to expect
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Setup Screen - Camera/Mic check
  if (stage === 'setup') {
    return (
      <div className="interview-page min-h-screen">
        {/* Header */}
        <header className="interview-header sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Braintrust AIR</span>
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

        <div className="flex min-h-[calc(100vh-80px)]">
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
                Your interview will be conducted in <strong>{interviewConfig.language}</strong> and led by AIR, our AI-powered interviewer. Responses are reviewed by the hiring team — AIR supports fair, consistent evaluations but doesn&apos;t make hiring decisions.
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

                <a href="#" className="inline-flex items-center gap-2 mt-6 text-gray-700 hover:text-gray-900 font-medium">
                  View tips for success
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Right side - Video preview */}
          <div className="flex-1 p-8 lg:p-12 flex flex-col">
            <div className="flex-1 relative">
              {/* Video preview */}
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

                {/* Status indicator */}
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
                    {devices.cameras.map(camera => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || 'Camera'}
                      </option>
                    ))}
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
                    {devices.mics.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || 'Microphone'}
                      </option>
                    ))}
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
      <div className="interview-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-300 to-cyan-500" />
          </div>
          <p className="text-xl font-medium text-gray-900">Joining your AI Interview...</p>
          <p className="text-gray-500 mt-2">Please wait while we connect you with AIR</p>
        </div>
      </div>
    )
  }

  // Active Interview Screen
  return (
    <div className="interview-active min-h-screen flex flex-col">
      {/* Top - AI transcript text */}
      <div className="flex-shrink-0 p-6 md:p-8 pt-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg md:text-xl leading-relaxed text-gray-800 animate-fade-in">
            {currentAgentText || 'Welcome to your interview...'}
          </p>
        </div>
      </div>

      {/* Center - AI Orb */}
      <div className="flex-1 flex items-center justify-center">
        <div className="ai-orb-container">
          {/* Outer rotating ring */}
          <div
            className="ai-orb-outer-ring"
            style={{
              width: '280px',
              height: '280px',
              borderStyle: 'dashed',
            }}
          />

          {/* Inner rotating ring */}
          <div
            className="ai-orb-inner-ring"
            style={{
              width: '240px',
              height: '240px',
              borderStyle: 'dotted',
            }}
          />

          {/* Main orb */}
          <div
            className={`relative rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-600 w-48 h-48 ${
              voiceAgent.isSpeaking ? 'ai-orb-speaking' : 'ai-orb'
            }`}
          >
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/30 to-transparent" />

            {/* Center pattern */}
            <div className="absolute inset-0 flex items-center justify-center">
              {voiceAgent.isSpeaking ? (
                <div className="speaking-wave-container">
                  <div className="speaking-wave-bar" />
                  <div className="speaking-wave-bar" />
                  <div className="speaking-wave-bar" />
                  <div className="speaking-wave-bar" />
                  <div className="speaking-wave-bar" />
                </div>
              ) : (
                <svg viewBox="0 0 100 100" className="w-24 h-24 text-white/40">
                  <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 4" />
                  <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 3" />
                  <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
                  <circle cx="50" cy="50" r="4" fill="currentColor" />
                </svg>
              )}
            </div>
          </div>

          {/* State indicator text */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <span className="text-sm text-gray-600">
              {voiceAgent.isSpeaking ? 'Speaking...' : voiceAgent.isThinking ? 'Thinking...' : 'Listening...'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom - Controls */}
      <div className="flex-shrink-0 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Playback controls */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-4 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200">
              {/* Rewind */}
              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={() => voiceAgent.interrupt()}
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors shadow-md"
              >
                {voiceAgent.isSpeaking ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Forward */}
              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              {/* Captions toggle */}
              <button className="text-gray-500 hover:text-gray-700 transition-colors ml-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </button>

              {/* Skip */}
              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              {/* Timer */}
              <span className={`text-sm ml-4 ${isTimeCritical ? 'time-critical' : isTimeWarning ? 'time-warning' : 'text-gray-600'}`}>
                {formatTime(elapsedTime)} / {formatTime(interviewConfig.maxDuration * 60)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Branding */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600">
                Braintrust AIR
              </span>
              <span className="text-gray-400 mx-2">|</span>
              <span className="text-sm text-gray-600">
                {candidateInfo.firstName} x {interviewConfig.companyName}
              </span>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-4">
              {/* Candidate video preview */}
              <div className="candidate-video w-40 h-28 relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Drag handle */}
                <div className="absolute top-2 right-2 text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              {/* Camera selector */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg text-gray-600 text-sm border border-gray-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:inline">Camera</span>
              </div>

              {/* Mic selector */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg text-gray-600 text-sm border border-gray-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="hidden md:inline">Microphone</span>
              </div>

              {/* Warning indicator */}
              <button className="p-2 text-amber-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </button>

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

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">Your interview is complete</span>
              <span className="text-2xl">👏</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Thank you for completing your AI interview with {interviewConfig.companyName}.
            </h2>

            <p className="text-gray-600 mb-6">
              Your responses have been recorded and will be evaluated by our AI interviewer, AIR. Based on predefined criteria set by the hiring manager at {interviewConfig.companyName}, AIR will provide an comprehensive assessment of your suitability for the role.
            </p>

            <div className="mb-6">
              <p className="font-medium text-gray-900 mb-3">Next steps</p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
                  <span><strong>Evaluation:</strong> The hiring manager at {interviewConfig.companyName} will review your interview results.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
                  <span><strong>Follow up:</strong> {interviewConfig.companyName} will review your results and follow up if they need any additional information regarding the next steps in the hiring process.</span>
                </li>
              </ul>
            </div>

            <details className="mb-6">
              <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                Help us improve <span className="text-gray-400">(optional)</span> <span className="text-gray-400 text-sm">(1 minute)</span>
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Feedback form would go here...</p>
              </div>
            </details>

            <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>If you need any further help, please contact <a href="mailto:support@usebraintrust.com" className="privacy-link">support@usebraintrust.com</a>.</span>
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
