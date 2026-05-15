# Koala PhD 设计系统 — 安装指南

## 文件列表

```
docs/design-system/
├── DESIGN.md           ← 设计规范（色彩/字体/间距/组件/动效/语气/禁忌）
├── SKILL-web-page.md   ← 页面生成技能（Claude Code 创建页面时读）
└── README.md           ← 本文件
```

## 安装到 Koala PhD 项目

### Step 1: 复制文件到项目

在 Claude Code 里执行:
```bash
mkdir -p docs/design-system
# 把 DESIGN.md 和 SKILL-web-page.md 复制到 docs/design-system/
```

### Step 2: 在 CLAUDE.md 里引用

在项目根目录的 CLAUDE.md（如果没有就创建）里加这段:

```markdown
## 设计规范

所有 UI 创建和修改必须遵循设计系统:
- 设计规范: `docs/design-system/DESIGN.md`
- 页面技能: `docs/design-system/SKILL-web-page.md`

执行 UI 任务前先读这两个文件。
```

### Step 3: 提交到 GitHub

```bash
git add docs/design-system/
git commit -m "feat(design): add Koala PhD design system v1.0"
git push
```

## 使用方式

安装完成后，在 Claude Code 里说任何 UI 相关的需求:

- "重做 pricing 页面" → Claude Code 自动读 DESIGN.md + SKILL，按规范生成
- "做一个教授详情页" → 自动用正确的色彩、字体、间距
- "修改按钮样式" → 参考组件规范里的按钮定义

**不再需要每次描述"我要蓝色主题、light 字体、毛玻璃导航"**——全在规范里写好了。

## 更新设计系统

需要改设计时，直接编辑 DESIGN.md，commit 即可。所有后续的 UI 工作自动使用新规范。

## 来源

格式参考 Open Design (github.com/nexu-io/open-design) 的 DESIGN.md 标准。
技能格式参考 Claude Code SKILL.md 协议。
内容基于 Koala PhD 已有设计（pricing page oklch 色彩体系）定制。
