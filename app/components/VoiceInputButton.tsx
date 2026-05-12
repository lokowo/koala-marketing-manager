'use client';

import { useVoiceInput } from '../lib/hooks/useVoiceInput';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  lang?: string;
  mode?: 'browser' | 'whisper';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VoiceInputButton({
  onTranscript,
  lang = 'zh-CN',
  mode = 'browser',
  size = 'md',
  className = '',
}: VoiceInputButtonProps) {
  const { isListening, isSupported, toggleListening } = useVoiceInput({
    lang,
    mode,
    onResult: onTranscript,
  });

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

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? '停止语音输入' : '语音输入'}
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center
        transition-all duration-200
        ${isListening
          ? 'bg-red-500/20 border-red-400 text-red-400 animate-pulse'
          : 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20'
        }
        border shrink-0
        ${className}
      `}
    >
      {isListening ? <MicOff className={iconSize[size]} /> : <Mic className={iconSize[size]} />}
    </button>
  );
}
