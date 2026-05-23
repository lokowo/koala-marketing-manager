'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceInputOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (text: string) => void;
  onEnd?: () => void;
  mode?: 'browser' | 'whisper';
  maxDuration?: number;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  transcript: string;
  recordingDuration: number;
  maxDuration: number;
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
    maxDuration = 30,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTextRef = useRef('');
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interimTextRef = useRef('');

  const startTimer = useCallback(() => {
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

    fallbackTextRef.current = '';
    interimTextRef.current = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }
      interimTextRef.current = currentInterim;
      if (finalText) {
        setTranscript(prev => prev + finalText);
        onResult?.(finalText);
      }
    };

    fallbackIntervalRef.current = setInterval(() => {
      const interim = interimTextRef.current;
      if (interim) {
        fallbackTextRef.current = interim;
      }
    }, 5000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError('语音识别出错：' + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

      setTranscript(prev => {
        if (prev) {
          onEnd?.();
          return prev;
        }
        if (fallbackTextRef.current) {
          onResult?.(fallbackTextRef.current);
          onEnd?.();
          return fallbackTextRef.current;
        }
        const audioBlob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: 'audio/webm' })
          : null;
        if (audioBlob && audioBlob.size > 1000) {
          setIsTranscribing(true);
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          fetch('/api/voice/transcribe', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
              if (data.text) {
                setTranscript(data.text);
                onResult?.(data.text);
              }
            })
            .catch(() => setError('语音识别失败，请重试'))
            .finally(() => setIsTranscribing(false));
        }
        onEnd?.();
        return prev;
      });
    };

    try {
      const stream = navigator.mediaDevices.getUserMedia({ audio: true });
      stream.then(s => {
        const mediaRecorder = new MediaRecorder(s, { mimeType: 'audio/webm' });
        chunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      }).catch(() => {});
    } catch {
      // Audio recording not available — browser recognition still works
    }

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setError(null);
    startTimer();

    maxDurationTimerRef.current = setTimeout(() => {
      recognition.stop();
      mediaRecorderRef.current?.stop();
      stopTimer();
    }, maxDuration * 1000);
  }, [lang, continuous, onResult, onEnd, startTimer, stopTimer, maxDuration]);

  const stopBrowserListening = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    stopTimer();
  }, [stopTimer]);

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
        if (audioBlob.size < 1000) {
          setIsTranscribing(false);
          return;
        }

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

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
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
      setError(null);
      startTimer();

      maxDurationTimerRef.current = setTimeout(() => {
        mediaRecorder.stop();
        setIsListening(false);
        setIsTranscribing(true);
        stopTimer();
        onEnd?.();
      }, maxDuration * 1000);
    } catch {
      setError('无法访问麦克风');
    }
  }, [onResult, onEnd, startTimer, stopTimer, maxDuration]);

  const stopWhisperListening = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    setIsTranscribing(true);
    stopTimer();
    onEnd?.();
  }, [onEnd, stopTimer]);

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
      if (timerRef.current) clearInterval(timerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    };
  }, []);

  return {
    isListening,
    isTranscribing,
    isSupported,
    transcript,
    recordingDuration,
    maxDuration,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    error,
  };
}
