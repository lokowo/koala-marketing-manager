# 套磁信发送流程设计规格
> 版本: V1.0 | 日期: 2026-05-24 | 状态: 确定稿

## 核心理念
不是"发一封邮件",而是"发一个完整的申请包"。
教授收到:专业邮件正文 + 研究计划 PDF + 学术 CV PDF。

## 发送方式(两条路,始终并存)
- **Plan A — Gmail 发送**: 邮件+PDF 附件通过学生自己的 Gmail 自动发出
- **Plan B — 手动复制**: 邮件文本复制到剪贴板 + PDF 文件自动下载,学生粘贴到任何邮箱

## 3 步确认流程(不是一键盲发)

### 第 1 步:确认邮件内容(可编辑)
- 显示收件人:教授姓名 + 邮箱(从 professors 表取)
- 主题:可编辑输入框,预填 AI 生成的主题
- 正文:可编辑文本框,预填 AI 生成的套磁信内容
- AI 高亮标注(双向标注)发送时自动去除,教授看到纯文本
- 学生可以在此自由修改任何内容

### 第 2 步:选择附件(可选)
#### 研究计划 PDF
- 开关控制是否附加
- 如果已针对该教授生成:显示"预览 PDF" + "编辑"按钮
- 如果未生成:显示"去生成研究计划"引导按钮(跳转生成流程)
- PDF 由 @react-pdf/renderer 生成,专业排版

#### 学术 CV PDF
- 开关控制是否附加
- 如果已生成:显示"预览 PDF" + "编辑"按钮
- 如果未生成:显示"去生成 CV"引导按钮
- PDF 专业排版,包含学生学术背景/研究经历/论文/技能

### 第 3 步:确认发送
- 最终确认页:列清发件人/收件人/附件列表
- 两个按钮:
  - "确认发送"(绿色) → Gmail API 发送邮件+附件
  - "复制全部"(次要) → 文本进剪贴板 + PDF 下载
- "复制全部"说明文字:邮件文本复制到剪贴板 + PDF 文件自动下载

## Gmail 连接状态 UI

### 状态 1:未连接
- 说明文字:"一键发送套磁信到教授邮箱。连接你的 Gmail 后,可直接从你的邮箱发送。教授看到的是你的真实邮箱地址,回复率更高。"
- Google 蓝色"连接 Gmail"按钮 + "复制邮件内容"次要按钮
- 底部提示:"没有 Gmail?点'复制邮件内容'粘贴到任何邮箱发送"

### 状态 2:已连接
- 绿色 ✓ 已连接 + Gmail 地址
- "发送到 prof.xxx@xxx.edu.au"主按钮 + "复制"次要按钮

### 状态 3:已发送
- 绿色已发送状态 + 发送时间
- 显示发送路径:从 xxx@gmail.com → xxx@xxx.edu.au

### 状态 4:错误/需重连
- 红色警告:"Gmail 连接已失效,可能已在 Google 设置中撤销授权"
- "重新连接 Gmail"按钮

## OAuth 安全网
- 用户取消授权 → callback 收到 error → redirect 回个人页 + toast "授权已取消"
- Token 过期 → 自动用 refresh_token 刷新
- 刷新失败 → 显示"重新连接"提示
- 所有跳转都回 koalaphd.com,不会卡在 Google 页面

## 技术实现
- Gmail API: gmail.send scope,multipart MIME 格式支持 PDF 附件
- 附件: base64 编码 PDF 嵌入 MIME raw 字段
- Token 存储: gmail_tokens 表(RLS,user_id unique)
- 自动推进: 发送成功后 applicationSync 推进 stage → sent
- 不扣积分: 发送免费
- cold_emails 字段: sent_at / sent_via ('gmail'|'manual') / gmail_message_id

## 个人设置页 Gmail 区域
- /koala/my-profile 增加 Gmail 连接/断开区域
- 显示连接状态 + Gmail 地址
- URL 参数 ?gmail=connected 时显示成功 toast
- ?gmail=error 时显示失败 toast

## 修改规则
改发送流程前必读本文档。不得删除已有步骤。改完更新本文档。
