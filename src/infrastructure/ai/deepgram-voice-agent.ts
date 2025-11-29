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
  listenModel?: string  // default: 'nova-2'

  // Text-to-speech voice
  voice?: string  // default: 'aura-asteria-en'

  // LLM settings
  thinkProvider?: string  // 'anthropic', 'openai', 'groq'
  thinkModel?: string    // 'claude-3-haiku-20240307', 'gpt-4o-mini', etc.

  // Conversation context (for continuing conversations)
  context?: Array<{ role: 'user' | 'assistant', content: string }>
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

// Message types for Voice Agent WebSocket
interface SettingsMessage {
  type: 'SettingsConfiguration'
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
    listen: {
      model: string
    }
    think: {
      provider: {
        type: string
      }
      model: string
      instructions: string
    }
    speak: {
      model: string
    }
  }
  context?: {
    messages: Array<{ role: string, content: string }>
  }
}

interface AudioMessage {
  type: 'Audio'
  audio: string  // base64 encoded
}

interface InjectMessage {
  type: 'Inject'
  text: string
}

export class DeepgramVoiceAgent {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private audioProcessor: ScriptProcessorNode | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private audioQueue: ArrayBuffer[] = []
  private isPlaying = false
  private keepAliveInterval: NodeJS.Timeout | null = null

  private connectionState: ConnectionState = 'disconnected'
  private agentState: AgentState = 'idle'

  private options: AgentOptions
  private callbacks: AgentCallbacks
  private apiKey: string

  // Audio playback settings - match what we request from Deepgram
  private readonly OUTPUT_SAMPLE_RATE = 24000

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
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      // Initialize audio context - use default sample rate for output playback
      this.audioContext = new AudioContext()

      // Connect to Deepgram Voice Agent WebSocket V1 with API key via subprotocol
      // Per docs: https://developers.deepgram.com/docs/using-the-sec-websocket-protocol
      const wsUrl = `wss://agent.deepgram.com/v1/agent/converse`
      console.log('[Deepgram] Connecting to Voice Agent...')
      console.log('[Deepgram] URL:', wsUrl)
      console.log('[Deepgram] API Key present:', !!this.apiKey, 'length:', this.apiKey?.length)
      this.ws = new WebSocket(wsUrl, ['token', this.apiKey])

      this.ws.onopen = () => {
        this.sendSettings()
        this.startAudioCapture()
        this.startKeepAlive()
        this.setConnectionState('connected')
        this.setAgentState('listening')
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onerror = (error) => {
        console.error('[Deepgram] WebSocket error:', error)
        console.error('[Deepgram] API Key (first 8 chars):', this.apiKey?.substring(0, 8) + '...')
        console.error('[Deepgram] WebSocket URL:', wsUrl)
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
      type: 'SettingsConfiguration',
      audio: {
        input: {
          encoding: 'linear16',
          sample_rate: 16000
        },
        output: {
          encoding: 'linear16',
          sample_rate: this.OUTPUT_SAMPLE_RATE,
          container: 'wav'  // WAV container required for browser playback
        }
      },
      agent: {
        listen: {
          model: this.options.listenModel || 'nova-2'
        },
        think: {
          provider: {
            type: this.options.thinkProvider || 'anthropic'
          },
          model: this.options.thinkModel || 'claude-sonnet-4-20250514',
          instructions: this.options.instructions
        },
        speak: {
          model: this.options.voice || 'aura-asteria-en'
        }
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

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.audioProcessor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      if (this.agentState === 'speaking') return  // Don't send audio while agent is speaking

      const inputData = event.inputBuffer.getChannelData(0)
      const int16Data = this.floatTo16BitPCM(inputData)
      const base64Audio = this.arrayBufferToBase64(int16Data.buffer as ArrayBuffer)

      this.ws.send(JSON.stringify({
        type: 'Audio',
        audio: base64Audio
      }))
    }

    this.mediaStreamSource.connect(this.audioProcessor)
    this.audioProcessor.connect(this.audioContext.destination)
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
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const audioData = this.audioQueue.shift()!

    try {
      // Resume audio context if suspended (required by browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Decode the WAV audio data
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0))

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      source.onended = () => this.playNextInQueue()
      source.start()
    } catch (error) {
      console.error('[Deepgram] Error playing audio:', error)
      // Try next audio chunk
      this.playNextInQueue()
    }
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

  // Update the agent's instructions mid-conversation
  updateInstructions(instructions: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    this.ws.send(JSON.stringify({
      type: 'UpdateInstructions',
      instructions
    }))
  }

  // Interrupt the agent while it's speaking
  interrupt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    this.ws.send(JSON.stringify({ type: 'Interrupt' }))
    this.audioQueue = []  // Clear audio queue
    this.isPlaying = false
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
    this.audioQueue = []
    this.isPlaying = false
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
