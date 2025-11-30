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
  private audioContext: AudioContext | null = null  // Single AudioContext for both capture and playback
  private mediaStream: MediaStream | null = null
  private audioProcessor: ScriptProcessorNode | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private audioQueue: ArrayBuffer[] = []
  private isPlaying = false
  private keepAliveInterval: NodeJS.Timeout | null = null

  // For volume visualization (optional, like official demo)
  private analyzerNode: AnalyserNode | null = null

  private connectionState: ConnectionState = 'disconnected'
  private agentState: AgentState = 'idle'

  private options: AgentOptions
  private callbacks: AgentCallbacks
  private apiKey: string

  // Audio settings - simplified to match official Deepgram demo
  // Input: capture at 48kHz (browser default), downsample to 16kHz for Deepgram
  private readonly INPUT_SAMPLE_RATE = 16000  // What we send to Deepgram
  // Output: Deepgram sends 24kHz audio
  private readonly OUTPUT_SAMPLE_RATE = 24000

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
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return
    }

    this.setConnectionState('connecting')

    try {
      // Request microphone access - let browser use default sample rate (usually 48kHz)
      // We'll downsample to 16kHz before sending to Deepgram (matching official demo)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,  // Disabled per official demo
        }
      })

      // Single AudioContext for both capture and playback (simplified approach)
      // Using default sample rate (usually 48kHz on modern browsers)
      this.audioContext = new AudioContext()
      console.log('[Deepgram] AudioContext sample rate:', this.audioContext.sampleRate)

      // Create analyzer for volume visualization (like official demo)
      this.analyzerNode = this.audioContext.createAnalyser()
      this.analyzerNode.connect(this.audioContext.destination)

      // Reset audio timing
      this.lastAudioEndTime = 0

      // Connect to Deepgram Voice Agent WebSocket V1
      const wsUrl = 'wss://agent.deepgram.com/v1/agent/converse'
      console.log('[Deepgram] Connecting to Voice Agent...')
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
      type: 'Settings',
      audio: {
        input: {
          encoding: 'linear16',
          sample_rate: this.INPUT_SAMPLE_RATE  // 16000 Hz (matching official demo)
        },
        output: {
          encoding: 'linear16',
          sample_rate: this.OUTPUT_SAMPLE_RATE,  // 24000 Hz from Deepgram
          container: 'none'  // Raw PCM - we'll handle conversion ourselves
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

  // Keep-alive to maintain WebSocket connection (every 6 seconds per official demo)
  private startKeepAlive(): void {
    this.stopKeepAlive()
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }))
      }
    }, 6000)
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }
  }

  private startAudioCapture(): void {
    if (!this.audioContext || !this.mediaStream) return

    const nativeSampleRate = this.audioContext.sampleRate
    console.log('[Deepgram] Starting audio capture, native sample rate:', nativeSampleRate)

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)

    let audioChunkCount = 0
    this.audioProcessor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      if (this.agentState === 'speaking') return  // Don't send audio while agent is speaking

      const inputData = event.inputBuffer.getChannelData(0)

      // Downsample from native rate (e.g., 48kHz) to 16kHz (matching official demo)
      const downsampledData = this.downsample(inputData, nativeSampleRate, this.INPUT_SAMPLE_RATE)
      const int16Data = this.floatTo16BitPCM(downsampledData)

      // Send raw binary audio data
      this.ws.send(int16Data.buffer)

      // Log every 50 chunks to confirm audio is being sent
      audioChunkCount++
      if (audioChunkCount % 50 === 1) {
        console.log('[Deepgram] Sending audio chunk', audioChunkCount)
      }
    }

    this.mediaStreamSource.connect(this.audioProcessor)
    this.audioProcessor.connect(this.audioContext.destination)
    console.log('[Deepgram] Audio capture started')
  }

  // Downsample audio from one sample rate to another (from official Deepgram demo)
  private downsample(buffer: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return buffer
    }
    const sampleRateRatio = fromSampleRate / toSampleRate
    const newLength = Math.round(buffer.length / sampleRateRatio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetBuffer = 0
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
      let accum = 0
      let count = 0
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i]
        count++
      }
      result[offsetResult] = accum / count
      offsetResult++
      offsetBuffer = nextOffsetBuffer
    }
    return result
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
    if (!this.audioContext) {
      console.warn('[Deepgram] No audio context for playback')
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
    if (this.audioQueue.length === 0 || !this.audioContext || !this.analyzerNode) {
      this.isPlaying = false
      this.lastAudioEndTime = 0  // Reset timing when queue is empty
      return
    }

    this.isPlaying = true
    const audioData = this.audioQueue.shift()!

    try {
      // Resume context if suspended (required by browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Create audio buffer from raw PCM data (simplified, like official demo)
      const audioBuffer = this.createAudioBuffer(audioData)
      if (!audioBuffer) {
        this.playNextInQueue()
        return
      }

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer

      // Simple connection: source -> analyzer -> destination (like official demo)
      source.connect(this.analyzerNode)

      // Schedule playback to avoid gaps/overlaps
      const currentTime = this.audioContext.currentTime
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

  // Create AudioBuffer from raw linear16 PCM data (simplified, from official Deepgram demo)
  private createAudioBuffer(pcmData: ArrayBuffer): AudioBuffer | null {
    const int16Array = new Int16Array(pcmData)
    if (int16Array.length === 0) {
      console.error('[Deepgram] Received audio data is empty')
      return null
    }

    // Create buffer at Deepgram's output sample rate (24kHz)
    // The browser will handle any necessary resampling
    const audioBuffer = this.audioContext!.createBuffer(
      1,  // mono channel
      int16Array.length,
      this.OUTPUT_SAMPLE_RATE  // 24000 Hz
    )

    const channelData = audioBuffer.getChannelData(0)

    // Convert linear16 PCM to float [-1, 1] (simple conversion from official demo)
    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768
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
    if (this.analyzerNode) {
      this.analyzerNode.disconnect()
      this.analyzerNode = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
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
