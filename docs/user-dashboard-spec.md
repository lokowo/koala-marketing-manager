# 客户端数据统计面板 — 技术实现规范
# 放到 docs/user-dashboard-spec.md

---

## 核心原则

用户在"我的"页面或 AI 对话界面中，随时能看到自己的申请进度和数据。
这不只是"好看"——数据可视化是驱动用户持续使用和付费的核心动力。

---

## 页面位置

底部 Tab 导航的第 5 个 Tab（⚙ 工具）中增加"我的面板"入口，
或者作为独立的"👤 我的"Tab（如果 Tab 数量从 5 改为 5）。

建议方案：保持 5 个 Tab 不变，在"⚙ 工具"页面顶部增加"我的申请进度"卡片，
点击进入完整 Dashboard。

---

## 用户 Dashboard 完整界面

### 顶部概览卡片（始终可见，嵌入工具页或AI对话页顶部）

```
┌──────────────────────────────────────┐
│ 📊 我的申请进度                       │
│                                      │
│ Research Readiness                   │
│ ████████████░░░░░░░░ 62/100          │  ← 总进度条
│                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │ 12 │ │  5 │ │  2 │ │  1 │        │  ← 四个核心数字
│ │匹配 │ │套磁 │ │已发 │ │回复 │        │
│ │教授 │ │信  │ │送  │ │   │        │
│ └────┘ └────┘ └────┘ └────┘        │
│                                      │
│          [查看完整面板 →]             │
└──────────────────────────────────────┘
```

### 完整 Dashboard 页面（/koala/my-progress）

```
┌──────────────────────────────────────┐
│ ← 返回                   📄 导出PDF  │
│                                      │
│ 我的申请进度                          │
│ My Application Progress              │
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 一、总览                              │
│                                      │
│ Research Readiness Score             │
│ ████████████████░░░░░░ 72/100        │
│                                      │
│ 各维度明细：                          │
│ 背景评估    ██████████████ 完成 ✅    │
│ 教授匹配    ████████████░░ 80%       │
│ 套磁信     ████████░░░░░░ 55%       │
│ RP 方向    ██████░░░░░░░░ 40%       │
│ 材料准备    ████░░░░░░░░░░ 25%       │
│                                      │
│ 📌 下一步建议：                       │
│ "你已经匹配了 12 位教授，发出了 2 封  │
│  套磁信。建议本周再发 3-5 封，重点    │
│  关注 Opportunity Score > 70 的教授。"│
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 二、教授匹配                          │
│                                      │
│ 已匹配教授：12 位                     │
│ ┌────────────────────────────────┐  │
│ │ 排序：匹配度 ▼                  │  │
│ ├────────────────────────────────┤  │
│ │ #1 Prof. Chen · UNSW    87%   │  │
│ │    量子传感 · 3席 · ● 已发送    │  │  ← 绿色 = 已发送
│ │                                │  │
│ │ #2 A/Prof. Zheng · UTS  79%   │  │
│ │    IoT · 2席 · ○ 待发送        │  │  ← 灰色 = 还没发
│ │                                │  │
│ │ #3 Prof. Deng · UQ      74%   │  │
│ │    机器人 · 2席 · ● 已回复 🎉   │  │  ← 金色 = 收到回复
│ │                                │  │
│ │ #4 Prof. Zhang · Monash 71%   │  │
│ │    新能源 · 4席 · ○ 待发送      │  │
│ │                                │  │
│ │ ... 查看全部 12 位 →           │  │
│ └────────────────────────────────┘  │
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 三、套磁信追踪                        │
│                                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│ │  5  │ │  2  │ │  1  │ │  2  │  │
│ │已生成│ │已发送│ │已回复│ │待跟进│  │
│ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                      │
│ 回复率：50%（2 封发出，1 封回复）     │
│ 平均回复时间：8 天                    │
│                                      │
│ 时间线：                              │
│ ┌────────────────────────────────┐  │
│ │ 04/15 生成 → Prof. Chen (UNSW)│  │
│ │ 04/15 ✉️ 已发送                │  │
│ │ 04/22 ⏳ 等待中（第 7 天）      │  │
│ │ 04/29 🔔 建议发 Follow-up      │  │  ← 高亮提醒
│ ├────────────────────────────────┤  │
│ │ 04/18 生成 → Prof. Deng (UQ)  │  │
│ │ 04/18 ✉️ 已发送                │  │
│ │ 04/25 📩 教授回复了！🎉        │  │  ← 金色高亮
│ │       "Thank you for your     │  │
│ │        interest. Let's        │  │
│ │        schedule a call..."    │  │
│ │ 💡 建议：尽快回复确认时间       │  │
│ ├────────────────────────────────┤  │
│ │ 04/20 生成 → Prof. Yang (ANU) │  │
│ │ ○ 待发送                       │  │  ← 灰色
│ │ [📧 现在发送]                   │  │
│ └────────────────────────────────┘  │
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 四、积分与订阅                        │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ 当前套餐：PRO                   │  │
│ │ 月度额度：30 封                 │  │
│ │ 本月已用：5 封                  │  │
│ │ 本月剩余：25 封                 │  │
│ │ 额外积分：3 封（单独购买的）     │  │
│ │ 续费日期：2026.05.15            │  │
│ │                                │  │
│ │ ████████░░░░░░░░░░░░ 5/30 已用 │  │
│ │                                │  │
│ │ [购买额外积分] [管理订阅]       │  │
│ └────────────────────────────────┘  │
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 五、成就                              │
│                                      │
│ 已解锁 4/8 个成就                     │
│                                      │
│ 🏅 First CV Uploaded          ✅     │
│    第一步永远最难                     │
│                                      │
│ 🎯 First Professor Matched    ✅     │
│    找到学术命中注定                   │
│                                      │
│ ✉️ First Email Generated      ✅     │
│    套磁之路正式开启                   │
│                                      │
│ 📬 First Reply Received       ✅     │
│    教授注意到你了！                   │
│                                      │
│ 🔬 Research Angle Unlocked    🔒     │
│    完成 RP 方向确定                   │
│                                      │
│ 📊 RP Starter                 🔒     │
│    Research Proposal 初稿完成        │
│                                      │
│ 🚀 Outreach Campaign Ready   🔒     │
│    10 封套磁信已就绪                  │
│                                      │
│ 💎 PhD Pathway Clear          🔒     │
│    完整路径规划完成                   │
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 六、每日任务                          │
│                                      │
│ 今日任务 · Day 5                     │
│ ┌────────────────────────────────┐  │
│ │ ✅ 优化你的 Research Proposal    │  │
│ │    一句话总结                    │  │
│ │    已完成 · 获得 +5 积分        │  │
│ ├────────────────────────────────┤  │
│ │ ○ 给第 3 位教授生成套磁信       │  │
│ │   预计 3 分钟                   │  │
│ │   [开始 →]                      │  │
│ └────────────────────────────────┘  │
│                                      │
│ 本周进度：5/7 天 ✅✅✅✅✅○○         │
│ 连续完成 5 天！继续保持！🔥          │
│                                      │
│ ═══════════════════════════════════  │
│                                      │
│ 七、AI 对话历史                       │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ 04/29 路径评估 · 42 轮对话      │  │
│ │ "电子信息 → 量子传感匹配度 72%" │  │
│ │ [继续对话] [导出 PDF]           │  │
│ ├────────────────────────────────┤  │
│ │ 04/28 科研深潜 · 18 轮          │  │
│ │ "海水电池 zinc cathode 腐蚀"    │  │
│ │ [继续对话] [导出 PDF]           │  │
│ ├────────────────────────────────┤  │
│ │ 04/27 文案撰写 · 8 轮           │  │
│ │ "Research Proposal 大纲"        │  │
│ │ [继续对话] [导出 PDF]           │  │
│ └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

---

## 数据来源（全部自动计算，不需要手动输入）

```typescript
// app/api/user/dashboard/route.ts

export async function GET(req: Request) {
  const userId = await getUserIdFromAuth(req);
  
  // 并行查询所有数据
  const [
    matches,
    emails,
    credits,
    achievements,
    tasks,
    conversations,
  ] = await Promise.all([
    
    // 1. 教授匹配数据
    supabase
      .from('professor_matches')
      .select('*, professors(name_cn, name_en, institution, research_tags, recruiting_status)')
      .eq('user_id', userId)
      .order('match_score', { ascending: false }),
    
    // 2. 套磁信数据
    supabase
      .from('outreach_emails')
      .select('*, professors(name_cn, name_en, institution)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    
    // 3. 积分数据
    supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single(),
    
    // 4. 成就数据
    supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId),
    
    // 5. 每日任务
    supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('day_number', { ascending: true }),
    
    // 6. AI 对话历史
    supabase
      .from('ai_conversations')
      .select('id, mode, message_count, started_at, last_message_at')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(10),
  ]);
  
  // 计算统计数据
  const emailStats = {
    total: emails.data?.length || 0,
    sent: emails.data?.filter(e => e.status === 'sent').length || 0,
    replied: emails.data?.filter(e => e.status === 'replied').length || 0,
    pending: emails.data?.filter(e => e.status === 'sent' && !['replied', 'no_reply'].includes(e.status)).length || 0,
    draft: emails.data?.filter(e => e.status === 'draft').length || 0,
    replyRate: 0,
    avgReplyDays: 0,
  };
  
  // 回复率
  if (emailStats.sent > 0) {
    emailStats.replyRate = Math.round((emailStats.replied / emailStats.sent) * 100);
  }
  
  // 平均回复天数
  const repliedEmails = emails.data?.filter(e => e.status === 'replied' && e.reply_received_at && e.sent_at) || [];
  if (repliedEmails.length > 0) {
    const totalDays = repliedEmails.reduce((sum, e) => {
      const days = (new Date(e.reply_received_at).getTime() - new Date(e.sent_at).getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    emailStats.avgReplyDays = Math.round(totalDays / repliedEmails.length);
  }
  
  // Research Readiness Score 计算
  const readinessScore = calculateReadinessScore({
    hasUploadedCV: !!(conversations.data?.some(c => c.mode === 'path')),
    matchedProfessors: matches.data?.length || 0,
    emailsGenerated: emailStats.total,
    emailsSent: emailStats.sent,
    repliesReceived: emailStats.replied,
    hasRPDraft: !!(conversations.data?.some(c => c.mode === 'write')),
    completedTasks: tasks.data?.filter(t => t.completed).length || 0,
  });
  
  // 需要 Follow-up 的邮件
  const needsFollowup = emails.data?.filter(e => {
    if (e.status !== 'sent') return false;
    const daysSinceSent = (Date.now() - new Date(e.sent_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSent >= 14;
  }) || [];
  
  // 积分信息
  const creditInfo = {
    balance: credits.data?.credit_balance || 0,
    subscriptionTier: credits.data?.subscription_tier || null,
    monthlyCredits: credits.data?.subscription_monthly_credits || 0,
    monthlyUsed: emailStats.total, // 简化计算
    expiresAt: credits.data?.subscription_expires_at,
  };
  
  // 所有成就定义
  const allAchievements = [
    { key: 'first_cv', icon: '🏅', title: 'First CV Uploaded', desc: '第一步永远最难' },
    { key: 'first_match', icon: '🎯', title: 'First Professor Matched', desc: '找到学术命中注定' },
    { key: 'first_email', icon: '✉️', title: 'First Email Generated', desc: '套磁之路正式开启' },
    { key: 'first_reply', icon: '📬', title: 'First Reply Received', desc: '教授注意到你了！' },
    { key: 'rp_angle', icon: '🔬', title: 'Research Angle Unlocked', desc: '完成 RP 方向确定' },
    { key: 'rp_draft', icon: '📊', title: 'RP Starter', desc: 'Research Proposal 初稿完成' },
    { key: 'campaign_ready', icon: '🚀', title: 'Outreach Campaign Ready', desc: '10 封套磁信已就绪' },
    { key: 'pathway_clear', icon: '💎', title: 'PhD Pathway Clear', desc: '完整路径规划完成' },
  ];
  
  const unlockedKeys = new Set((achievements.data || []).map(a => a.achievement_key));
  const achievementsWithStatus = allAchievements.map(a => ({
    ...a,
    unlocked: unlockedKeys.has(a.key),
    unlockedAt: achievements.data?.find(ua => ua.achievement_key === a.key)?.unlocked_at,
  }));
  
  // 每日任务
  const todayTasks = tasks.data?.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    const taskDate = new Date(t.created_at).toISOString().split('T')[0];
    return taskDate === today;
  }) || [];
  
  // 连续完成天数
  const completedDays = tasks.data?.filter(t => t.completed)
    .map(t => new Date(t.completed_at).toISOString().split('T')[0]) || [];
  const uniqueDays = [...new Set(completedDays)].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (uniqueDays[i] === expected.toISOString().split('T')[0]) {
      streak++;
    } else break;
  }
  
  return Response.json({
    readinessScore,
    matches: {
      total: matches.data?.length || 0,
      list: matches.data?.slice(0, 20),
    },
    emails: {
      stats: emailStats,
      timeline: emails.data?.slice(0, 20),
      needsFollowup,
    },
    credits: creditInfo,
    achievements: achievementsWithStatus,
    tasks: {
      today: todayTasks,
      streak,
      totalCompleted: tasks.data?.filter(t => t.completed).length || 0,
    },
    conversations: conversations.data,
  });
}

// Research Readiness Score 计算公式
function calculateReadinessScore(data: {
  hasUploadedCV: boolean;
  matchedProfessors: number;
  emailsGenerated: number;
  emailsSent: number;
  repliesReceived: number;
  hasRPDraft: boolean;
  completedTasks: number;
}): {
  total: number;
  dimensions: Array<{ name: string; nameEn: string; score: number; max: number; status: string }>;
} {
  const dimensions = [
    {
      name: '背景评估',
      nameEn: 'Profile Assessment',
      score: data.hasUploadedCV ? 20 : 0,
      max: 20,
      status: data.hasUploadedCV ? 'completed' : 'todo',
    },
    {
      name: '教授匹配',
      nameEn: 'Professor Matching',
      score: Math.min(data.matchedProfessors * 4, 20),
      max: 20,
      status: data.matchedProfessors >= 5 ? 'completed' : 'in_progress',
    },
    {
      name: '套磁信',
      nameEn: 'Outreach Emails',
      score: Math.min(data.emailsSent * 4, 20),
      max: 20,
      status: data.emailsSent >= 5 ? 'completed' : data.emailsGenerated > 0 ? 'in_progress' : 'todo',
    },
    {
      name: 'RP 方向',
      nameEn: 'Research Proposal',
      score: data.hasRPDraft ? 20 : 0,
      max: 20,
      status: data.hasRPDraft ? 'completed' : 'todo',
    },
    {
      name: '持续投入',
      nameEn: 'Consistency',
      score: Math.min(data.completedTasks * 2, 20),
      max: 20,
      status: data.completedTasks >= 10 ? 'completed' : data.completedTasks > 0 ? 'in_progress' : 'todo',
    },
  ];
  
  const total = dimensions.reduce((sum, d) => sum + d.score, 0);
  
  return { total, dimensions };
}
```

---

## 新增数据库表

```sql
-- 教授匹配记录（用户维度）
CREATE TABLE IF NOT EXISTS professor_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  professor_id UUID REFERENCES professors(id),
  match_score INTEGER,
  breakdown JSONB,
  reason TEXT,
  proposal_directions TEXT[],
  email_status TEXT DEFAULT 'not_started',  -- 'not_started'/'generated'/'sent'/'replied'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_user ON professor_matches(user_id);
CREATE INDEX idx_matches_professor ON professor_matches(professor_id);
```

---

## 在 AI 对话界面中嵌入的迷你统计

不只是独立页面，在 AI 对话的顶部也要显示关键数据：

```
┌──────────────────────────────────────┐
│ 考拉学长 · AI 在线                    │
│                                      │
│ ┌──┐ ┌──┐ ┌──┐  积分：25 💰        │  ← 右上角始终显示积分
│ │12│ │5 │ │1 │                      │
│ │匹配│ │信│ │回复│                      │
│ └──┘ └──┘ └──┘                      │
│                                      │
│ [路径评估] [科研深潜] [陪伴] [文案]  │
├──────────────────────────────────────┤
│ 对话区域...                          │
└──────────────────────────────────────┘
```

---

## 给 Claude Code 的实现指令

```
请按照 docs/user-dashboard-spec.md 实现用户端数据统计面板：

1. 创建 app/api/user/dashboard/route.ts
   - GET 接口，返回用户的全部统计数据
   - Research Readiness Score 五维计算
   - 套磁信统计（生成/发送/回复/待跟进）
   - 回复率和平均回复天数
   - 积分余额和订阅状态
   - 成就解锁状态
   - 每日任务和连续天数
   - 对话历史

2. 创建 app/koala/my-progress/page.tsx
   - 完整的用户 Dashboard 页面（按规范中的 7 个模块实现）
   - 移动端适配，保持 Flowstep 视觉风格
   - 所有数据从 API 自动获取，不需要手动输入

3. 创建 app/components/dashboard/MiniStats.tsx
   - 嵌入 AI 对话页顶部的迷你统计条
   - 显示：匹配教授数 / 套磁信数 / 回复数 / 积分余额
   - 点击跳转到完整 Dashboard

4. 更新 supabase/schema.sql
   - 新增 professor_matches 表

5. 在工具页面顶部添加"我的申请进度"入口卡片

6. Dashboard 页面右上角添加"导出 PDF"按钮（复用已有的 PDF 生成逻辑）

所有数据全自动计算，用户不需要手动输入任何东西。直接实现，不用等我确认。
```
