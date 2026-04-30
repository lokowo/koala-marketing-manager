'use client';

export default function BlogAllPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">博客管理 Blog CMS</h2>
          <p className="text-sm text-gray-500 mt-1">
            AI 生成文章自动保存到草稿箱，编辑确认后点击一键发布
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            🌐 查看博客
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            ✨ 批量SEO
          </button>
          <button className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            + 新建文章
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-4xl mb-4">📝</p>
        <p className="text-gray-500">还没有文章，点击「+ 新建文章」或使用 AI 生成</p>
      </div>
    </div>
  );
}
