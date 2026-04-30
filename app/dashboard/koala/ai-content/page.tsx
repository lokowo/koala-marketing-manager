'use client';

export default function AIContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">✨ AI 内容生成</h2>
        <p className="text-sm text-gray-500 mt-1">单篇生成 — 输入主题，AI 自动撰写中英双语文章</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">文章主题</label>
          <input
            type="text"
            placeholder="输入主题，越具体质量越高。建议包含关键词、地区、时间。"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
              <option>申请攻略</option>
              <option>学术科研</option>
              <option>留学政策</option>
              <option>职业发展</option>
              <option>导师关系</option>
              <option>科研方法</option>
              <option>留学生活</option>
              <option>大学院校</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">风格</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
              <option>学长分享</option>
              <option>专业权威</option>
              <option>新闻报道</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发布方式</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
              <option>保存草稿</option>
              <option>直接发布</option>
              <option>定时发布</option>
            </select>
          </div>
        </div>
        <button className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
          ✏️ 生成文章（中文撰写 → 英文翻译 → SEO优化）
        </button>
      </div>
    </div>
  );
}
