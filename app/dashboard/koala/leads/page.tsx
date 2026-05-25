'use client';

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">线索管理</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">查看和管理所有潜在用户线索</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">功能开发中</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          线索管理功能正在开发中。完成后将支持：自动线索采集、AI 评分、状态跟踪和转化分析。
        </p>
        <div className="mt-6 flex justify-center gap-4">
          {[
            { icon: '👥', label: '线索采集' },
            { icon: '🤖', label: 'AI 评分' },
            { icon: '📊', label: '转化追踪' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
