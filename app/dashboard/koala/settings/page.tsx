'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">⚙️ 系统设置</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys 管理</h3>
        <div className="space-y-3">
          {['Anthropic API Key', 'OpenAI API Key', 'Semantic Scholar API Key', 'Resend API Key'].map(
            (key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">{key}</span>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已配置</span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">品牌设置</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p><span className="font-medium text-gray-900">品牌名称：</span>Koala PhD</p>
          <p><span className="font-medium text-gray-900">AI 名称：</span>考拉学长</p>
          <p><span className="font-medium text-gray-900">域名：</span>koalastudy.net</p>
        </div>
      </div>
    </div>
  );
}
