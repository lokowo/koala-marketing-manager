'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import InlineRegistrationPanel from './InlineRegistrationPanel';

const koalaTheme = {
  cssVariables: {
    '--sjs-general-backcolor': '#ffffff',
    '--sjs-general-backcolor-dim': '#f8fafc',
    '--sjs-general-forecolor': '#1e293b',
    '--sjs-general-forecolor-light': '#64748b',
    '--sjs-primary-backcolor': '#D4A843',
    '--sjs-primary-backcolor-light': 'rgba(212,168,67,0.12)',
    '--sjs-primary-backcolor-dark': '#B8922F',
    '--sjs-primary-forecolor': '#ffffff',
    '--sjs-secondary-backcolor': '#4ECDC4',
    '--sjs-border-default': 'rgba(0,0,0,0.08)',
    '--sjs-border-light': 'rgba(0,0,0,0.05)',
    '--sjs-shadow-small': '0 1px 4px rgba(0,0,0,0.06)',
    '--sjs-font-family': "'Inter', system-ui, -apple-system, sans-serif",
    '--sjs-font-size': '15px',
    '--sjs-corner-radius': '10px',
    '--sjs-base-unit': '8px',
  },
  isPanelless: false,
};

interface SurveyRendererProps {
  surveyJson: Record<string, unknown>;
  onComplete: (results: Record<string, unknown>) => void;
  onPageChanged?: (data: Record<string, unknown>, pageNo: number) => void;
  salesCode?: string;
  onRegistered?: (userId: string) => void;
}

export default function SurveyRenderer({ surveyJson, onComplete, onPageChanged, salesCode, onRegistered }: SurveyRendererProps) {
  const modelRef = useRef<Model | null>(null);
  const registrationRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const [, setReady] = useState(false);

  const mountRegistrationPanel = useCallback((model: Model) => {
    const mountEl = document.getElementById('registration-panel-mount');
    if (!mountEl) return;

    const emailValue = model.getValue('__contact_email') || '';
    if (!emailValue) return;

    if (!registrationRootRef.current) {
      registrationRootRef.current = createRoot(mountEl);
    }

    registrationRootRef.current.render(
      <InlineRegistrationPanel
        email={emailValue}
        salesCode={salesCode}
        onRegistered={(userId) => {
          if (onRegistered) onRegistered(userId);
        }}
      />
    );
  }, [salesCode, onRegistered]);

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

    model.onCurrentPageChanged.add((sender) => {
      if (onPageChanged) {
        onPageChanged(sender.data, sender.currentPageNo);
      }
    });

    model.onAfterRenderPage.add((sender) => {
      if (sender.currentPage?.name === 'contact') {
        setTimeout(() => mountRegistrationPanel(sender), 100);
      }
    });

    model.onValueChanged.add((sender, options) => {
      if (options.name === '__contact_email' && sender.currentPage?.name === 'contact') {
        setTimeout(() => mountRegistrationPanel(sender), 100);
      }
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
    <div ref={surveyRef}>
      {modelRef.current && <Survey model={modelRef.current} />}
    </div>
  );
}
