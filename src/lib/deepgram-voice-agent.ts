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
  instructions: string
  listenModel?: string
  voice?: string
  thinkProvider?: string
  thinkModel?: string
  language?: string
  greeting?: string
  context?: Array<{ role: 'user' | 'assistant', content: string }>
  speechSpeed?: number
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

export class DeepgramVoiceAgent {
  private ws: WebSocket | null = null
  private microphoneAudioContext: AudioContext | null = null
  private playbackAudioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private audioProcessor: ScriptProcessorNode | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private scheduledAudioSources: AudioBufferSourceNode[] = []
  private shouldSendMicAudio = true
  private analyzerNode: AnalyserNode | null = null
  private connectionState: ConnectionState = 'disconnected'
  private agentState: AgentState = 'idle'
  private options: AgentOptions
  private callbacks: AgentCallbacks
  private readonly INPUT_SAMPLE_RATE = 16000
  private readonly OUTPUT_SAMPLE_RATE = 24000
  private startTimeRef = { current: -1 }
  private keepAliveInterval: NodeJS.Timeout | null = null

  constructor(
    options: AgentOptions,
    callbacks: AgentCallbacks = {}
  ) {
    this.options = options
    this.callbacks = callbacks
  }

  private async getAuthToken(): Promise<string> {
    const result = await fetch('/api/deepgram-token', { method: 'POST' })
    const data = await result.json()
    const token = data.key || data.token || data.access_token
    console.log('[Deepgram] Auth token received:', token ? `${token.substring(0, 10)}...` : 'MISSING')
    console.log('[Deepgram] Token response:', data)
    return token
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return
    }

    this.setConnectionState('connecting')

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      this.microphoneAudioContext = new AudioContext({
        latencyHint: 'interactive'
      })
      console.log('[Deepgram] Microphone AudioContext sample rate:', this.microphoneAudioContext.sampleRate)

      this.playbackAudioContext = new AudioContext({
        sampleRate: 24000,
        latencyHint: 'interactive'
      })
      console.log('[Deepgram] Playback AudioContext sample rate:', this.playbackAudioContext.sampleRate)

      this.analyzerNode = this.playbackAudioContext.createAnalyser()
      this.analyzerNode.fftSize = 2048
      this.analyzerNode.smoothingTimeConstant = 0.96

      await this.setupMicrophoneProcessing()

      const token = await this.getAuthToken()

      console.log('[Deepgram] Creating WebSocket with token:', token ? `${token.substring(0, 10)}...` : 'MISSING')

      this.ws = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', [
        'bearer',
        token
      ])

      this.ws.binaryType = 'arraybuffer'

      this.ws.onopen = () => {
        console.log('[Deepgram] WebSocket connected')
        this.setConnectionState('connected')

        const config = {
          type: 'Settings',
          audio: {
            input: {
              encoding: 'linear16',
              sample_rate: this.INPUT_SAMPLE_RATE
            },
            output: {
              encoding: 'linear16',
              sample_rate: this.OUTPUT_SAMPLE_RATE,
              container: 'none'
            }
          },
          agent: {
            language: this.options.language || 'en',
            listen: {
              provider: {
                type: 'deepgram',
                model: this.options.listenModel || 'nova-3'
              },
              eot_threshold: 0.7,
              eot_timeout_ms: 1500
            },
            think: {
              provider: {
                type: this.options.thinkProvider || 'open_ai',
                model: this.options.thinkModel || 'gpt-4o'
              },
              prompt: this.options.instructions
            },
            speak: {
              provider: {
                type: 'deepgram',
                model: this.options.voice || 'aura-asteria-en'
              }
            },
            greeting: this.options.greeting
          },
          experimental: true
        }

        console.log('[Deepgram] Sending config:', JSON.stringify(config, null, 2))
        this.ws!.send(JSON.stringify(config))

        this.startMicrophone()
        this.setAgentState('listening')

        this.keepAliveInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'KeepAlive' }))
          }
        }, 10000)
      }

      this.ws.onerror = (error) => {
        console.error('[Deepgram] WebSocket error:', error)
        this.setConnectionState('error')
        this.callbacks.onError?.(new Error('WebSocket error'))
      }

      this.ws.onclose = () => {
        console.log('[Deepgram] WebSocket closed')
        this.setConnectionState('disconnected')
        if (this.keepAliveInterval) {
          clearInterval(this.keepAliveInterval)
          this.keepAliveInterval = null
        }
      }

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryAudio(event.data)
        } else {
          try {
            const data = JSON.parse(event.data)
            console.log('[Deepgram] Message:', data)

            if (data.type === 'SettingsApplied') {
              console.log('[Deepgram] Settings applied')
            } else if (data.type === 'UserStartedSpeaking') {
              this.setAgentState('idle')
              this.clearAudioBuffer()
            } else if (data.type === 'AgentThinking') {
              this.setAgentState('thinking')
            } else if (data.type === 'AgentStartedSpeaking') {
              this.setAgentState('speaking')
              this.callbacks.onAudioPlaybackStart?.()
            } else if (data.type === 'AgentAudioDone') {
              this.setAgentState('listening')
              // Calculate how long until scheduled audio finishes playing
              const currentTime = this.playbackAudioContext!.currentTime
              const timeUntilDone = Math.max(0, (this.startTimeRef.current - currentTime) * 1000)
              // Wait for audio to actually finish before calling callback
              setTimeout(() => {
                this.callbacks.onAudioPlaybackEnd?.()
              }, timeUntilDone)
            } else if (data.type === 'ConversationText') {
              if (data.role === 'user') {
                this.callbacks.onUserTranscript?.(data.content, true)
              } else if (data.role === 'assistant') {
                this.callbacks.onAgentUtterance?.(data.content)
              }
            }
          } catch (error) {
            console.error('[Deepgram] Failed to parse message:', error)
          }
        }
      }

    } catch (error) {
      console.error('[Deepgram] Connection failed:', error)
      this.setConnectionState('error')
      this.callbacks.onError?.(error as Error)
      throw error
    }
  }

  private async setupMicrophoneProcessing(): Promise<void> {
    if (!this.microphoneAudioContext || !this.mediaStream) return

    this.mediaStreamSource = this.microphoneAudioContext.createMediaStreamSource(this.mediaStream)

    const bufferSize = 4096
    this.audioProcessor = this.microphoneAudioContext.createScriptProcessor(bufferSize, 1, 1)

    this.mediaStreamSource.connect(this.audioProcessor)
    this.audioProcessor.connect(this.microphoneAudioContext.destination)
  }

  private startMicrophone(): void {
    if (!this.audioProcessor) return

    this.audioProcessor.onaudioprocess = (event) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.shouldSendMicAudio) return

      const inputData = event.inputBuffer.getChannelData(0)

      const actualMicRate = this.microphoneAudioContext!.sampleRate
      const downsampledData = this.downsample(inputData, actualMicRate, this.INPUT_SAMPLE_RATE)
      const audioDataToSend = this.convertFloat32ToInt16(downsampledData)

      try {
        this.ws.send(audioDataToSend)
      } catch (error) {
        console.error('[Deepgram] Failed to send audio:', error)
      }
    }
  }

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
      let accum = 0, count = 0
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

  private convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
    let l = buffer.length
    const buf = new Int16Array(l)
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7fff
    }
    return buf.buffer
  }

  private handleBinaryAudio(data: ArrayBuffer): void {
    const audioBuffer = this.createAudioBuffer(data)
    if (!audioBuffer) return

    const source = this.playAudioBuffer(audioBuffer)
    this.scheduledAudioSources.push(source)
  }

  private createAudioBuffer(data: ArrayBuffer): AudioBuffer | null {
    const audioDataView = new Int16Array(data)
    if (audioDataView.length === 0) {
      console.error('[Deepgram] Received audio data is empty')
      return null
    }

    const buffer = this.playbackAudioContext!.createBuffer(
      1,
      audioDataView.length,
      this.OUTPUT_SAMPLE_RATE
    )
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < audioDataView.length; i++) {
      channelData[i] = audioDataView[i] / 32768
    }

    return buffer
  }

  private playAudioBuffer(buffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.playbackAudioContext!.createBufferSource()
    source.buffer = buffer
    source.connect(this.analyzerNode!)
    this.analyzerNode!.connect(this.playbackAudioContext!.destination)

    const currentTime = this.playbackAudioContext!.currentTime
    if (this.startTimeRef.current < currentTime) {
      this.startTimeRef.current = currentTime
    }

    source.start(this.startTimeRef.current)
    this.startTimeRef.current += buffer.duration

    return source
  }

  private clearAudioBuffer(): void {
    this.scheduledAudioSources.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.scheduledAudioSources = []
  }

  getVolume(): number {
    if (!this.analyzerNode) return 0

    const dataArray = new Uint8Array(this.analyzerNode.frequencyBinCount)
    this.analyzerNode.getByteFrequencyData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return sum / dataArray.length / 255
  }

  injectMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Deepgram] Cannot inject message - not connected')
      return
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'Inject',
        text
      }))
      console.log('[Deepgram] Injected message:', text)
    } catch (error) {
      console.error('[Deepgram] Failed to inject message:', error)
    }
  }

  disconnect(): void {
    console.log('[Deepgram] Disconnecting...')

    if (this.audioProcessor) {
      this.audioProcessor.onaudioprocess = null
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

    if (this.microphoneAudioContext) {
      this.microphoneAudioContext.close()
      this.microphoneAudioContext = null
    }

    if (this.playbackAudioContext) {
      this.playbackAudioContext.close()
      this.playbackAudioContext = null
    }

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.setConnectionState('disconnected')
    this.setAgentState('idle')
    this.scheduledAudioSources = []
    this.shouldSendMicAudio = true
    this.startTimeRef.current = -1
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state
    this.callbacks.onConnectionStateChange?.(state)
  }

  private setAgentState(state: AgentState): void {
    this.agentState = state

    if (state === 'speaking' || state === 'thinking') {
      this.shouldSendMicAudio = false
      console.log('[Deepgram] Microphone muted (agent is ' + state + ')')
    } else {
      this.shouldSendMicAudio = true
      console.log('[Deepgram] Microphone unmuted (agent is ' + state + ')')
    }

    this.callbacks.onAgentStateChange?.(state)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getAgentState(): AgentState {
    return this.agentState
  }
}
