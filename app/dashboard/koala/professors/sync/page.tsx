'use client';

export default function ProfessorsSyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">🔄 数据采集控制台</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">管理教授数据自动采集管线</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">功能开发中</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          教授数据采集管线功能正在开发中。完成后将支持：自动爬取大学官网、Semantic Scholar 同步、数据清洗和去重。
        </p>
        <div className="mt-6 flex justify-center gap-4">
          {[
            { icon: '🌐', label: '大学官网爬取' },
            { icon: '📚', label: '学术数据同步' },
            { icon: '🧹', label: '数据清洗' },
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
