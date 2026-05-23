'use client';

import { useEffect, useState } from 'react';
import { useVoiceInput } from '../lib/hooks/useVoiceInput';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onTranscribingChange?: (isTranscribing: boolean) => void;
  lang?: string;
  mode?: 'browser' | 'whisper';
  size?: 'sm' | 'md' | 'lg';
  maxDuration?: number;
  className?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceInputButton({
  onTranscript,
  onListeningChange,
  onTranscribingChange,
  lang = 'zh-CN',
  mode = 'browser',
  size = 'md',
  maxDuration = 30,
  className = '',
}: VoiceInputButtonProps) {
  const [justStopped, setJustStopped] = useState(false);
  const { isListening, isTranscribing, isSupported, recordingDuration, maxDuration: hookMaxDuration, toggleListening } = useVoiceInput({
    lang,
    mode,
    maxDuration,
    onResult: onTranscript,
    onEnd: () => setJustStopped(true),
  });

  const remaining = hookMaxDuration - recordingDuration;
  const progress = hookMaxDuration > 0 ? recordingDuration / hookMaxDuration : 0;

  useEffect(() => {
    onListeningChange?.(isListening);
    if (isListening) setJustStopped(false);
  }, [isListening, onListeningChange]);

  useEffect(() => {
    onTranscribingChange?.(isTranscribing);
  }, [isTranscribing, onTranscribingChange]);

  useEffect(() => {
    if (justStopped && !isTranscribing) {
      const t = setTimeout(() => setJustStopped(false), 2000);
      return () => clearTimeout(t);
    }
  }, [justStopped, isTranscribing]);

  if (!isSupported) return null;

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const iconSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (isTranscribing || (justStopped && isTranscribing)) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full flex items-center justify-center
            bg-amber-500/20 border-amber-400 text-amber-400
            border shrink-0
          `}
        >
          <Loader2 className={`${iconSize[size]} animate-spin`} />
        </div>
        <span className="text-xs text-amber-400 whitespace-nowrap">录音完成！正在识别...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? '停止语音输入' : '语音输入'}
          className={`
            ${sizeClasses[size]}
            rounded-full flex items-center justify-center
            transition-all duration-200
            ${isListening
              ? 'bg-red-500/20 border-red-400 text-red-400 voice-pulse'
              : 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20'
            }
            border shrink-0
          `}
        >
          {isListening ? <MicOff className={iconSize[size]} /> : <Mic className={iconSize[size]} />}
        </button>
        {isListening && (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-mono whitespace-nowrap ${remaining <= 10 ? 'text-amber-400' : 'text-red-400'}`}>
              {formatDuration(recordingDuration)} / {formatDuration(hookMaxDuration)}
            </span>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${remaining <= 10 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      {isListening && (
        <span className="text-[10px] leading-tight ml-0.5 whitespace-nowrap">
          {remaining <= 10
            ? <span className="text-amber-400">请总结要点</span>
            : <span className="text-gray-400">说说你的学校、专业和研究兴趣</span>
          }
        </span>
      )}
      <style jsx>{`
        .voice-pulse {
          animation: voice-pulse 1.5s infinite;
        }
        @keyframes voice-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
