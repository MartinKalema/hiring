'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useVoiceAgent } from '@/hooks/use-voice-agent'

type InterviewStage = 'welcome' | 'setup' | 'joining' | 'active' | 'completed'

interface CandidateInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  profilePicture: File | null
  resume: File | null
  academicTranscripts: File | null
  githubProfile: string
  university: string
  faculty: string
  department: string
  course: string
  yearOfStudy: string
  howDidYouHear: string
  gpa: string
  daysPerWeek: string
}

// University of Botswana faculties, departments, and courses
const UB_FACULTIES = [
  {
    name: 'Faculty of Business',
    departments: [
      {
        name: 'Department of Accounting and Finance',
        courses: [
          'Bachelor of Accountancy',
          'Bachelor of Finance'
        ]
      },
      {
        name: 'Department of Management',
        courses: [
          'Bachelor of Business Administration (Management)',
          'Bachelor of Business Administration (Entrepreneurship)',
          'Bachelor of Business Administration (Logistics & SCM)'
        ]
      },
      {
        name: 'Department of Marketing',
        courses: [
          'Bachelor of Business Administration (Marketing)',
          'Bachelor of Business Administration (Intl Business)'
        ]
      },
      {
        name: 'Department of Tourism and Hospitality Management',
        courses: [
          'Bachelor of Business Administration (Tourism & Hospitality)'
        ]
      },
      {
        name: 'Graduate School of Business',
        courses: [
          'Master of Business Administration (MBA)'
        ]
      }
    ]
  },
  {
    name: 'Faculty of Education',
    departments: [
      {
        name: 'Department of Primary Education',
        courses: [
          'Bachelor of Primary Education',
          'Bachelor of Education (Early Childhood)'
        ]
      },
      {
        name: 'Department of Mathematics and Science Education',
        courses: [
          'Bachelor of Education (Science)'
        ]
      },
      {
        name: 'Department of Educational Foundations',
        courses: [
          'Bachelor of Education (Special Education)',
          'Bachelor of Education (Counselling)'
        ]
      },
      {
        name: 'Department of Educational Technology',
        courses: []
      },
      {
        name: 'Department of Family and Consumer Sciences',
        courses: []
      },
      {
        name: 'Department of Languages and Social Sciences Education',
        courses: []
      },
      {
        name: 'Department of Lifelong Learning and Community Development',
        courses: []
      },
      {
        name: 'Department of Sports Science',
        courses: []
      }
    ]
  },
  {
    name: 'Faculty of Engineering and Technology',
    departments: [
      {
        name: 'Department of Architecture and Planning',
        courses: [
          'Bachelor of Architecture',
          'BSc Urban and Regional Planning'
        ]
      },
      {
        name: 'Department of Civil Engineering',
        courses: [
          'Bachelor of Engineering (Civil)'
        ]
      },
      {
        name: 'Department of Electrical Engineering',
        courses: [
          'Bachelor of Electrical and Electronic Engineering'
        ]
      },
      {
        name: 'Department of Mechanical Engineering',
        courses: [
          'Bachelor of Engineering (Mechanical)'
        ]
      },
      {
        name: 'Department of Industrial Design and Technology',
        courses: [
          'Bachelor of Design (Industrial Design)'
        ]
      }
    ]
  },
  {
    name: 'Faculty of Health Sciences',
    departments: [
      {
        name: 'School of Nursing',
        courses: [
          'Bachelor of Nursing Science'
        ]
      },
      {
        name: 'School of Pharmacy',
        courses: [
          'Bachelor of Pharmacy'
        ]
      },
      {
        name: 'School of Allied Health Professions',
        courses: [
          'BSc Medical Laboratory Sciences'
        ]
      },
      {
        name: 'School of Public Health',
        courses: []
      }
    ]
  },
  {
    name: 'Faculty of Humanities',
    departments: [
      {
        name: 'Department of English',
        courses: [
          'Bachelor of Arts (English)'
        ]
      },
      {
        name: 'Department of Media Studies',
        courses: [
          'Bachelor of Media Studies'
        ]
      },
      {
        name: 'Department of African Languages and Literature',
        courses: []
      },
      {
        name: 'Department of Chinese Studies',
        courses: []
      },
      {
        name: 'Department of French',
        courses: []
      },
      {
        name: 'Department of History',
        courses: []
      },
      {
        name: 'Department of Library and Information Studies',
        courses: []
      },
      {
        name: 'Department of Portuguese Studies',
        courses: []
      },
      {
        name: 'Department of Theology and Religious Studies',
        courses: []
      },
      {
        name: 'Department of Visual and Performing Arts',
        courses: []
      }
    ]
  },
  {
    name: 'Faculty of Medicine',
    departments: [
      {
        name: 'Department of Medical Education',
        courses: [
          'Bachelor of Medicine Bachelor of Surgery (MBBS)'
        ]
      },
      {
        name: 'Department of Anaesthesia and Critical Care Medicine',
        courses: []
      },
      {
        name: 'Department of Biomedical Sciences',
        courses: []
      },
      {
        name: 'Department of Emergency Medicine',
        courses: []
      },
      {
        name: 'Department of Family Medicine & Public Health',
        courses: []
      },
      {
        name: 'Department of Internal Medicine',
        courses: []
      },
      {
        name: 'Department of Obstetrics and Gynaecology',
        courses: []
      },
      {
        name: 'Department of Paediatrics and Adolescent Health',
        courses: []
      },
      {
        name: 'Department of Pathology',
        courses: []
      },
      {
        name: 'Department of Psychiatry',
        courses: []
      },
      {
        name: 'Department of Radiology',
        courses: []
      },
      {
        name: 'Department of Surgery',
        courses: []
      }
    ]
  },
  {
    name: 'Faculty of Science',
    departments: [
      {
        name: 'Department of Computer Science',
        courses: [
          'Bachelor of Science (Computer Science)',
          'Bachelor of Information Systems'
        ]
      },
      {
        name: 'Department of Physics',
        courses: [
          'Bachelor of Science (Physics)'
        ]
      },
      {
        name: 'Department of Biological Sciences',
        courses: [
          'Bachelor of Science (Biological Sciences)'
        ]
      },
      {
        name: 'Department of Chemistry',
        courses: []
      },
      {
        name: 'Department of Environmental Science',
        courses: []
      },
      {
        name: 'Department of Geology',
        courses: []
      },
      {
        name: 'Department of Mathematics',
        courses: []
      }
    ]
  },
  {
    name: 'Faculty of Social Sciences',
    departments: [
      {
        name: 'Department of Law',
        courses: [
          'Bachelor of Laws (LLB)'
        ]
      },
      {
        name: 'Department of Economics',
        courses: [
          'Bachelor of Arts in Economics'
        ]
      },
      {
        name: 'Department of Political and Administrative Studies',
        courses: [
          'Bachelor of Arts in Political Science'
        ]
      },
      {
        name: 'Department of Social Work',
        courses: [
          'Bachelor of Social Work'
        ]
      },
      {
        name: 'Department of Population Studies',
        courses: []
      },
      {
        name: 'Department of Psychology',
        courses: []
      },
      {
        name: 'Department of Sociology',
        courses: []
      },
      {
        name: 'Department of Statistics',
        courses: []
      }
    ]
  },
  {
    name: 'Research Institutes',
    departments: [
      {
        name: 'Okavango Research Institute (ORI)',
        courses: []
      }
    ]
  }
]

// BIUST faculties, departments, and courses
const BIUST_FACULTIES = [
  {
    name: 'Faculty of Engineering and Technology',
    departments: [
      {
        name: 'Department of Chemical, Materials and Metallurgical Engineering',
        courses: [
          'BEng Chemical Engineering'
        ]
      },
      {
        name: 'Department of Civil and Environmental Engineering',
        courses: [
          'BEng Civil and Environmental Engineering'
        ]
      },
      {
        name: 'Department of Electrical, Computer and Telecommunications Engineering',
        courses: [
          'BEng Computer and Telecommunications Engineering',
          'BEng Electrical and Electronics Engineering'
        ]
      },
      {
        name: 'Department of Mechanical, Energy and Industrial Engineering',
        courses: [
          'BEng Mechanical and Energy Engineering'
        ]
      },
      {
        name: 'Department of Mining and Geological Engineering',
        courses: [
          'BEng Mining Engineering'
        ]
      }
    ]
  },
  {
    name: 'Faculty of Sciences',
    departments: [
      {
        name: 'Department of Biological and Biotechnological Sciences',
        courses: [
          'BSc Biological Sciences and Biotechnology'
        ]
      },
      {
        name: 'Department of Chemical and Forensic Sciences',
        courses: [
          'BSc Forensic Sciences'
        ]
      },
      {
        name: 'Department of Computer Science and Information Systems',
        courses: [
          'BSc Computer Science and Software Engineering'
        ]
      },
      {
        name: 'Department of Earth and Environmental Sciences',
        courses: [
          'BSc Earth and Environmental Sciences'
        ]
      },
      {
        name: 'Department of Mathematics and Statistical Sciences',
        courses: []
      },
      {
        name: 'Department of Physics and Astronomy',
        courses: []
      }
    ]
  },
  {
    name: 'Centre for Business Management, Entrepreneurship and General Education',
    departments: [
      {
        name: 'Department of Academic Literacy and Social Sciences',
        courses: []
      },
      {
        name: 'Department of Business, Management and Entrepreneurship',
        courses: []
      }
    ]
  }
]

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
  const [formStep, setFormStep] = useState<1 | 2>(1)
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profilePicture: null,
    resume: null,
    academicTranscripts: null,
    githubProfile: '',
    university: '',
    faculty: '',
    department: '',
    course: '',
    yearOfStudy: '',
    howDidYouHear: '',
    gpa: '',
    daysPerWeek: '',
  })
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[], mics: MediaDeviceInfo[] }>({ cameras: [], mics: [] })
  const [displayedText, setDisplayedText] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [internetSpeed, setInternetSpeed] = useState<number | null>(null)
  const [speedTestStatus, setSpeedTestStatus] = useState<'idle' | 'testing' | 'complete'>('idle')
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [setupStep, setSetupStep] = useState<'intro' | 'tests'>('intro')
  const [location, setLocation] = useState<{ city: string; country: string; ip: string } | null>(null)
  const audioAnalyzerRef = useRef<AnalyserNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timeCheckpointsTriggered = useRef<Set<number>>(new Set())

  // Demo interview configuration
  const interviewConfig = {
    jobTitle: 'Senior Software Engineer',
    companyName: 'AIBOS',
    maxDuration: 15,
    language: 'English',
  }

  // Build instructions for the AI interviewer
  const buildInstructions = useCallback(() => {
    return `You are an AI interviewer conducting an interview for a ${interviewConfig.jobTitle} position at ${interviewConfig.companyName}.

Your role:
- Conduct a professional, conversational interview
- Follow a TWO-PHASE structure: behavioral first (5 minutes), then technical (10 minutes)
- When answers are vague, probe deeper using the STAR method (Situation, Task, Action, Result)
- Sound EXTREMELY human - use natural speech patterns, contractions, casual acknowledgments
- Be warm, encouraging, but professional
- Listen carefully and ask relevant follow-up questions

SPEAKING STYLE:
- Use natural reactions: "Mmm", "I see", "Oh wow", "That's cool", "Gotcha", "Right", "Nice"
- Use contractions: "you're", "that's", "I'm", "let's", "didn't"
- Vary your acknowledgments - don't repeat the same phrase
- Sound like a real person, not a robot

INTERVIEW STRUCTURE - STRICTLY FOLLOW THIS TWO-PHASE APPROACH:

PHASE 1 (0-5 minutes): BEHAVIORAL & COMMUNICATION ASSESSMENT
Focus: Test communication skills, personality, background, and soft skills

1. Start with: "Tell me about yourself" - Let them talk for 1-2 minutes
2. Ask follow-up questions about their background, education, and interests
3. Ask 2-3 behavioral questions:
   - "Tell me about a time when you faced a significant challenge. How did you handle it?"
   - "Describe a situation where you had to work in a team. What was your role?"
   - "Can you share an example of when you had to learn something new quickly?"
4. Assess their communication clarity, confidence, and storytelling ability
5. Keep this section conversational and comfortable

PHASE 2 (5-15 minutes): TECHNICAL ASSESSMENT
At exactly 5 minutes, transition: "Great! Now let's shift to some technical questions about your engineering skills."

Focus: Test technical knowledge, problem-solving, and job-specific competencies
- Ask technical questions relevant to ${interviewConfig.jobTitle}
- Probe for depth of understanding
- Present hypothetical scenarios or problems
- Assess technical thinking and problem-solving approach
- Continue until 14 minutes, then wrap up

TIME AWARENESS - CRITICAL:
You will receive TIME UPDATE messages telling you elapsed time. When you receive these:
- At 5 minutes: IMMEDIATELY transition to Phase 2 (technical). Say: "Great background! Now let's shift to technical questions."
- At 7 minutes: If still on first technical topic, move to next. Say: "Let's move to another area..."
- At 10 minutes: Ensure you've covered 2-3 technical areas. Move quickly between topics.
- At 12 minutes: Start wrapping up current discussion.
- At 13 minutes: Begin closing phase regardless of current topic.
- At 14 minutes: Deliver final closing statement.

ONE QUESTION AT A TIME - CRITICAL:
- Ask ONE clear question per response
- NEVER ask multiple questions in one sentence
- Wait for answer before asking next question
- Example WRONG: "Tell me about your experience and what did you learn?"
- Example RIGHT: "Tell me about your experience."

STAYING ON TOPIC:
If the candidate goes off-topic:
- Politely redirect: "Let's stay focused on the interview."
- Keep conversation professional

Be strict but polite.

EARLY TERMINATION:
If the candidate wants to end early:
- Be warm and understanding - thank them for their time
- Reassure them that the hiring team will review what was discussed
- Mention they can click the 'End Interview' button to complete
- Keep it natural and conversational, not scripted
- Do NOT ask any more questions after they request to end

Candidate name: ${candidateInfo.firstName} ${candidateInfo.lastName}
Maximum duration: ${interviewConfig.maxDuration} minutes

Start by greeting ${candidateInfo.firstName}, introducing yourself, and asking if they're ready to get started.`
  }, [candidateInfo.firstName, candidateInfo.lastName])

  // Word-by-word text reveal - shows text progressively as the agent speaks
  // Voice agent hook - connected to real Deepgram API
  const voiceAgent = useVoiceAgent({
    apiKey: voiceConfig?.apiKey || '',
    instructions: voiceConfig?.instructions || buildInstructions(),
    voice: voiceConfig?.voice || 'aura-asteria-en',
    speechSpeed: voiceConfig?.speechSpeed || 1.0,
    thinkProvider: voiceConfig?.thinkProvider || 'open_ai',
    thinkModel: voiceConfig?.thinkModel || 'gpt-4o-mini',
    onTranscript: () => {
      // Don't clear text when user speaks - keep agent text visible
    },
    onAgentUtterance: (text) => {
      // Clear previous text and show new agent utterance
      setDisplayedText(text)
      setIsAudioPlaying(true)
    },
    onAgentStoppedSpeaking: () => {
      // Audio has actually finished playing (with calculated delay)
      setIsAudioPlaying(false)
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

  // Initialize camera for preview
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
      } catch (error) {
        console.error('Failed to access media devices:', error)
        setCameraReady(false)
      }
    }

    // Initialize camera when on tests step or active stage
    if ((stage === 'setup' && setupStep === 'tests') || stage === 'active') {
      initMedia()
    }

    return () => {
      if (mediaStreamRef.current && stage !== 'active') {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [stage, setupStep, selectedCamera])

  // Timer for interview duration with time-based checkpoints
  useEffect(() => {
    if (stage === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1
          const maxSeconds = interviewConfig.maxDuration * 60

          const checkpoints = {
            phase1End: 300,
            sevenMin: 420,
            tenMin: 600,
            twelveMin: 720,
            thirteenMin: 780,
            fourteenMin: 840,
          }

          if (newTime === checkpoints.phase1End && !timeCheckpointsTriggered.current.has(checkpoints.phase1End)) {
            timeCheckpointsTriggered.current.add(checkpoints.phase1End)
            voiceAgent.injectMessage('TIME UPDATE: 5 minutes elapsed. Transition to Phase 2 (Technical Assessment) now.')
          }

          if (newTime === checkpoints.sevenMin && !timeCheckpointsTriggered.current.has(checkpoints.sevenMin)) {
            timeCheckpointsTriggered.current.add(checkpoints.sevenMin)
            voiceAgent.injectMessage('TIME UPDATE: 7 minutes elapsed. Move to next technical topic if still on first one.')
          }

          if (newTime === checkpoints.tenMin && !timeCheckpointsTriggered.current.has(checkpoints.tenMin)) {
            timeCheckpointsTriggered.current.add(checkpoints.tenMin)
            voiceAgent.injectMessage('TIME UPDATE: 10 minutes elapsed. Ensure you have covered multiple technical areas.')
          }

          if (newTime === checkpoints.twelveMin && !timeCheckpointsTriggered.current.has(checkpoints.twelveMin)) {
            timeCheckpointsTriggered.current.add(checkpoints.twelveMin)
            voiceAgent.injectMessage('TIME UPDATE: 12 minutes elapsed. Begin wrapping up current topic.')
          }

          if (newTime === checkpoints.thirteenMin && !timeCheckpointsTriggered.current.has(checkpoints.thirteenMin)) {
            timeCheckpointsTriggered.current.add(checkpoints.thirteenMin)
            voiceAgent.injectMessage('TIME UPDATE: 13 minutes elapsed. Start closing phase.')
          }

          if (newTime === checkpoints.fourteenMin && !timeCheckpointsTriggered.current.has(checkpoints.fourteenMin)) {
            timeCheckpointsTriggered.current.add(checkpoints.fourteenMin)
            voiceAgent.injectMessage('TIME UPDATE: 14 minutes elapsed. Final minute - deliver closing statement.')
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

  // Internet speed test with real-time updates like Fast.com
  const runSpeedTest = async () => {
    setSpeedTestStatus('testing')
    setInternetSpeed(0)

    try {
      const speeds: number[] = []
      const testDuration = 20000 // Test for 20 seconds total
      const startTime = performance.now()
      let totalReceivedBytes = 0
      let isRunning = true

      // Update speed display every 200ms
      const updateInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000

        if (totalReceivedBytes > 0 && elapsed > 0) {
          // Calculate current speed in Mbps
          const speedMbps = (totalReceivedBytes * 8) / (elapsed * 1000000)
          speeds.push(speedMbps)
          setInternetSpeed(Math.round(speedMbps))
        }

        // Stop after test duration
        if (elapsed >= testDuration / 1000) {
          clearInterval(updateInterval)
          isRunning = false
        }
      }, 200)

      // Download multiple files continuously for the full duration
      const downloadFile = async (size: number) => {
        try {
          const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${size}`)
          const reader = response.body?.getReader()
          if (!reader) return

          while (isRunning) {
            const { done, value } = await reader.read()
            if (done) break
            totalReceivedBytes += value.length

            // Check if time is up
            if (performance.now() - startTime >= testDuration) {
              reader.cancel()
              break
            }
          }
        } catch (error) {
          console.error('Download error:', error)
        }
      }

      // Start multiple parallel downloads to keep data flowing
      const downloads = [
        downloadFile(10 * 1024 * 1024), // 10MB
        downloadFile(10 * 1024 * 1024), // 10MB
        downloadFile(10 * 1024 * 1024), // 10MB
      ]

      // Wait for test duration or all downloads to complete
      await Promise.race([
        Promise.all(downloads),
        new Promise(resolve => setTimeout(resolve, testDuration))
      ])

      clearInterval(updateInterval)

      if (speeds.length > 0) {
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length
        setInternetSpeed(Math.round(avgSpeed))
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      setSpeedTestStatus('complete')
    } catch (error) {
      console.error('Speed test failed:', error)
      // If speed test fails, just set a default good speed
      setInternetSpeed(50)
      setSpeedTestStatus('complete')
    }
  }

  // Start microphone test with audio level monitoring
  const startMicTest = async () => {
    try {
      // Request microphone with specific constraints for better audio capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      audioStreamRef.current = stream

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioContext(ctx)

      const source = ctx.createMediaStreamSource(stream)
      const analyzer = ctx.createAnalyser()
      analyzer.fftSize = 256 // Smaller FFT for faster response
      analyzer.smoothingTimeConstant = 0.3 // Less smoothing for more responsive feedback

      source.connect(analyzer)
      audioAnalyzerRef.current = analyzer
      setMicReady(true)

      // Monitor audio levels continuously using frequency data
      const dataArray = new Uint8Array(analyzer.frequencyBinCount)

      const updateLevel = () => {
        if (!audioAnalyzerRef.current) return

        // Use frequency data which is better for detecting speech
        analyzer.getByteFrequencyData(dataArray)

        // Calculate average of frequency bins (focuses on speech frequencies)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length

        // Scale to 0-100 with higher sensitivity
        // Most speech will be in the 0-50 range, we scale it up
        const level = Math.min(100, (average / 128) * 100 * 2.5)

        setAudioLevel(level)
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch (error) {
      console.error('Failed to start mic test:', error)
      setMicReady(false)
    }
  }

  // Stop microphone test
  const stopMicTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }
    if (audioContext) {
      audioContext.close()
      setAudioContext(null)
    }
    audioAnalyzerRef.current = null
    setAudioLevel(0)
  }

  const captureLocation = async () => {
    try {
      const response = await fetch('/api/location')

      if (!response.ok) {
        console.error('Location API error:', response.status)
        return
      }

      const text = await response.text()
      console.log('Location API response:', text)

      const data = JSON.parse(text)

      setLocation({
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        ip: data.ip || 'Unknown'
      })

      console.log('Location captured:', data)
    } catch (error) {
      console.error('Location failed:', error)
    }
  }

  // Auto-start tests when setup stage is reached
  useEffect(() => {
    if (stage === 'setup' && setupStep === 'tests') {
      // Auto-capture location (silent, no permission needed)
      captureLocation()
      // Auto-run speed test
      runSpeedTest()
      // Auto-start mic test
      startMicTest()
    }

    return () => {
      stopMicTest()
    }
  }, [stage, setupStep])

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
    <div className="fixed top-0 left-0 right-0 bg-[#0066cc] text-white py-2 px-4 text-center text-sm font-medium z-50">
      Demo Mode - This is a preview of the candidate interview experience.{' '}
      <a href="/interviews/new" className="text-white underline hover:no-underline">
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

        <div className="grid lg:grid-cols-2 min-h-screen">
          {/* Left side - Full height decorative area with huge AIBOS logo */}
          <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#0066cc]/5 to-blue-50/30 items-center justify-center">
            {/* Tech logos spread across entire panel */}
            <div className="absolute top-12 left-8 opacity-30">
              <Image src="/tech-logos/python-original.svg" alt="Python" width={50} height={50} />
            </div>
            <div className="absolute top-16 right-12 opacity-28">
              <Image src="/tech-logos/git-original.svg" alt="Git" width={45} height={45} />
            </div>
            <div className="absolute top-1/4 left-1/3 opacity-32">
              <Image src="/tech-logos/react-original.svg" alt="React" width={55} height={55} />
            </div>
            <div className="absolute top-1/3 right-2/5 opacity-30">
              <Image src="/tech-logos/typescript-original.svg" alt="TypeScript" width={48} height={48} />
            </div>
            <div className="absolute top-1/2 right-10 opacity-26">
              <Image src="/tech-logos/docker-original.svg" alt="Docker" width={52} height={52} />
            </div>
            <div className="absolute bottom-1/3 left-2/5 opacity-29">
              <Image src="/tech-logos/nodejs-original.svg" alt="Node.js" width={50} height={50} />
            </div>
            <div className="absolute top-20 right-1/4 opacity-25">
              <Image src="/tech-logos/postgresql-original.svg" alt="PostgreSQL" width={46} height={46} />
            </div>
            <div className="absolute bottom-20 left-1/4 opacity-24">
              <Image src="/tech-logos/kubernetes-original.svg" alt="Kubernetes" width={48} height={48} />
            </div>
            <div className="absolute top-3/4 left-12 opacity-27">
              <Image src="/tech-logos/go-original.svg" alt="Golang" width={50} height={50} />
            </div>
            <div className="absolute bottom-16 right-1/4 opacity-26">
              <Image src="/tech-logos/cplusplus-original.svg" alt="C++" width={46} height={46} />
            </div>
            <div className="absolute top-1/3 left-16 opacity-23">
              <Image src="/tech-logos/redis-original.svg" alt="Redis" width={44} height={44} />
            </div>
            <div className="absolute bottom-12 right-16 opacity-28">
              <Image src="/tech-logos/java-original.svg" alt="Java" width={48} height={48} />
            </div>
            <div className="absolute top-2/3 right-1/4 opacity-25">
              <Image src="/tech-logos/mongodb-original.svg" alt="MongoDB" width={46} height={46} />
            </div>
            <div className="absolute bottom-1/3 right-16 opacity-22">
              <Image src="/tech-logos/graphql-plain.svg" alt="GraphQL" width={42} height={42} />
            </div>
            <div className="absolute top-24 right-2/5 opacity-24">
              <Image src="/tech-logos/googlecloud-original.svg" alt="Google Cloud" width={50} height={50} />
            </div>
            <div className="absolute top-2/5 right-1/4 opacity-27">
              <Image src="/tech-logos/pytorch-original.svg" alt="PyTorch" width={48} height={48} />
            </div>
            <div className="absolute bottom-2/5 left-1/4 opacity-26">
              <Image src="/tech-logos/tensorflow-original.svg" alt="TensorFlow" width={46} height={46} />
            </div>

            {/* AIBOS Logo */}
            <Image src="/aibos-logo.png" alt="AIBOS" width={320} height={320} className="object-contain opacity-90 relative z-10" />
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center p-8 lg:p-12 relative">
            {/* Close/Back button - top right */}
            <a
              href="/"
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-[#0066cc] hover:bg-[#0066cc]/5 transition-all group"
              aria-label="Back to Home"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#0066cc] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </a>

            <div className="w-full max-w-md">
              {/* Back button - only show on step 2 */}
              {formStep === 2 && (
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="mb-4 text-sm text-aibos-blue hover:underline flex items-center gap-1 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}

              <h1 className="text-3xl font-bold text-gray-900 mb-2 font-mono">
                Try a Live AI Interview
              </h1>

              <p className="text-gray-600 mb-8 text-sm">
                Experience our AI interviewer in action for the <strong>{interviewConfig.jobTitle}</strong> position. Enter your details to begin the demo.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault()
                if (formStep === 1) {
                  setFormStep(2)
                } else {
                  handleContinueToSetup(e)
                }
              }} className="space-y-4">
                {formStep === 1 && (
                  <>
                    {/* Step 1: Basic Information */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          First name<span className="text-aibos-blue">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm"
                          value={candidateInfo.firstName}
                          onChange={(e) => setCandidateInfo(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Last name<span className="text-aibos-blue">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm"
                          value={candidateInfo.lastName}
                          onChange={(e) => setCandidateInfo(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm"
                        value={candidateInfo.email}
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone number<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9+\s\-()]+"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm"
                        value={candidateInfo.phone}
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+256 700 123 456"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        University<span className="text-aibos-blue">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.25rem'
                        }}
                        value={candidateInfo.university}
                        onChange={(e) => {
                          setCandidateInfo(prev => ({
                            ...prev,
                            university: e.target.value,
                            faculty: '',
                            department: '',
                            course: ''
                          }))
                        }}
                        required
                      >
                        <option value="">Select university</option>
                        <option value="University of Botswana">University of Botswana</option>
                        <option value="Botswana International University of Science & Technology">Botswana International University of Science & Technology (BIUST)</option>
                      </select>
                    </div>

                    {/* Faculty dropdown - only for UB */}
                    {candidateInfo.university === 'University of Botswana' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Faculty<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.faculty}
                          onChange={(e) => {
                            setCandidateInfo(prev => ({
                              ...prev,
                              faculty: e.target.value,
                              department: '',
                              course: ''
                            }))
                          }}
                          required
                        >
                          <option value="">Select faculty</option>
                          {UB_FACULTIES.map((faculty) => (
                            <option key={faculty.name} value={faculty.name}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Department dropdown - only for UB and when faculty is selected */}
                    {candidateInfo.university === 'University of Botswana' && candidateInfo.faculty && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Department<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.department}
                          onChange={(e) => {
                            setCandidateInfo(prev => ({
                              ...prev,
                              department: e.target.value
                            }))
                          }}
                          required
                        >
                          <option value="">Select department</option>
                          {UB_FACULTIES
                            .find(f => f.name === candidateInfo.faculty)
                            ?.departments.map((dept) => (
                              <option key={dept.name} value={dept.name}>
                                {dept.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Course dropdown - only for UB and when department is selected */}
                    {candidateInfo.university === 'University of Botswana' && candidateInfo.department && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Course<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.course}
                          onChange={(e) => setCandidateInfo(prev => ({ ...prev, course: e.target.value }))}
                          required
                        >
                          <option value="">Select course</option>
                          {UB_FACULTIES
                            .find(f => f.name === candidateInfo.faculty)
                            ?.departments.find(d => d.name === candidateInfo.department)
                            ?.courses.map((course) => (
                              <option key={course} value={course}>
                                {course}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Faculty dropdown - only for BIUST */}
                    {candidateInfo.university === 'Botswana International University of Science & Technology' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Faculty<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.faculty}
                          onChange={(e) => {
                            setCandidateInfo(prev => ({
                              ...prev,
                              faculty: e.target.value,
                              department: '',
                              course: ''
                            }))
                          }}
                          required
                        >
                          <option value="">Select faculty</option>
                          {BIUST_FACULTIES.map((faculty) => (
                            <option key={faculty.name} value={faculty.name}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Department dropdown - only for BIUST and when faculty is selected */}
                    {candidateInfo.university === 'Botswana International University of Science & Technology' && candidateInfo.faculty && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Department<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.department}
                          onChange={(e) => {
                            setCandidateInfo(prev => ({
                              ...prev,
                              department: e.target.value,
                              course: ''
                            }))
                          }}
                          required
                        >
                          <option value="">Select department</option>
                          {BIUST_FACULTIES
                            .find(f => f.name === candidateInfo.faculty)
                            ?.departments.map((dept) => (
                              <option key={dept.name} value={dept.name}>
                                {dept.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Course dropdown - only for BIUST and when department is selected */}
                    {candidateInfo.university === 'Botswana International University of Science & Technology' && candidateInfo.department && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Course<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.course}
                          onChange={(e) => setCandidateInfo(prev => ({ ...prev, course: e.target.value }))}
                          required
                        >
                          <option value="">Select course</option>
                          {BIUST_FACULTIES
                            .find(f => f.name === candidateInfo.faculty)
                            ?.departments.find(d => d.name === candidateInfo.department)
                            ?.courses.map((course) => (
                              <option key={course} value={course}>
                                {course}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Year of study - for all universities */}
                    {candidateInfo.university && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Year of study<span className="text-aibos-blue">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.25rem'
                          }}
                          value={candidateInfo.yearOfStudy}
                          onChange={(e) => setCandidateInfo(prev => ({ ...prev, yearOfStudy: e.target.value }))}
                          required
                        >
                          <option value="">Select year</option>
                          <option value="1">Year 1</option>
                          <option value="2">Year 2</option>
                          <option value="3">Year 3</option>
                          <option value="4">Year 4</option>
                          <option value="5">Year 5+</option>
                          <option value="graduated">Graduated</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        GPA<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm"
                        value={candidateInfo.gpa}
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, gpa: e.target.value }))}
                        placeholder="e.g., 3.5/4.0"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-white px-6 py-3 rounded-full font-medium transition-colors"
                    >
                      Continue
                    </button>
                  </>
                )}

                {formStep === 2 && (
                  <>
                    {/* Step 2: Documents and Additional Info */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Profile picture<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-aibos-blue/10 file:text-aibos-blue hover:file:bg-aibos-blue/20"
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, profilePicture: e.target.files?.[0] || null }))}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Upload a professional photo</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Resume/CV<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-aibos-blue/10 file:text-aibos-blue hover:file:bg-aibos-blue/20"
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, resume: e.target.files?.[0] || null }))}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX format</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Academic transcripts<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-aibos-blue/10 file:text-aibos-blue hover:file:bg-aibos-blue/20"
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, academicTranscripts: e.target.files?.[0] || null }))}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">PDF format only</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        GitHub profile<span className="text-aibos-blue">*</span>
                      </label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm"
                        value={candidateInfo.githubProfile}
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, githubProfile: e.target.value }))}
                        placeholder="https://github.com/johndoe"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        How did you hear about us?<span className="text-aibos-blue">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.25rem'
                        }}
                        value={candidateInfo.howDidYouHear}
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, howDidYouHear: e.target.value }))}
                        required
                      >
                        <option value="">Select an option</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="job-board">Job Board</option>
                        <option value="referral">Referral</option>
                        <option value="university">University Career Center</option>
                        <option value="social-media">Social Media</option>
                        <option value="company-website">Company Website</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        How many days per week can you work?<span className="text-aibos-blue">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aibos-blue/20 focus:border-aibos-blue transition-colors text-sm bg-white appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.25rem'
                        }}
                        value={candidateInfo.daysPerWeek}
                        onChange={(e) => setCandidateInfo(prev => ({ ...prev, daysPerWeek: e.target.value }))}
                        required
                      >
                        <option value="">Select days</option>
                        <option value="1">1 day</option>
                        <option value="2">2 days</option>
                        <option value="3">3 days</option>
                        <option value="4">4 days</option>
                        <option value="5">5 days (Full-time)</option>
                        <option value="6">6 days</option>
                        <option value="7">7 days</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-white px-6 py-3 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!candidateInfo.profilePicture || !candidateInfo.resume || !candidateInfo.academicTranscripts || !candidateInfo.githubProfile || !candidateInfo.howDidYouHear || !candidateInfo.daysPerWeek}
                    >
                      Start Interview
                    </button>
                  </>
                )}

                <p className="text-xs text-gray-500 text-center">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-aibos-blue hover:underline">Privacy Policy</a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Setup Screen - Modern interview preparation screen
  if (stage === 'setup') {
    // Intro screen - inspired by the screenshots
    if (setupStep === 'intro') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Start your interview</h1>
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>

            <p className="text-gray-600 mb-8">This interview requires you to be on video.</p>

            {/* Info Cards */}
            <div className="space-y-3 mb-8">
              {/* Duration */}
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Takes about 15 minutes</h3>
                    <p className="text-sm text-gray-600">5 minutes behavioral + 10 minutes technical questions</p>
                  </div>
                </div>
              </div>

              {/* Two column info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1 text-sm">Be natural and confident</h3>
                      <p className="text-xs text-gray-600">Show your qualities that aren&apos;t on your resume or cover letter.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1 text-sm">Quiet spot and strong wifi</h3>
                      <p className="text-xs text-gray-600">Make sure your audio is crisp and clear upon review.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviewed by human */}
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Reviewed by a human</h3>
                    <p className="text-sm text-gray-600">Each call is seen by a recruiter so you&apos;re in capable hands.</p>
                  </div>
                </div>
              </div>

              {/* Accessibility */}
              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-aibos-blue rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Need accessibility help?</h3>
                    <p className="text-xs text-gray-600">Send a request to your recruiter.</p>
                  </div>
                </div>
                <button className="px-4 py-2 border border-gray-900 rounded-full font-medium text-sm text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
                  Request help →
                </button>
              </div>
            </div>

            {/* Join Button */}
            <button
              onClick={() => setSetupStep('tests')}
              className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-white px-6 py-3 rounded-full font-semibold transition-colors"
            >
              Join interview
            </button>
          </div>
        </div>
      )
    }

    // Tests screen - device and connection tests
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden relative flex items-center justify-center p-8">
        {/* Background decoration */}
        <div className="absolute top-20 right-40 w-80 h-80 rounded-full bg-[#0066cc]/10 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-40 left-20 w-80 h-80 rounded-full bg-sky-100 opacity-40 blur-3xl"></div>

        <div className="relative z-10 w-full max-w-5xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Video and audio check</h1>
            <p className="text-gray-600 text-sm">Before you start, make sure your video and audio is set up properly.</p>
            {location && (
              <p className="text-xs text-gray-500 mt-2">
                Location: {location.city}, {location.country}
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Left Column - Audio & Connection */}
            <div className="space-y-6">
              {/* Internet Speed Test */}
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Connection Speed</h3>

                {speedTestStatus === 'idle' && (
                  <div className="text-center py-8">
                    <button
                      onClick={runSpeedTest}
                      className="px-5 py-2.5 bg-aibos-blue hover:bg-aibos-darkBlue text-white rounded-full font-medium transition-colors text-sm"
                    >
                      Test Speed
                    </button>
                  </div>
                )}

                {speedTestStatus === 'testing' && (
                  <div className="text-center py-8">
                    <div className="text-8xl font-bold text-gray-900 mb-4">
                      {internetSpeed || '--'}
                    </div>
                    <div className="text-2xl text-gray-600 font-semibold">Mbps</div>
                    <p className="text-gray-500 mt-4">Testing your connection...</p>
                  </div>
                )}

                {speedTestStatus === 'complete' && internetSpeed !== null && (
                  <div className="text-center py-8">
                    <div className="text-8xl font-bold text-gray-900 mb-4">{internetSpeed}</div>
                    <div className="text-2xl text-gray-600 font-semibold mb-6">Mbps</div>
                    {internetSpeed >= 5 ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Good connection</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Slow connection</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Microphone Test */}
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Microphone</h3>
                <div className="mb-6">
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-aibos-blue focus:border-aibos-blue bg-white text-gray-800"
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                  >
                    {devices.mics.length > 0 ? devices.mics.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || 'Microphone'}
                      </option>
                    )) : <option>Default Microphone</option>}
                  </select>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-900 font-medium text-sm">Say something out loud to test your microphone</p>
                  </div>

                  {/* Audio Level Meter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium">Input level</span>
                      {micReady && (
                        <span className="text-green-600 font-medium">✓ Working</span>
                      )}
                    </div>
                    <div style={{
                      height: '8px',
                      backgroundColor: '#d1d5db',
                      borderRadius: '0',
                      position: 'relative',
                      width: '100%',
                      display: 'block'
                    }}>
                      <div
                        key={audioLevel}
                        style={{
                          height: '8px',
                          width: `${audioLevel}%`,
                          backgroundColor: audioLevel > 70 ? '#ef4444' : audioLevel > 40 ? '#fbbf24' : '#22c55e',
                          borderRadius: '0',
                          transition: 'width 0.1s ease-out',
                          display: 'block'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Video */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Video settings</h3>

                {/* Video Preview */}
                <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-6">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                      <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-white text-lg">Requesting camera access...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Smile you&apos;re on camera!</h4>
                  <p className="text-gray-600 text-sm">Center yourself in the frame and make sure your interviewer can see you clearly.</p>
                </div>

                {/* Camera Selector */}
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-aibos-blue focus:border-aibos-blue bg-white text-gray-800 mb-6"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                >
                  {devices.cameras.length > 0 ? devices.cameras.map(camera => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || 'Camera'}
                    </option>
                  )) : <option>Default Camera</option>}
                </select>

                {/* Status Indicator */}
                {cameraReady && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700 font-medium">Camera is working</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Complete Button */}
          <div className="text-center">
            <button
              onClick={handleStartInterview}
              disabled={!cameraReady || !micReady || speedTestStatus !== 'complete'}
              className="px-8 py-3 bg-aibos-blue hover:bg-aibos-darkBlue text-white rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {speedTestStatus === 'complete' && cameraReady && micReady
                ? 'Start Interview'
                : 'Checking devices...'}
            </button>
            {speedTestStatus !== 'complete' && (
              <p className="text-sm text-gray-500 mt-3">Running connection and device tests...</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Joining Screen
  if (stage === 'joining') {
    return (
      <div className="interview-page min-h-screen flex items-center justify-center pt-10 bg-gradient-to-br from-slate-50 to-blue-50">
        <DemoBanner />
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-aibos-lightBlue to-aibos-blue animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 to-aibos-blue" />
          </div>
          <p className="text-xl font-semibold text-gray-900">Joining your interview...</p>
          <p className="text-gray-600 mt-2 text-sm">Please wait while we connect you with the AI interviewer</p>
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

      {/* Center - AIBOS Logo with Speaking Animation and Text */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="flex flex-col items-center">
          {/* AIBOS Logo with zoom animation */}
          <div className="relative">
            <Image
              src="/aibos-logo.png"
              alt="AIBOS"
              width={240}
              height={240}
              className={`object-contain transition-transform duration-300 ${voiceAgent.isSpeaking ? 'scale-110' : 'scale-100'}`}
            />
          </div>

          {/* Transcript text - terminal style with typing cursor */}
          <div className="mt-8 max-w-6xl px-6">
            <p className="text-sm md:text-base leading-relaxed text-gray-800 text-center font-mono">
              {displayedText || 'Welcome to your interview...'}
              <span className="inline-block w-2 h-5 ml-1 bg-[#0066cc] animate-pulse align-middle"></span>
            </p>
          </div>

          {/* Status badge - below transcript text */}
          <div className="mt-4 flex justify-center">
            <div className="px-5 py-2.5 bg-black/90 backdrop-blur-md rounded-full shadow-2xl border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <span className="text-sm text-white/90 font-medium">
                  {isAudioPlaying ? "I'm speaking..." : voiceAgent.isThinking ? "I'm thinking..." : "I'm listening..."}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom - Video and Timer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 relative z-10">
        <div className="w-full flex items-end justify-between">
          {/* Bottom Left - Candidate Video */}
          <div className="candidate-video w-80 h-60 relative rounded-2xl overflow-hidden shadow-2xl">
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

          {/* Bottom Right - Timer Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="text-center space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Interview Time</div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  of {formatTime(interviewConfig.maxDuration * 60)}
                </div>
              </div>

              <div className="h-px bg-gray-200"></div>

              <button
                onClick={handleEndInterview}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full font-medium transition-colors text-sm"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal - Feedback inspired */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10 relative">
            {/* Icon */}
            <div className="flex justify-between items-start mb-5">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-aibos-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Phew! That was easy, wasn&apos;t it?
            </h2>

            <p className="text-gray-600 mb-7">
              Give your experience a rating and tell us how it went.
            </p>

            {/* Rating */}
            <div className="mb-7">
              <h3 className="text-gray-900 font-semibold mb-3 text-sm">Rate your experience</h3>
              <div className="flex gap-3 justify-between mb-2">
                {['😡', '😟', '😐', '🙂', '😄'].map((emoji, index) => (
                  <button
                    key={index}
                    className="flex-1 py-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-3xl transition-colors hover:scale-105 transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600 px-1">
                <span>Not satisfied</span>
                <span>Very satisfied</span>
              </div>
            </div>

            {/* Feedback */}
            <div className="mb-7">
              <label className="block text-gray-900 font-semibold mb-2 text-sm">
                Give feedback <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-aibos-blue focus:border-aibos-blue resize-none text-sm"
                rows={3}
                placeholder="Was there anything we could improve to make this experience better?"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                setShowCompletionModal(false)
                window.location.href = '/'
              }}
              className="w-full bg-aibos-blue hover:bg-aibos-darkBlue text-white px-6 py-3 rounded-full font-semibold transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
