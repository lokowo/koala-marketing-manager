'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import InlineRegistrationPanel from './InlineRegistrationPanel';

const koalaTheme = {
  cssVariables: {
    '--sjs-general-backcolor': '#0F1419',
    '--sjs-general-backcolor-dim': '#080C10',
    '--sjs-general-forecolor': '#ffffff',
    '--sjs-general-forecolor-light': '#9CA3AF',
    '--sjs-primary-backcolor': '#D4A843',
    '--sjs-primary-backcolor-light': 'rgba(212,168,67,0.15)',
    '--sjs-primary-backcolor-dark': '#B8922F',
    '--sjs-primary-forecolor': '#080C10',
    '--sjs-secondary-backcolor': '#4ECDC4',
    '--sjs-border-default': 'rgba(212,168,67,0.2)',
    '--sjs-border-light': 'rgba(255,255,255,0.08)',
    '--sjs-shadow-small': '0 1px 4px rgba(0,0,0,0.3)',
    '--sjs-font-family': "'Inter', system-ui, -apple-system, sans-serif",
    '--sjs-font-size': '15px',
    '--sjs-corner-radius': '12px',
    '--sjs-base-unit': '8px',
  },
  isPanelless: false,
};

interface SurveyRendererProps {
  surveyJson: Record<string, unknown>;
  onComplete: (results: Record<string, unknown>) => void;
  onPartialSave?: (data: Record<string, unknown>, pageNo: number) => void;
  onPageChanged?: (data: Record<string, unknown>, pageNo: number) => void;
  shareCode?: string;
  responseId?: string;
  onRegistered?: (userId: string) => void;
}

export default function SurveyRenderer({
  surveyJson, onComplete, onPartialSave, onPageChanged, shareCode, responseId, onRegistered,
}: SurveyRendererProps) {
  const modelRef = useRef<Model | null>(null);
  const registrationRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const [, setReady] = useState(false);

  const mountRegistrationPanel = useCallback((model: Model) => {
    const mountEl = document.getElementById('inline-reg-container');
    if (!mountEl) return;

    const emailValue = model.getValue('__contact_email') || '';
    if (!emailValue) return;

    if (!registrationRootRef.current) {
      registrationRootRef.current = createRoot(mountEl);
    }

    registrationRootRef.current.render(
      <InlineRegistrationPanel
        getContactData={() => ({
          name: model.getValue('__contact_name') || '',
          phone: model.getValue('__contact_phone') || '',
          email: model.getValue('__contact_email') || '',
        })}
        shareCode={shareCode || ''}
        responseId={responseId || ''}
        onRegistered={(userId) => {
          if (onRegistered) onRegistered(userId);
          setTimeout(() => { if (model.isLastPage === false) model.nextPage(); }, 2000);
        }}
      />
    );
  }, [shareCode, responseId, onRegistered]);

  const injectVoiceButton = useCallback((question: { getType: () => string; name: string }, htmlElement: HTMLElement) => {
    if (question.getType() !== 'comment') return;
    if (!('webkitSpeechRecognition' in window)) return;

    const textarea = htmlElement.querySelector('textarea');
    if (!textarea) return;
    if (htmlElement.querySelector('.voice-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice-btn';
    btn.innerHTML = '🎤';
    btn.title = '语音输入';
    Object.assign(btn.style, {
      position: 'absolute', right: '8px', bottom: '8px',
      width: '36px', height: '36px', borderRadius: '50%',
      border: '1px solid rgba(212,168,67,0.3)', background: 'rgba(15,20,25,0.8)',
      cursor: 'pointer', fontSize: '16px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: '10',
    });

    const wrapper = textarea.parentElement;
    if (wrapper) wrapper.style.position = 'relative';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recognition: any = null;
    let isRecording = false;

    btn.addEventListener('click', () => {
      if (isRecording && recognition) {
        recognition.stop();
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
        }
        if (transcript) {
          textarea.value = (textarea.value ? textarea.value + ' ' : '') + transcript;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      recognition.onstart = () => {
        isRecording = true;
        btn.style.background = '#ef4444';
        btn.style.animation = 'pulse 1.5s infinite';
      };
      recognition.onend = () => {
        isRecording = false;
        btn.style.background = 'rgba(15,20,25,0.8)';
        btn.style.animation = '';
      };
      recognition.start();
    });

    (wrapper || textarea.parentElement)?.appendChild(btn);
  }, []);

  useEffect(() => {
    return () => {
      if (registrationRootRef.current) {
        registrationRootRef.current.unmount();
        registrationRootRef.current = null;
      }
    };
  }, []);

  if (!modelRef.current) {
    const model = new Model(surveyJson);
    model.applyTheme(koalaTheme as Parameters<typeof model.applyTheme>[0]);
    model.locale = 'zh-cn';
    model.showTitle = false;

    model.onCurrentPageChanged.add((sender) => {
      if (onPageChanged) onPageChanged(sender.data, sender.currentPageNo);
      if (onPartialSave) onPartialSave(sender.data, sender.currentPageNo);
    });

    model.onAfterRenderPage.add((sender) => {
      if (sender.currentPage?.name === 'contact_info') {
        setTimeout(() => mountRegistrationPanel(sender), 100);
      }
    });

    model.onValueChanged.add((sender, options) => {
      if (options.name === '__contact_email' && sender.currentPage?.name === 'contact_info') {
        setTimeout(() => mountRegistrationPanel(sender), 100);
      }
    });

    model.onAfterRenderQuestion.add((_sender, options) => {
      injectVoiceButton(options.question, options.htmlElement);
    });

    model.onComplete.add((sender) => {
      onComplete(sender.data);
    });

    modelRef.current = model;
  }

  const surveyRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setReady(true);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>
      <div ref={surveyRef}>
        {modelRef.current && <Survey model={modelRef.current} />}
      </div>
    </>
  );
}
