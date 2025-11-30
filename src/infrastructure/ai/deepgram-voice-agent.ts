/**
 * Deepgram Voice Agent Client
 *
 * Implements real-time conversational AI using Deepgram's Voice Agent API.
 * Handles: STT (Nova-2) + LLM (Claude) + TTS (Aura) in a single WebSocket connection.
 *
 * Reference: https://developers.deepgram.com/docs/voice-agent
 */

export type AgentState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export interface AgentOptions {
  // System prompt for the AI interviewer
  instructions: string

  // Speech-to-text model
  listenModel?: string  // default: 'nova-3'

  // Text-to-speech voice
  voice?: string  // default: 'aura-2-thalia-en'

  // LLM settings
  thinkProvider?: string  // 'anthropic', 'open_ai', 'groq'
  thinkModel?: string    // 'claude-3-5-sonnet', 'gpt-4o-mini', etc.

  // Agent language
  language?: string  // default: 'en'

  // Initial greeting message
  greeting?: string  // e.g., 'Hello! How can I help you today?'

  // Conversation context (for continuing conversations)
  context?: Array<{ role: 'user' | 'assistant', content: string }>

  // Speech playback speed (1.0 = normal, 1.2 = 20% faster, etc.)
  speechSpeed?: number  // default: 1.0
}

export interface AgentCallbacks {
  onConnectionStateChange?: (state: ConnectionState) => void
  onAgentStateChange?: (state: AgentState) => void
  onUserTranscript?: (transcript: string, isFinal: boolean) => void
  onAgentUtterance?: (text: string) => void
  onError?: (error: Error) => void
  onAudioPlaybackStart?: () => void
  onAudioPlaybackEnd?: () => void
}

// Message types for Voice Agent WebSocket V1 API
// Reference: https://developers.deepgram.com/docs/voice-agent-v1-migration
interface SettingsMessage {
  type: 'Settings'
  audio: {
    input: {
      encoding: string
      sample_rate: number
    }
    output: {
      encoding: string
      sample_rate: number
      container: string
    }
  }
  agent: {
    language: string
    listen: {
      provider: {
        type: string
        model: string
      }
    }
    think: {
      provider: {
        type: string
        model: string  // V1 API: model must be inside provider object
      }
      prompt: string  // V1 uses 'prompt' instead of 'instructions'
    }
    speak: {
      provider: {
        type: string
        model: string
      }
    }
    greeting?: string
  }
  context?: {
    messages: Array<{ role: string, content: string }>
  }
}

interface InjectMessage {
  type: 'Inject'
  text: string
}

export class DeepgramVoiceAgent {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null  // For microphone capture (24000 Hz)
  private playbackContext: AudioContext | null = null  // For audio playback (native sample rate)
  private mediaStream: MediaStream | null = null
  private audioProcessor: ScriptProcessorNode | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private audioQueue: ArrayBuffer[] = []
  private isPlaying = false
  private keepAliveInterval: NodeJS.Timeout | null = null

  // Audio processing nodes for smoother playback
  private gainNode: GainNode | null = null
  private lowPassFilter: BiquadFilterNode | null = null
  private highPassFilter: BiquadFilterNode | null = null  // Remove DC offset and low-frequency hum

  private connectionState: ConnectionState = 'disconnected'
  private agentState: AgentState = 'idle'

  private options: AgentOptions
  private callbacks: AgentCallbacks
  private apiKey: string

  // Audio settings
  // Input sample rate must be 24000 Hz for Deepgram's VAD and STT
  // Output sample rate from Deepgram (we'll resample to playback context's native rate)
  private readonly OUTPUT_SAMPLE_RATE = 24000
  // Speech playback speed (1.0 = normal) - avoid artifacts by not changing speed
  private speechSpeed: number = 1.0

  // Track last audio buffer end time for seamless playback
  private lastAudioEndTime: number = 0

  constructor(
    apiKey: string,
    options: AgentOptions,
    callbacks: AgentCallbacks = {}
  ) {
    this.apiKey = apiKey
    this.options = options
    this.callbacks = callbacks
    // Set speech speed (default 1.0, recommended 1.1-1.3 for faster speech)
    this.speechSpeed = options.speechSpeed || 1.0
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return
    }

    this.setConnectionState('connecting')

    try {
      // Request microphone access (per docs: input sample rate 24000)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      // Initialize audio context with 24000 Hz sample rate to match Deepgram's expected input format
      // This is critical - if the sample rate doesn't match what we tell Deepgram, VAD won't detect speech
      this.audioContext = new AudioContext({ sampleRate: 24000 })

      // Create a separate playback context at the browser's native sample rate
      // This avoids resampling artifacts that cause electric/buzzing sounds
      this.playbackContext = new AudioContext()
      console.log('[Deepgram] Playback context sample rate:', this.playbackContext.sampleRate)

      // Set up audio processing chain to reduce artifacts
      // High-pass filter to remove DC offset and low-frequency hum (below 80Hz)
      this.highPassFilter = this.playbackContext.createBiquadFilter()
      this.highPassFilter.type = 'highpass'
      this.highPassFilter.frequency.value = 80  // Cut frequencies below 80Hz (removes hum)
      this.highPassFilter.Q.value = 0.7  // Gentle rolloff

      // Low-pass filter to remove high-frequency noise/artifacts from resampling
      this.lowPassFilter = this.playbackContext.createBiquadFilter()
      this.lowPassFilter.type = 'lowpass'
      this.lowPassFilter.frequency.value = 7500  // Slightly lower cutoff to reduce more artifacts
      this.lowPassFilter.Q.value = 0.5  // Even gentler rolloff to avoid ringing

      // Gain node for volume control
      this.gainNode = this.playbackContext.createGain()
      this.gainNode.gain.value = 1.0

      // Connect: highPass -> lowPass -> gain -> destination
      this.highPassFilter.connect(this.lowPassFilter)
      this.lowPassFilter.connect(this.gainNode)
      this.gainNode.connect(this.playbackContext.destination)

      // Reset audio timing
      this.lastAudioEndTime = 0

      // Connect to Deepgram Voice Agent WebSocket V1 with API key via Sec-WebSocket-Protocol header
      // Browser WebSockets can't set custom headers, so we use the subprotocol parameter
      // Per docs: https://developers.deepgram.com/docs/using-the-sec-websocket-protocol
      const wsUrl = 'wss://agent.deepgram.com/v1/agent/converse'
      console.log('[Deepgram] Connecting to Voice Agent...')
      console.log('[Deepgram] URL:', wsUrl)
      console.log('[Deepgram] API Key present:', !!this.apiKey, 'length:', this.apiKey?.length)
      // Pass 'token' and the API key as subprotocols - server will use these for authentication
      this.ws = new WebSocket(wsUrl, ['token', this.apiKey])

      this.ws.onopen = () => {
        this.sendSettings()
        this.startAudioCapture()
        this.startKeepAlive()
        this.setConnectionState('connected')
        this.setAgentState('listening')
      }

      this.ws.onmessage = (event) => {
        // Handle both binary (Blob) and text (JSON) messages
        if (event.data instanceof Blob) {
          // Binary data is audio from the agent
          this.handleBinaryMessage(event.data)
        } else if (typeof event.data === 'string') {
          this.handleMessage(event.data)
        } else if (event.data instanceof ArrayBuffer) {
          // ArrayBuffer is also binary audio data
          this.handleBinaryAudioBuffer(event.data)
        } else {
          console.warn('[Deepgram] Unknown message type:', typeof event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[Deepgram] WebSocket error:', error)
        console.error('[Deepgram] API Key (first 8 chars):', this.apiKey?.substring(0, 8) + '...')
        console.error('[Deepgram] WebSocket URL:', wsUrl, '(auth via Sec-WebSocket-Protocol)')
        this.callbacks.onError?.(new Error('WebSocket connection failed - check API key and network'))
        this.setConnectionState('error')
      }

      this.ws.onclose = (event) => {
        console.log('[Deepgram] WebSocket closed:', event.code, event.reason)
        this.setConnectionState('disconnected')
        this.cleanup()
      }

    } catch (error) {
      this.setConnectionState('error')
      this.callbacks.onError?.(error as Error)
      throw error
    }
  }

  private sendSettings(): void {
    if (!this.ws) return

    const settings: SettingsMessage = {
      type: 'Settings',  // V1 API uses 'Settings' instead of 'SettingsConfiguration'
      audio: {
        input: {
          encoding: 'linear16',
          sample_rate: 24000  // Per docs: input sample_rate: 24000
        },
        output: {
          encoding: 'linear16',
          sample_rate: this.OUTPUT_SAMPLE_RATE,  // 24000 Hz to match AudioContext and avoid resampling artifacts
          container: 'wav'  // WAV container required for browser playback
        }
      },
      agent: {
        language: this.options.language || 'en',
        listen: {
          provider: {
            type: 'deepgram',
            model: this.options.listenModel || 'nova-3'  // Per docs: nova-3
          }
        },
        think: {
          provider: {
            type: this.options.thinkProvider || 'open_ai',  // Per docs: open_ai
            model: this.options.thinkModel || 'gpt-4o-mini'  // Per docs: gpt-4o-mini
          },
          prompt: this.options.instructions  // V1 API uses 'prompt' instead of 'instructions'
        },
        speak: {
          provider: {
            type: 'deepgram',
            model: this.options.voice || 'aura-2-thalia-en'  // Per docs: aura-2-thalia-en
          }
        },
        greeting: this.options.greeting  // Optional greeting message
      }
    }

    if (this.options.context && this.options.context.length > 0) {
      settings.context = {
        messages: this.options.context.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }
    }

    console.log('[Deepgram] Sending settings:', JSON.stringify(settings, null, 2))
    this.ws.send(JSON.stringify(settings))
  }

  // Keep-alive to maintain WebSocket connection (required every 5 seconds per Deepgram docs)
  private startKeepAlive(): void {
    this.stopKeepAlive()
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }))
      }
    }, 5000)
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }
  }

  private startAudioCapture(): void {
    if (!this.audioContext || !this.mediaStream) return

    console.log('[Deepgram] Starting audio capture, AudioContext sample rate:', this.audioContext.sampleRate)

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)

    let audioChunkCount = 0
    this.audioProcessor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      if (this.agentState === 'speaking') return  // Don't send audio while agent is speaking

      const inputData = event.inputBuffer.getChannelData(0)
      const int16Data = this.floatTo16BitPCM(inputData)

      // Send raw binary audio data (not JSON-wrapped)
      // Deepgram Voice Agent expects binary messages for audio
      this.ws.send(int16Data.buffer)

      // Log every 50 chunks (~8 seconds) to confirm audio is being sent
      audioChunkCount++
      if (audioChunkCount % 50 === 1) {
        console.log('[Deepgram] Sending audio chunk', audioChunkCount, '- agentState:', this.agentState)
      }
    }

    this.mediaStreamSource.connect(this.audioProcessor)
    this.audioProcessor.connect(this.audioContext.destination)
    console.log('[Deepgram] Audio capture started')
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      switch (message.type) {
        case 'SettingsApplied':
          console.log('[Deepgram] Settings applied successfully')
          break

        case 'UserStartedSpeaking':
          console.log('[Deepgram] User started speaking')
          this.setAgentState('listening')
          break

        case 'UserStoppedSpeaking':
          console.log('[Deepgram] User stopped speaking')
          // User finished speaking, agent will process
          break

        case 'ConversationText':
          // Transcript of user or agent speech
          const role = message.role // 'user' or 'assistant'
          const content = message.content || ''
          if (role === 'user') {
            this.callbacks.onUserTranscript?.(content, true)
          } else if (role === 'assistant') {
            this.callbacks.onAgentUtterance?.(content)
          }
          break

        case 'Transcript':
          // Real-time transcript of user speech (interim results)
          const transcript = message.transcript || message.channel?.alternatives?.[0]?.transcript || ''
          const isFinal = message.is_final || message.speech_final || false
          if (transcript) {
            this.callbacks.onUserTranscript?.(transcript, isFinal)
          }
          break

        case 'AgentStartedSpeaking':
          console.log('[Deepgram] Agent started speaking')
          this.setAgentState('speaking')
          this.callbacks.onAudioPlaybackStart?.()
          break

        case 'AgentStoppedSpeaking':
          console.log('[Deepgram] Agent stopped speaking')
          this.setAgentState('listening')
          this.callbacks.onAudioPlaybackEnd?.()
          break

        case 'AgentAudioDone':
          console.log('[Deepgram] Agent audio done')
          break

        case 'AgentAudio':
          // Agent audio response (base64 encoded WAV)
          if (message.audio) {
            this.playAudio(message.audio)
          }
          break

        case 'AgentThinking':
          console.log('[Deepgram] Agent thinking')
          this.setAgentState('thinking')
          break

        case 'AgentText':
        case 'AgentUtterance':
          // Text of what the agent is saying
          const text = message.text || message.content || ''
          if (text) {
            console.log('[Deepgram] Agent utterance:', text.substring(0, 50) + '...')
            this.callbacks.onAgentUtterance?.(text)
          }
          break

        case 'Welcome':
          console.log('[Deepgram] Connected to Voice Agent')
          break

        case 'Error':
          console.error('[Deepgram] Error:', message.message || message.description)
          this.callbacks.onError?.(new Error(message.message || message.description || 'Unknown error'))
          break

        case 'Warning':
          console.warn('[Deepgram] Warning:', message.message || message.description)
          break

        default:
          console.log('[Deepgram] Message:', message.type, message)
      }
    } catch (error) {
      console.error('[Deepgram] Error parsing message:', error)
    }
  }

  private async handleBinaryMessage(blob: Blob): Promise<void> {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      this.handleBinaryAudioBuffer(arrayBuffer)
    } catch (error) {
      console.error('[Deepgram] Error handling binary message:', error)
    }
  }

  private handleBinaryAudioBuffer(audioData: ArrayBuffer): void {
    // Binary messages from Deepgram are audio data for playback
    // Queue it directly for playback
    if (audioData.byteLength > 0) {
      this.audioQueue.push(audioData)
      if (!this.isPlaying) {
        this.playNextInQueue()
      }
    }
  }

  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.playbackContext) {
      console.warn('[Deepgram] No playback context for audio')
      return
    }

    try {
      const audioData = this.base64ToArrayBuffer(base64Audio)

      // Queue the audio data for playback
      this.audioQueue.push(audioData)

      if (!this.isPlaying) {
        this.playNextInQueue()
      }
    } catch (error) {
      console.error('[Deepgram] Error queuing audio:', error)
    }
  }

  private async playNextInQueue(): Promise<void> {
    if (this.audioQueue.length === 0 || !this.playbackContext || !this.highPassFilter) {
      this.isPlaying = false
      this.lastAudioEndTime = 0  // Reset timing when queue is empty
      return
    }

    this.isPlaying = true
    const audioData = this.audioQueue.shift()!

    try {
      // Resume playback context if suspended (required by browser autoplay policies)
      if (this.playbackContext.state === 'suspended') {
        await this.playbackContext.resume()
      }

      let audioBuffer: AudioBuffer

      // Check if data has WAV header (starts with "RIFF")
      const header = new Uint8Array(audioData.slice(0, 4))
      const isWav = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46

      if (isWav) {
        // Decode WAV file using browser's decodeAudioData
        // The playback context will handle resampling to its native rate
        audioBuffer = await this.playbackContext.decodeAudioData(audioData.slice(0))
      } else {
        // Raw linear16 PCM data - convert manually to AudioBuffer
        audioBuffer = this.pcmToAudioBuffer(audioData)
      }

      const source = this.playbackContext.createBufferSource()
      source.buffer = audioBuffer
      // Keep playback at normal speed to avoid artifacts
      source.playbackRate.value = 1.0

      // Connect through the audio processing chain (highPass -> lowPass -> gain -> destination)
      source.connect(this.highPassFilter)

      // Schedule playback to avoid gaps/overlaps
      const currentTime = this.playbackContext.currentTime
      const startTime = Math.max(currentTime, this.lastAudioEndTime)

      // Update end time for next chunk
      this.lastAudioEndTime = startTime + audioBuffer.duration

      source.onended = () => this.playNextInQueue()
      source.start(startTime)
    } catch (error) {
      console.error('[Deepgram] Error playing audio:', error)
      // Try next audio chunk
      this.playNextInQueue()
    }
  }

  // Convert raw linear16 PCM data to AudioBuffer with proper resampling
  private pcmToAudioBuffer(pcmData: ArrayBuffer): AudioBuffer {
    const int16Array = new Int16Array(pcmData)
    const numSamples = int16Array.length

    // Get the playback context's native sample rate
    const nativeSampleRate = this.playbackContext!.sampleRate
    const inputSampleRate = this.OUTPUT_SAMPLE_RATE  // 24000 Hz from Deepgram

    // Calculate resampled length
    const resampleRatio = nativeSampleRate / inputSampleRate
    const resampledLength = Math.floor(numSamples * resampleRatio)

    // Create AudioBuffer at the native sample rate to avoid browser resampling artifacts
    const audioBuffer = this.playbackContext!.createBuffer(
      1,  // mono channel
      resampledLength,
      nativeSampleRate
    )

    const channelData = audioBuffer.getChannelData(0)

    // Helper function to get sample at index (clamped, converted to float)
    const getSample = (index: number): number => {
      const clampedIndex = Math.max(0, Math.min(numSamples - 1, index))
      return int16Array[clampedIndex] / 32768
    }

    // Cubic interpolation resampling (smoother than linear, reduces artifacts)
    for (let i = 0; i < resampledLength; i++) {
      const srcIndex = i / resampleRatio
      const srcIndexFloor = Math.floor(srcIndex)
      const fraction = srcIndex - srcIndexFloor

      // Get 4 samples for cubic interpolation
      const s0 = getSample(srcIndexFloor - 1)
      const s1 = getSample(srcIndexFloor)
      const s2 = getSample(srcIndexFloor + 1)
      const s3 = getSample(srcIndexFloor + 2)

      // Cubic Hermite interpolation (Catmull-Rom spline)
      const a0 = -0.5 * s0 + 1.5 * s1 - 1.5 * s2 + 0.5 * s3
      const a1 = s0 - 2.5 * s1 + 2 * s2 - 0.5 * s3
      const a2 = -0.5 * s0 + 0.5 * s2
      const a3 = s1

      // Evaluate cubic polynomial
      const t = fraction
      channelData[i] = a0 * t * t * t + a1 * t * t + a2 * t + a3
    }

    return audioBuffer
  }

  // Inject a text message to the agent (as if user said it)
  injectMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const message: InjectMessage = {
      type: 'Inject',
      text
    }
    this.ws.send(JSON.stringify(message))
  }

  // Update the agent's prompt mid-conversation (V1 API)
  updateInstructions(instructions: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    this.ws.send(JSON.stringify({
      type: 'UpdatePrompt',  // V1 API uses 'UpdatePrompt' instead of 'UpdateInstructions'
      prompt: instructions   // V1 API uses 'prompt' instead of 'instructions'
    }))
  }

  // Interrupt the agent while it's speaking
  interrupt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    this.ws.send(JSON.stringify({ type: 'Interrupt' }))
    this.audioQueue = []  // Clear audio queue
    this.isPlaying = false
    this.lastAudioEndTime = 0  // Reset audio timing
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.stopKeepAlive()
    if (this.audioProcessor) {
      this.audioProcessor.disconnect()
      this.audioProcessor = null
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect()
      this.mediaStreamSource = null
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    // Cleanup audio processing nodes
    if (this.highPassFilter) {
      this.highPassFilter.disconnect()
      this.highPassFilter = null
    }
    if (this.lowPassFilter) {
      this.lowPassFilter.disconnect()
      this.lowPassFilter = null
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.playbackContext) {
      this.playbackContext.close()
      this.playbackContext = null
    }
    this.audioQueue = []
    this.isPlaying = false
    this.lastAudioEndTime = 0
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state
    this.callbacks.onConnectionStateChange?.(state)
  }

  private setAgentState(state: AgentState): void {
    this.agentState = state
    this.callbacks.onAgentStateChange?.(state)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getAgentState(): AgentState {
    return this.agentState
  }

  // Utility functions
  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return output
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}
