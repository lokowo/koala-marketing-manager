'use client';

import { useCallback, useRef } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/defaultV2.min.css';

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
}

export default function SurveyRenderer({ surveyJson, onComplete, onPageChanged }: SurveyRendererProps) {
  const modelRef = useRef<Model | null>(null);

  const surveyRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (modelRef.current) return;

    const model = new Model(surveyJson);
    model.applyTheme(koalaTheme as Parameters<typeof model.applyTheme>[0]);
    model.locale = 'zh-cn';

    model.onCurrentPageChanged.add((sender) => {
      if (onPageChanged) {
        onPageChanged(sender.data, sender.currentPageNo);
      }
    });

    model.onComplete.add((sender) => {
      onComplete(sender.data);
    });

    modelRef.current = model;
    // Force re-render with model
    node.dataset.ready = 'true';
  }, [surveyJson, onComplete, onPageChanged]);

  // We need to create the model once and render Survey with it
  if (!modelRef.current) {
    const model = new Model(surveyJson);
    model.applyTheme(koalaTheme as Parameters<typeof model.applyTheme>[0]);
    model.locale = 'zh-cn';

    model.onCurrentPageChanged.add((sender) => {
      if (onPageChanged) {
        onPageChanged(sender.data, sender.currentPageNo);
      }
    });

    model.onComplete.add((sender) => {
      onComplete(sender.data);
    });

    modelRef.current = model;
  }

  return (
    <div ref={surveyRef}>
      <Survey model={modelRef.current} />
    </div>
  );
}
