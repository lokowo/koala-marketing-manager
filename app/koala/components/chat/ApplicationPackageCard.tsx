'use client';

import { useState } from 'react';
import { Copy, Check, FileText, Mail, BookOpen, MessageSquare } from 'lucide-react';

interface InterviewTopic {
  topic: string;
  why: string;
  howToAnswer: string;
}

export interface ApplicationPackageData {
  professor: {
    id: string;
    name: string;
    university: string;
    faculty?: string;
    researchAreas?: string[];
    email?: string;
  };
  package: {
    cvAdvice: string;
    coldEmail: { subject: string; body: string };
    researchSummary: string;
    interviewTopics: InterviewTopic[];
  };
}

interface ApplicationPackageCardProps {
  data: ApplicationPackageData;
}

type Tab = 'cv' | 'email' | 'summary' | 'interview';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'cv', label: 'CV建议', icon: <FileText size={14} /> },
  { key: 'email', label: '套磁信', icon: <Mail size={14} /> },
  { key: 'summary', label: '教授概要', icon: <BookOpen size={14} /> },
  { key: 'interview', label: '面试准备', icon: <MessageSquare size={14} /> },
];

export function ApplicationPackageCard({ data }: ApplicationPackageCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('cv');
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    const text = `Subject: ${data.package.coldEmail.subject}\n\n${data.package.coldEmail.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-gray-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="text-sm">📦</span>
          <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
            {data.professor.name} · 申请包
          </span>
        </div>
        <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#8a8078]">
          {data.professor.university}{data.professor.faculty ? ` · ${data.professor.faculty}` : ''}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-white/[0.08]">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#1A1A2E] dark:text-[#D4A843] border-b-2 border-[#1A1A2E] dark:border-[#D4A843]'
                : 'text-gray-500 dark:text-[#8a8078]'
            }`}
          >
            {tab.icon}
            <span className="hidden xs:inline">{tab.label}</span>
            <span className="xs:hidden">{tab.label.slice(0, 2)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3.5 max-h-[360px] overflow-y-auto">
        {activeTab === 'cv' && (
          <div className="text-xs leading-relaxed text-gray-700 dark:text-[#c8c0b4] whitespace-pre-wrap">
            {data.package.cvAdvice}
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-medium text-gray-500 dark:text-[#8a8078] mb-1">Subject</div>
              <div className="text-xs text-gray-900 dark:text-[#e8e4dc] font-medium">
                {data.package.coldEmail.subject}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-gray-500 dark:text-[#8a8078] mb-1">Body</div>
              <div className="text-xs leading-relaxed text-gray-700 dark:text-[#c8c0b4] whitespace-pre-wrap">
                {data.package.coldEmail.body}
              </div>
            </div>
            <button
              onClick={handleCopyEmail}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? '已复制' : '复制邮件'}
            </button>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="text-xs leading-relaxed text-gray-700 dark:text-[#c8c0b4] whitespace-pre-wrap">
            {data.package.researchSummary}
          </div>
        )}

        {activeTab === 'interview' && (
          <div className="space-y-3">
            {data.package.interviewTopics.map((item, i) => (
              <div
                key={i}
                className="rounded-lg p-2.5 bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]"
              >
                <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                  {i + 1}. {item.topic}
                </div>
                <div className="mt-1.5 text-[11px] leading-snug text-gray-500 dark:text-[#a09888]">
                  <span className="font-medium text-gray-600 dark:text-[#c8c0b4]">为什么教授关心：</span>
                  {item.why}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-[#a09888]">
                  <span className="font-medium text-gray-600 dark:text-[#c8c0b4]">回答建议（STAR）：</span>
                  {item.howToAnswer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
