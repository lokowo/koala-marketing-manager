'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceInputOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (text: string) => void;
  onEnd?: () => void;
  mode?: 'browser' | 'whisper';
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    lang = 'zh-CN',
    continuous = true,
    onResult,
    onEnd,
    mode = 'browser',
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported =
    typeof window !== 'undefined' &&
    (mode === 'whisper' ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

  const startBrowserListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('您的浏览器不支持语音输入，请使用 Chrome');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        }
      }
      if (finalText) {
        setTranscript(prev => prev + finalText);
        onResult?.(finalText);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError('语音识别出错：' + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setError(null);
  }, [lang, continuous, onResult, onEnd]);

  const stopBrowserListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startWhisperListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) return;

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('lang', lang === 'zh-CN' ? 'zh' : 'en');

        try {
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.text) {
            setTranscript(prev => prev + data.text);
            onResult?.(data.text);
          }
        } catch {
          setError('Whisper 转写失败');
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
      setError(null);
    } catch {
      setError('无法访问麦克风');
    }
  }, [lang, onResult]);

  const stopWhisperListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    onEnd?.();
  }, [onEnd]);

  const startListening = mode === 'whisper' ? startWhisperListening : startBrowserListening;
  const stopListening = mode === 'whisper' ? stopWhisperListening : stopBrowserListening;

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    error,
  };
}
