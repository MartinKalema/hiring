import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk'

export interface TranscriptionResult {
  transcript: string
  isFinal: boolean
  confidence: number
  words: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
}

export interface TranscriberCallbacks {
  onTranscript: (result: TranscriptionResult) => void
  onError: (error: Error) => void
  onClose: () => void
}

export class DeepgramTranscriber {
  private client: ReturnType<typeof createClient>
  private connection: LiveClient | null = null
  private callbacks: TranscriberCallbacks | null = null

  constructor(apiKey?: string) {
    this.client = createClient(apiKey || process.env.DEEPGRAM_API_KEY || '')
  }

  async startStreaming(callbacks: TranscriberCallbacks): Promise<void> {
    this.callbacks = callbacks

    this.connection = this.client.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
      encoding: 'linear16',
      sample_rate: 16000,
    })

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Deepgram connection opened')
    })

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]

      if (transcript) {
        const result: TranscriptionResult = {
          transcript: transcript.transcript || '',
          isFinal: data.is_final || false,
          confidence: transcript.confidence || 0,
          words: (transcript.words || []).map((w: { word: string; start: number; end: number; confidence: number }) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
          })),
        }

        if (result.transcript && this.callbacks) {
          this.callbacks.onTranscript(result)
        }
      }
    })

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('Deepgram error:', error)
      this.callbacks?.onError(new Error(String(error)))
    })

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed')
      this.callbacks?.onClose()
    })
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.connection) {
      this.connection.send(audioData)
    }
  }

  async stopStreaming(): Promise<void> {
    if (this.connection) {
      this.connection.requestClose()
      this.connection = null
    }
  }

  isConnected(): boolean {
    return this.connection !== null
  }
}

// Browser-side helper to capture microphone audio
export function createAudioCapture(
  onAudioData: (data: ArrayBuffer) => void
): {
  start: () => Promise<void>
  stop: () => void
} {
  let mediaRecorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null

  return {
    start: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      audioContext = new AudioContext({ sampleRate: 16000 })
      source = audioContext.createMediaStreamSource(stream)
      processor = audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        // Convert float32 to int16
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        onAudioData(int16Data.buffer)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    },

    stop: () => {
      if (processor) {
        processor.disconnect()
        processor = null
      }
      if (source) {
        source.disconnect()
        source = null
      }
      if (audioContext) {
        audioContext.close()
        audioContext = null
      }
    },
  }
}
