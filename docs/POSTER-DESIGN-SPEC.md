# 推广中心海报编辑器设计规格
> 版本: V1.1 | 日期: 2026-05-23 | 状态: 确定稿,不可随意覆盖

## 核心原则
Canvas 尺寸固定,图片适应 canvas,不是 canvas 适应图片。

## Tab 结构
推广链接 | 推广二维码 | 颜色海报 | 图片海报

## Canvas 规格
- 固定画布: 3:4（1080x1440）/ 1:1（1080x1080）/ 9:16（1080x1920）
- 两个海报 tab 都支持 3 种尺寸切换
- 导出: canvas.toDataURL('image/png', 1.0)

## Tab 3 颜色海报（FabricPosterEditor）

### 整体布局
- 顶部: 3 个色板设计包卡片（横排 grid-cols-3）
- 下方: 左编辑面板(260px) + 右海报预览(flex-1)
- 顶部 3 卡总宽 = 下方(面板+预览)总宽，右边缘对齐
- 海报预览按比例缩放完整显示在框内（maxWidth:540, aspectRatio 保持）
- 左编辑面板可纵向滚动到底

### 3 个色板设计包（每张卡含）
- 色斑色带 + Aa 字体预览 + 主题名+说明 + 渠道标签 + A/B 版切换
- 简约: 白底, 默认字体 思源黑体(Noto Sans SC), 渠道 微信/邮件/WhatsApp, isDark=false
- 学术: 深蓝底, 默认字体 思源宋体(Noto Serif SC), 渠道 知乎/LinkedIn/学术群, isDark=true
- 活力: 橙粉渐变, 默认字体 站酷快乐体(ZCOOL KuaiLe), 渠道 小红书/抖音/B站, isDark=true
- 切换主题时字体自动套用该主题默认字体（用户仍可在字体选择器改）
- 每个主题含 A/B 两版变体

### 左侧面板顺序（从上到下）
1. 主标题输入
2. 副标题输入
3. 添加文字按钮（QR 是预设元素，不需手动添加按钮）
4. 渠道下拉 / 字体下拉
5. 显示开关 checkbox: 二维码/网址文字/邀请码/渠道标识
6. 尺寸切换 3:4/1:1/9:16
7. 文字样式工具条（选中文字时出现）

### 预设元素（canvas 加载即全部显示）
- Koala PhD 考拉博士 logo（左上角，锁定不可拖拽）
- 主标题「用 AI 找到你的理想 PhD 导师」白色 48px 粗体
- 副标题「覆盖澳洲38所大学、24,000+位教授」白色 24px
- 4 条卖点（独立文字框 白色 20px）:
  AI智能匹配澳洲博士导师/一键生成个性化套磁信/教授论文对齐研究计划/全程申请进度追踪
- koalaphd.com 底部（不放邮箱）
- QR码: qrcode 库真实生成, 编码 https://koalaphd.com/?ref={referral_code}
- 扫码注册提示 + 邀请码 + 渠道标识
- 深色背景白字; 简约白底用深灰
- 所有元素可拖拽+可缩放+双击编辑

## 文字编辑
双击后浮动工具条:
- 字体 Google Fonts: 中文(思源黑体/思源宋体/站酷快乐体/阿里巴巴普惠体/霞鹜文楷)
  英文(Inter/Montserrat/Playfair Display/Poppins/Roboto)
- 字号滑杆、颜色(白/黑/#D4A843)、粗体
- FontFace API 预加载,document.fonts.ready 后初始化 canvas

## Tab 4 图片海报（ImagePosterEditor）

### 整体布局
- 顶部: 6 张底图缩略图（横排 grid-cols-3 md:grid-cols-6）
- 下方: 左编辑面板(260px) + 右海报预览(flex-1)
- 海报预览按比例缩放完整显示在框内（maxWidth:540, aspectRatio 保持）
- 左编辑面板可纵向滚动到底

### 6 张底图
- 路径: /images/posters/11.png ~ 66.png
- 缩略图: 圆角卡片，选中态 ring-2 ring-[#F59E0B]
- Canvas 固定 1080x1440（不支持尺寸切换）

### 背景渲染（paintBg）
- FabricImage.fromURL 加载底图
- Cover-fit: Math.max(canvasW/imgW, canvasH/imgH) 居中裁切
- 雾化蒙层: Rect #0F1419 opacity 0.5
- 顶部 scrim: 线性渐变 rgba(15,20,25,0.6) → transparent, 高度 canvas 30%
- 底部 scrim: 线性渐变 transparent → rgba(15,20,25,0.7), 高度 canvas 40%
- 不用 CSS blur

### 左侧面板顺序（从上到下）
1. 主标题输入
2. 副标题输入
3. 添加文字按钮（无添加 QR 按钮）
4. 渠道下拉 / 字体下拉
5. 显示开关 checkbox: 二维码/网址文字/邀请码/渠道标识
6. 无尺寸切换（固定 3:4）
7. 文字样式工具条（选中文字时出现）

### 预设元素（canvas 加载即全部显示）
- Koala PhD 考拉博士 logo（左上角，锁定不可拖拽）
- 主标题「用 AI 找到你的理想 PhD 导师」白色 48px 粗体
- 副标题「覆盖澳洲38所大学、24,000+位教授」白色 24px
- 4 条卖点（独立文字框 白色 20px）:
  AI智能匹配澳洲博士导师/一键生成个性化套磁信/教授论文对齐研究计划/全程申请进度追踪
- koalaphd.com 底部（不放邮箱）
- QR码: qrcode 库真实生成, 编码 https://koalaphd.com/?ref={referral_code}
- 扫码注册提示 + 邀请码 + 渠道标识
- 深色背景白字，所有元素可拖拽+可缩放+双击编辑

## 修改规则
改海报前必读本文档;不得删除已有功能;改完更新本文档。
