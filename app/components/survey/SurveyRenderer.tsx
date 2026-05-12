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
        getContactData={() => {
          const rawPhone = model.getValue('__contact_phone') || '';
          return {
            name: model.getValue('__contact_name') || '',
            phone: rawPhone ? `${countryCodeRef.current}${rawPhone}` : '',
            email: model.getValue('__contact_email') || '',
          };
        }}
        shareCode={shareCode || ''}
        responseId={responseId || ''}
        onRegistered={(userId) => {
          if (onRegistered) onRegistered(userId);
          setTimeout(() => { if (model.isLastPage === false) model.nextPage(); }, 2000);
        }}
      />
    );
  }, [shareCode, responseId, onRegistered]);

  const countryCodeRef = useRef('+61');

  const COUNTRY_CODES = [
    { code: '+61', label: '🇦🇺 +61', country: 'AU' },
    { code: '+86', label: '🇨🇳 +86', country: 'CN' },
    { code: '+852', label: '🇭🇰 +852', country: 'HK' },
    { code: '+886', label: '🇹🇼 +886', country: 'TW' },
    { code: '+65', label: '🇸🇬 +65', country: 'SG' },
    { code: '+60', label: '🇲🇾 +60', country: 'MY' },
    { code: '+81', label: '🇯🇵 +81', country: 'JP' },
    { code: '+82', label: '🇰🇷 +82', country: 'KR' },
    { code: '+1', label: '🇺🇸 +1', country: 'US' },
    { code: '+44', label: '🇬🇧 +44', country: 'UK' },
    { code: '+64', label: '🇳🇿 +64', country: 'NZ' },
    { code: '+91', label: '🇮🇳 +91', country: 'IN' },
  ];

  const EMAIL_DOMAINS = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', '126.com', 'foxmail.com'];

  const injectPhoneCountryCode = useCallback((question: { name: string; value: string }, htmlElement: HTMLElement, model: Model) => {
    const input = htmlElement.querySelector('input[type="tel"]') as HTMLInputElement;
    if (!input || htmlElement.querySelector('.country-code-select')) return;

    const wrapper = input.parentElement;
    if (!wrapper) return;
    wrapper.style.display = 'flex';
    wrapper.style.gap = '0';
    wrapper.style.alignItems = 'stretch';

    const select = document.createElement('select');
    select.className = 'country-code-select';
    Object.assign(select.style, {
      width: '90px', flexShrink: '0',
      background: '#0F1419', color: '#fff', border: '1px solid rgba(212,168,67,0.2)',
      borderRight: 'none', borderRadius: '12px 0 0 12px',
      padding: '0 4px', fontSize: '14px', outline: 'none', cursor: 'pointer',
    });
    for (const cc of COUNTRY_CODES) {
      const opt = document.createElement('option');
      opt.value = cc.code;
      opt.textContent = cc.label;
      if (cc.code === countryCodeRef.current) opt.selected = true;
      select.appendChild(opt);
    }
    input.style.borderRadius = '0 12px 12px 0';

    select.addEventListener('change', () => {
      countryCodeRef.current = select.value;
    });
    input.addEventListener('input', () => {
      let phone = input.value.replace(/[^\d]/g, '');
      if (phone.startsWith('0')) phone = phone.slice(1);
      if (phone !== input.value) input.value = phone;
      model.setValue(question.name, phone);
    });
    input.addEventListener('blur', () => {
      let phone = input.value.replace(/[^\d]/g, '');
      if (phone.startsWith('0')) phone = phone.slice(1);
      if (phone !== input.value) input.value = phone;
      model.setValue(question.name, phone);
    });

    wrapper.insertBefore(select, input);
  }, []);

  const injectEmailAutocomplete = useCallback((_question: { name: string }, htmlElement: HTMLElement) => {
    const input = htmlElement.querySelector('input[type="email"]') as HTMLInputElement;
    if (!input || input.getAttribute('list')) return;

    const listId = 'email-domain-suggestions';
    if (!document.getElementById(listId)) {
      const datalist = document.createElement('datalist');
      datalist.id = listId;
      document.body.appendChild(datalist);
    }

    input.setAttribute('list', listId);
    input.addEventListener('input', () => {
      const datalist = document.getElementById(listId) as HTMLDataListElement;
      if (!datalist) return;
      const val = input.value;
      const atIdx = val.indexOf('@');
      if (atIdx < 1) { datalist.innerHTML = ''; return; }
      const prefix = val.slice(0, atIdx);
      const domainPart = val.slice(atIdx + 1).toLowerCase();
      const matches = EMAIL_DOMAINS.filter(d => d.startsWith(domainPart));
      datalist.innerHTML = matches.map(d => `<option value="${prefix}@${d}">`).join('');
    });
  }, []);

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

    model.onAfterRenderQuestion.add((sender, options) => {
      injectVoiceButton(options.question, options.htmlElement);
      if (options.question.name === '__contact_phone') {
        injectPhoneCountryCode(options.question, options.htmlElement, sender);
      }
      if (options.question.name === '__contact_email') {
        injectEmailAutocomplete(options.question, options.htmlElement);
      }
    });

    model.onComplete.add((sender) => {
      const data = { ...sender.data };
      const rawPhone = data.__contact_phone;
      if (rawPhone && !String(rawPhone).startsWith('+')) {
        data.__contact_phone = `${countryCodeRef.current}${rawPhone}`;
      }
      onComplete(data);
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
