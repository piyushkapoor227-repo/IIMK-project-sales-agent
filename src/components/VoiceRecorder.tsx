// Voice capture: uses the browser SpeechRecognition API for live dictation where
// available (Chrome/Edge), always falling back to a typed transcript. The
// transcript string is what Phase 3's structure-voice-note function consumes.
// Author: Piyush Kapoor.
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { TextArea } from './primitives'

// Minimal typings for the vendor-prefixed API.
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export function VoiceRecorder({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const baseRef = useRef('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const rec = getRecognition()
    setSupported(!!rec)
    if (!rec) return

    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-IN'
    rec.onresult = (e) => {
      let chunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += e.results[i][0].transcript
      }
      const joined = `${baseRef.current} ${chunk}`.trim()
      onChangeRef.current(joined)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec

    return () => {
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
    }
  }, [])

  function toggle() {
    const rec = recognitionRef.current
    if (!rec) return
    if (listening) {
      rec.stop()
      setListening(false)
    } else {
      baseRef.current = value
      rec.start()
      setListening(true)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {supported ? (
          <Button
            type="button"
            variant={listening ? 'primary' : 'outline'}
            className="w-auto"
            onClick={toggle}
          >
            {listening ? '● Stop dictation' : 'Start dictation'}
          </Button>
        ) : (
          <p className="text-xs text-slate-400">
            Live dictation isn't supported in this browser — type your visit notes below.
          </p>
        )}
      </div>
      <TextArea
        label="Voice / visit transcript"
        id="voice_transcript"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Spoke to the store owner about slow-moving SKUs, competitor ran a 10% promo…"
      />
    </div>
  )
}
