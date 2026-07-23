import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

interface UseSpeechRecognitionOptions {
  onFinalResult: (text: string) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

export function useSpeechRecognition({ onFinalResult, onError, onEnd }: UseSpeechRecognitionOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const supported = getSpeechRecognitionCtor() != null

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 최신 버전을 사용해주세요.')
      return
    }
    const recognition = new Ctor()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
      }
      if (finalText) onFinalResult(finalText)
    }
    recognition.onerror = (event: any) => {
      onError?.(`음성 인식 오류: ${event.error}`)
      setIsRecording(false)
    }
    recognition.onend = () => {
      setIsRecording(false)
      onEnd?.()
    }
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [onFinalResult, onError, onEnd])

  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  return { isRecording, supported, start, stop }
}
