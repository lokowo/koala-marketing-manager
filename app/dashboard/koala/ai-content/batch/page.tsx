'use client';

export default function AIContentBatchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">⚡ 批量生成（推荐主题）</h2>
        <p className="text-sm text-gray-500 mt-1">
          基于 Google + Bing 双源实时新闻推荐主题
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">点击「刷新主题」获取最新推荐</p>
        <button className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
          🔄 刷新主题
        </button>
      </div>
    </div>
  );
}
