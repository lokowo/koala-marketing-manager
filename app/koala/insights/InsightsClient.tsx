'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { InsightsData } from './page';
import { MobilePageHeader } from '../components/MobilePageHeader';

export default function InsightsClient({ data }: { data: InsightsData }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Go8');

  const maxAreaCount = data.topResearchAreas[0]?.count ?? 1;

  return (
    <div className="max-w-2xl mx-auto">
      <MobilePageHeader title="研究洞察" />
      <div className="px-4 space-y-6">
      {/* Research area distribution */}
      <section className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-base font-medium text-gray-900 dark:text-[#e8e4dc]">
            热门研究方向 Top 15
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-[#6a7a7e] mt-0.5">
            按学者标注的研究方向统计
          </p>
        </div>
        <div className="px-4 py-3 space-y-2">
          {data.topResearchAreas.map((item, i) => (
            <div key={item.area} className="flex items-center gap-3">
              <span className="text-[10px] tabular-nums text-gray-400 dark:text-[#6a7a7e] w-4 text-right shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate pr-2">
                    {item.area}
                  </span>
                  <span className="text-[10px] tabular-nums text-gray-400 dark:text-[#6a7a7e] shrink-0">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max((item.count / maxAreaCount) * 100, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* University groups */}
      <section className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-base font-medium text-gray-900 dark:text-[#e8e4dc]">
            大学分组
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-[#6a7a7e] mt-0.5">
            按澳洲大学联盟分类
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {data.universityGroups.map(grp => {
            const isExpanded = expandedGroup === grp.group;
            return (
              <div key={grp.group}>
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : grp.group)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-[#e8e4dc]">
                      {grp.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-[#6a7a7e] tabular-nums">
                      {grp.universities.length} 所
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-gray-500 dark:text-[#6a7a7e]">
                      {grp.subtotal.toLocaleString()} 学者
                    </span>
                    {isExpanded
                      ? <ChevronUp size={14} className="text-gray-400 dark:text-[#6a7a7e]" />
                      : <ChevronDown size={14} className="text-gray-400 dark:text-[#6a7a7e]" />
                    }
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {grp.universities.map(uni => (
                        <div
                          key={uni.name}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]"
                        >
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate pr-2">
                            {uni.shortName}
                          </span>
                          <span className="text-[11px] tabular-nums text-gray-400 dark:text-[#6a7a7e] shrink-0">
                            {uni.count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
