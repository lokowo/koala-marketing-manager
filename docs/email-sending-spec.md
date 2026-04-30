# 套磁信发送系统 Phase 1 — 技术实现规范
# 给 Claude Code 的完整实现指令
# 放到 docs/email-sending-spec.md

---

## 核心原则

1. **零报错** — 所有操作都有 fallback，任何环节失败都有 Plan B
2. **用户掌控** — Koala 只生成内容，用户自己决定发不发
3. **傻瓜式** — 每一步都有中文说明，假设用户从没发过英文邮件

---

## 用户完整流程

```
Step 1: 用户在 AI 对话中完成路径评估 → 看到教授匹配列表
Step 2: 点某位教授的"生成套磁信"按钮
Step 3: 系统检查积分（第 1 封免费，后续扣 1 积分）
Step 4: AI 生成套磁信（3-5 秒）
Step 5: 展示"套磁信发送包"（预览 + 3 种发送方式）
Step 6: 用户选择一种方式发出
Step 7: 用户标记"已发送" → 系统记录
Step 8: 14 天后提醒 Follow-up
```

---

## UI 组件：套磁信发送包（EmailPackage）

### 文件位置：`app/components/outreach/EmailPackage.tsx`

### 完整界面结构：

```
┌──────────────────────────────────────┐
│ ✉️ 套磁信 · Prof. Liwei Chen         │
│ UNSW · 量子传感                      │
│ 匹配度 87%                           │
├──────────────────────────────────────┤
│                                      │
│ 📧 收件人：                           │
│ ┌──────────────────────────────────┐ │
│ │ l.chen@unsw.edu.au         [📋] │ │  ← 点复制图标单独复制邮箱
│ └──────────────────────────────────┘ │
│                                      │
│ 📝 主题行：                           │
│ ┌──────────────────────────────────┐ │
│ │ Inquiry: Quantum Sensing    [📋] │ │  ← 点复制图标单独复制主题
│ │ Research at UNSW MEMS Lab        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 📄 邮件正文：                         │
│ ┌──────────────────────────────────┐ │
│ │ Dear Professor Chen,             │ │
│ │                                  │ │
│ │ I am a final-year Electronic     │ │  ← 可编辑的 textarea
│ │ Engineering student at...        │ │     用户可以修改后再发
│ │                                  │ │
│ │ [完整正文内容]                    │ │
│ │                                  │ │
│ │ Best regards,                    │ │
│ │ [用户名字]                       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── 发送方式（选一种）──              │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 方式一：一键打开邮箱（推荐）✨     │ │
│ │                                  │ │
│ │ 点击按钮自动打开你的邮箱APP，     │ │
│ │ 收件人、主题、正文全部预填好，    │ │
│ │ 你只需要检查一下然后点发送。      │ │
│ │                                  │ │
│ │    [📧 打开邮箱发送]              │ │  ← 主按钮，金色
│ │                                  │ │
│ │ 支持：Gmail / Outlook / QQ邮箱   │ │
│ │       / 163邮箱 / Apple Mail     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 方式二：复制全部，手动粘贴        │ │
│ │                                  │ │
│ │ 如果方式一打不开，用这个：        │ │
│ │                                  │ │
│ │    [📋 复制邮箱+主题+正文]        │ │  ← 次按钮
│ │                                  │ │
│ │ 复制后打开你的邮箱，              │ │
│ │ 新建邮件 → 粘贴即可。            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 方式三：分步复制                  │ │
│ │                                  │ │
│ │ 每个部分单独复制：                │ │
│ │ [📋 复制邮箱] [📋 复制主题]       │ │
│ │ [📋 复制正文]                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── Follow-up 备用 ──                │
│                                      │
│ ▶ 查看 14天后的跟进邮件（已预生成）  │  ← 折叠面板，点击展开
│                                      │
│ ── 内部提醒 ──                       │
│                                      │
│ 💡 Risk Note：                       │
│ 该教授通常在周二-周四回复邮件，       │
│ 建议在 AEST 早上 9-11 点发送。       │
│ 发出后请耐心等待 7-14 天。           │
│                                      │
│ ── 状态标记 ──                       │
│                                      │
│ 发出去了吗？                         │
│ [✅ 已发送] [⏳ 稍后再发] [❌ 放弃]  │  ← 用户手动标记
│                                      │
│ ── 使用说明 ──                       │
│                                      │
│ ▶ 不知道怎么发？点这里看教程         │  ← 折叠面板
│                                      │
└──────────────────────────────────────┘
```

---

## 三种发送方式的技术实现

### 方式一：mailto 链接（推荐）

```typescript
// app/components/outreach/EmailPackage.tsx

function handleOpenMailClient(email: string, subject: string, body: string) {
  // 对主题和正文做 URL 编码
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  // 构建 mailto 链接
  const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  
  // 检测正文长度 — mailto 有 URL 长度限制（约 2000 字符）
  if (mailtoUrl.length > 2000) {
    // 超长时自动降级到方式二
    handleCopyAll(email, subject, body);
    showToast('邮件内容较长，已复制到剪贴板。请手动打开邮箱粘贴。');
    return;
  }
  
  // 尝试打开
  try {
    window.location.href = mailtoUrl;
    
    // 3 秒后询问是否成功打开
    setTimeout(() => {
      showConfirmDialog(
        '邮箱打开了吗？',
        '如果没有自动打开邮箱，请使用"复制全部"方式。',
        [
          { label: '打开了，我去发', action: () => {} },
          { label: '没打开，帮我复制', action: () => handleCopyAll(email, subject, body) },
        ]
      );
    }, 3000);
  } catch (e) {
    // 打开失败 → 自动降级到方式二
    handleCopyAll(email, subject, body);
    showToast('无法打开邮箱APP，已复制到剪贴板。请手动打开邮箱粘贴。');
  }
}
```

**已知的 mailto 问题和解决方案：**

```
问题 1：手机浏览器可能不支持 mailto
解决：检测到移动端时，优先推荐方式二（复制粘贴）

问题 2：mailto 的 body 参数不支持 HTML 格式
解决：邮件正文用纯文本，换行用 %0A

问题 3：URL 超过 2000 字符会被截断
解决：自动检测长度，超长时降级到复制方式

问题 4：用户没有设置默认邮箱 APP
解决：3 秒后弹出确认对话框，提供 Plan B

问题 5：中文 subject 在某些邮箱客户端乱码
解决：subject 始终用英文（套磁信本身就是英文的）
```

### 方式二：复制全部到剪贴板

```typescript
async function handleCopyAll(email: string, subject: string, body: string) {
  const fullText = `收件人：${email}\n\n主题：${subject}\n\n正文：\n${body}`;
  
  try {
    // 优先用现代 API
    await navigator.clipboard.writeText(fullText);
    showToast('✅ 已复制！打开邮箱新建邮件，粘贴即可。');
  } catch (e) {
    // Fallback：老式方法
    fallbackCopyToClipboard(fullText);
  }
}

// Fallback 复制方法（兼容所有浏览器）
function fallbackCopyToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showToast('✅ 已复制！打开邮箱新建邮件，粘贴即可。');
  } catch (e) {
    // 最后的 fallback：显示文本让用户手动复制
    showManualCopyDialog(text);
  }
  
  document.body.removeChild(textArea);
}

// 终极 Fallback：弹窗显示文本
function showManualCopyDialog(text: string) {
  // 弹出一个对话框，里面有全选好的文本
  // 用户只需要长按 → 全选 → 复制
  showDialog({
    title: '请手动复制以下内容',
    content: (
      <textarea 
        readOnly 
        value={text} 
        style={{ width: '100%', height: 300 }}
        onClick={(e) => e.target.select()}  // 点击自动全选
      />
    ),
    hint: '点击文本框 → 全选 → 复制',
  });
}
```

### 方式三：分步复制

```typescript
async function handleCopySingle(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`✅ ${label}已复制`);
  } catch (e) {
    fallbackCopyToClipboard(text);
  }
}

// 三个按钮分别调用：
// handleCopySingle(email, '邮箱')
// handleCopySingle(subject, '主题')
// handleCopySingle(body, '正文')
```

---

## 使用教程（折叠面板内容）

```typescript
// 当用户点击"不知道怎么发？点这里看教程"时展开

const SEND_TUTORIAL = {
  title: '如何发送套磁信',
  steps: [
    {
      title: 'Gmail 用户',
      steps: [
        '1. 点击上方"打开邮箱发送"按钮',
        '2. 自动跳转到 Gmail 写信页面',
        '3. 检查收件人、主题、正文是否正确',
        '4. 如果需要修改，直接在 Gmail 里改',
        '5. 点击"发送"',
        '',
        '如果没有自动跳转：',
        '1. 点击"复制全部"按钮',
        '2. 打开 Gmail (mail.google.com)',
        '3. 点左上角"写信"',
        '4. 在收件人处粘贴教授邮箱',
        '5. 在主题处粘贴主题',
        '6. 在正文处粘贴邮件内容',
        '7. 点击"发送"',
      ],
    },
    {
      title: 'QQ邮箱 / 163邮箱 用户',
      steps: [
        '1. 点击"复制全部"按钮',
        '2. 打开你的邮箱 APP 或网页版',
        '3. 新建邮件',
        '4. 收件人：粘贴教授邮箱（或点上方📋单独复制）',
        '5. 主题：粘贴主题行',
        '6. 正文：粘贴邮件内容',
        '7. 检查无误后发送',
      ],
    },
    {
      title: '手机用户',
      steps: [
        '1. 点击"复制全部"按钮',
        '2. 打开手机自带的邮箱 APP',
        '3. 新建邮件 → 逐项粘贴',
        '4. 或者用"分步复制"，一个一个粘贴',
        '',
        '💡 建议：如果你用手机，套磁信建议在电脑上发。',
        '可以先点"稍后再发"，回到电脑上操作。',
      ],
    },
  ],
  tips: [
    '📌 发送时间建议：澳洲时间周二至周四上午 9-11 点（AEST）',
    '📌 发出后耐心等待 7-14 个工作日',
    '📌 如果 14 天没回复，使用我们预生成的 Follow-up 邮件跟进',
    '📌 不要同一天给同一位教授发多封邮件',
    '📌 使用你的学校邮箱（edu 结尾）发送效果更好',
  ],
};
```

---

## 发送状态追踪

### 数据库记录（outreach_emails 表）

```typescript
// 用户点击"已发送"后：
async function markAsSent(emailId: string) {
  await supabase
    .from('outreach_emails')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', emailId);
  
  // 设置 14 天后的 Follow-up 提醒
  await supabase
    .from('followup_reminders')
    .insert({
      email_id: emailId,
      remind_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    });
  
  showToast('✅ 已标记为已发送。14 天后我会提醒你跟进。');
}

// 用户点击"稍后再发"：
async function markAsLater(emailId: string) {
  await supabase
    .from('outreach_emails')
    .update({ status: 'draft' })
    .eq('id', emailId);
  
  showToast('好的，你可以在"我的套磁信"里随时找到这封信。');
}

// 用户点击"放弃"：
async function markAsAbandoned(emailId: string) {
  await supabase
    .from('outreach_emails')
    .update({ status: 'abandoned' })
    .eq('id', emailId);
  
  // 不删除记录，保留数据分析用
}
```

### 状态流转

```
draft（生成后默认）
  → sent（用户标记已发送）→ 14天后 → followup_pending → followup_sent / no_reply
  → later（用户稍后再发）→ 回到 draft
  → abandoned（用户放弃）
  → replied（用户手动标记教授回复了）
```

---

## Follow-up 提醒机制

```typescript
// 每天运行的 cron job：app/api/cron/followup-check/route.ts

export async function GET() {
  // 查找所有到期的 followup 提醒
  const { data: reminders } = await supabase
    .from('followup_reminders')
    .select('*, outreach_emails(*)')
    .eq('status', 'pending')
    .lte('remind_at', new Date().toISOString());
  
  for (const reminder of reminders || []) {
    // 检查用户是否已标记教授回复了
    if (reminder.outreach_emails.status === 'replied') {
      await supabase
        .from('followup_reminders')
        .update({ status: 'not_needed' })
        .eq('id', reminder.id);
      continue;
    }
    
    // 标记为"需要提醒"
    await supabase
      .from('followup_reminders')
      .update({ status: 'reminded' })
      .eq('id', reminder.id);
    
    // TODO: 发送推送通知或在 AI 对话中提醒
    // "你 14 天前给 Prof. Chen 发了套磁信，还没收到回复。
    //  要不要发一封 Follow-up？我已经帮你准备好了。"
  }
  
  return Response.json({ processed: reminders?.length || 0 });
}
```

---

## 教授邮箱获取

```
教授邮箱来源（优先级）：
1. 大学官网 Staff Page 直接提取 → 最可靠
2. Google Scholar Profile 页面 → 有些教授会公开
3. 从论文的 Corresponding Author 信息提取
4. 推测规则（大学邮箱命名规则）：
   UNSW: firstname.lastname@unsw.edu.au
   Monash: firstname.lastname@monash.edu
   USYD: f.lastname@sydney.edu.au
   UMelb: flastname@unimelb.edu.au

数据库处理：
- professors 表新增字段：
  email TEXT              -- 完整邮箱
  email_source TEXT       -- 来源标注：'university_website' / 'google_scholar' / 'paper' / 'inferred'
  email_verified BOOLEAN  -- 是否已验证（默认 false）

前端显示：
- email_source = 'university_website' → 直接显示，标注"via {大学} Staff Page"
- email_source = 'inferred' → 显示但加提醒"⚠ 此邮箱由系统推测，建议在大学官网确认"
- email = null → 显示"邮箱未收录" + 提供大学 Staff Directory 链接让用户自己查
```

---

## 错误处理清单（确保零报错）

```typescript
// 每个可能出错的环节都有 fallback

const ERROR_HANDLERS = {
  // 积分检查失败
  creditCheckFailed: {
    message: '积分查询暂时不可用，请稍后重试。',
    action: '你可以先预览套磁信内容，稍后再发送。',
    fallback: '允许预览但禁用发送按钮',
  },
  
  // AI 生成套磁信失败
  emailGenerationFailed: {
    message: 'AI 生成暂时繁忙，请稍后重试。',
    action: '通常等待 30 秒后重试即可。',
    fallback: '显示重试按钮 + 不扣除积分',
  },
  
  // 教授邮箱未收录
  professorEmailMissing: {
    message: '该教授的邮箱暂未收录。',
    action: '你可以在以下页面查找：',
    fallback: '提供大学 Staff Directory 链接 + 用户手动输入邮箱框',
    links: [
      { label: '在大学官网查找', url: 'https://{university}.edu.au/staff' },
      { label: '在 Google Scholar 查找', url: 'https://scholar.google.com/citations?user={scholar_id}' },
    ],
  },
  
  // mailto 打开失败
  mailtoFailed: {
    message: '无法自动打开邮箱APP。',
    action: '请使用"复制全部"方式，手动打开邮箱粘贴。',
    fallback: '自动执行 handleCopyAll()',
  },
  
  // 剪贴板复制失败
  clipboardFailed: {
    message: '自动复制失败。',
    action: '请手动选择下方文字，长按复制。',
    fallback: '显示 showManualCopyDialog()',
  },
  
  // 网络断开
  networkError: {
    message: '网络连接不稳定。',
    action: '套磁信内容已保存在本地，恢复网络后可以继续。',
    fallback: '将邮件内容存到 React state，不依赖 API',
  },
};
```

---

## 新增数据库字段

```sql
-- professors 表新增邮箱字段
ALTER TABLE professors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS email_source TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Follow-up 提醒表
CREATE TABLE IF NOT EXISTS followup_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES outreach_emails(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' / 'reminded' / 'not_needed' / 'followup_sent'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_status ON followup_reminders(status, remind_at);
```

---

## 给 Claude Code 的实现指令

```
请按照 docs/email-sending-spec.md 实现套磁信发送系统 Phase 1：

1. 创建 app/components/outreach/EmailPackage.tsx
   - 完整的套磁信预览面板（收件人+主题+可编辑正文）
   - 三种发送方式（mailto/复制全部/分步复制）
   - 每种方式都有 fallback 错误处理
   - mailto 超长自动降级到复制
   - 剪贴板失败显示手动复制弹窗
   - Follow-up 折叠面板
   - Risk Note 显示
   - 发送状态标记按钮（已发送/稍后/放弃）
   - 使用教程折叠面板

2. 创建 app/components/outreach/SendTutorial.tsx
   - Gmail/QQ邮箱/163邮箱/手机用户的分步教程
   - 发送时间建议等 tips

3. 更新 supabase/schema.sql
   - professors 表增加 email/email_source/email_verified
   - 新建 followup_reminders 表

4. 创建 app/api/cron/followup-check/route.ts
   - 每天检查到期的 Follow-up 提醒

5. 所有复制操作必须有三层 fallback：
   navigator.clipboard → execCommand → 手动复制弹窗

6. 所有错误必须有中文提示 + Plan B 操作建议

直接实现，不用等我确认。
```
