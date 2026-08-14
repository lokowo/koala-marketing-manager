# 手机端底部导航「博客」入口缺失 —— 只读诊断报告

- 日期：2026-08-14
- 范围：只读诊断，**未修改任何代码**
- 现象：`/koala/home` 手机视图，底部 tab 五格中**第二格（用户认为是博客）位置空白**——槽位存在但图标与文字均未渲染；其余四格（首页 / Ola / 教授库 / 我的）正常。
- **结论先行**：这**不是"博客图标渲染失败"**。真相是——**底部导航里根本没有博客入口**：博客 tab 已在 2026-05-26 的 commit `c11b957` 被移除、替换为「首页」。用户看到的"空白第二格"其实是**为居中凸起的 Ola 按钮预留的占位空格**（`<div className="flex-1" />`），本就无图标无文字。而由于顶栏在手机端隐藏（`lg` 才显示），**手机端目前完全没有任何进入博客的入口**——这才是真正的问题。

---

## 1. 定位组件

- 底部导航组件：**`app/koala/components/BottomTabBar.tsx`**
- 渲染位置：`app/koala/components/KoalaShell.tsx`

```tsx
// KoalaShell.tsx
{!onAuthPage && <TopNavBar />}      // 顶栏
...
<div className="lg:hidden">          // ← 仅手机/平板渲染底部栏
  <BottomTabBar />
</div>
```

### 当前底部栏实际的 5 个"视觉槽位"（`BottomTabBar.tsx` L87–134）

容器：`<div className="relative flex justify-around items-end ...">`，内含 4 个 flow 子项（各 `flex-1`）+ 1 个绝对定位居中的 Ola 按钮：

| 视觉位置 | 内容 | 代码 | 说明 |
|---|---|---|---|
| 1 | **首页** `/koala/home` `<Home/>` | L88–92 | 正常 |
| 2 | **（空占位）** | **L114–115 `<div className="flex-1" />`** | ⚠️ **用户以为是"博客"的空白格**——实为给居中 Ola 让位的占位符，**本就无内容** |
| 中(浮起) | **Ola** `/koala/chat` | L94–112 | `absolute -top-5 left-1/2`，浮在第 2 格上方偏中 |
| 3 | **教授库** `/koala/professors` `<Users/>` | L117–121 | 正常（原博客所在的位置）|
| 4 | **我的**（弹面板）| L123–133 | 正常 |

**底部栏内不存在任何 `/koala/blog` 链接或 `BookOpen` 图标**（`grep` 验证：当前文件只 import 了 `Home, Users, UserCircle, CreditCard, Mail, ClipboardList, FileText, Bell, Settings`，**无 `BookOpen`**）。

### 博客那一项"曾经的完整配置"（已被删，来自 commit `ecbb269`）

```tsx
{/* Right side: 博客 */}
<Link href="/koala/blog" className="flex flex-col items-center flex-1 gap-1 no-underline">
  <BookOpen className={`size-5 ${isActive('/koala/blog') ? '...点亮色' : '...灰色'}`}
           strokeWidth={isActive('/koala/blog') ? 2.2 : 1.5} />
  <span className="text-[10px] tracking-wide ...">博客</span>
</Link>
```
- 图标：`BookOpen`（lucide-react）
- 文案：`博客`
- href：`/koala/blog`
- 显示条件：无（原为无条件常显）

---

## 2. 空壳原因排查

逐一排除任务清单里的假设：

- **条件渲染（登录态/权限/feature flag）导致只渲染容器？→ 否。**
  第 2 格是一个**写死的空 `<div className="flex-1" />`**（注释：`{/* Center spacer for Ola button */}`），不含任何 `user` / 权限 / flag 判断，也不含图标或文字。它"空"是**设计使然**，不是条件把内容隐藏了。
- **图标组件不存在 / 导入路径无效？→ 不适用。**
  底部栏根本没有博客图标可导入。当前 import 里无 `BookOpen`。其余四格图标（`Home/Users/UserCircle` + Ola 头像）均正常导入与渲染，可反证 lucide-react 导入链正常。
- **href 指向的路由是否存在 / 是否命中 301？→ 路由存在，且与本问题无关。**
  - `/koala/blog` 列表页存在：`app/koala/blog/page.tsx`（13KB）。
  - `next.config.ts` 的 301 只针对**详情页** `/koala/blog/{slug}`（被删文章重定向，见 L34–35），**不涉及**列表页 `/koala/blog`。
  - 但底部栏里**没有**指向 `/koala/blog` 的 `<Link>`，所以"href/301"根本不在本次链路上。

**真因**：`c11b957` 把底部栏的「博客」整项删除、换成「首页」，并把「教授库」挪到原博客的位置；第 2 格留下的是 Ola 占位空格。用户把"占位空格"误读成"博客图标没渲染"。

---

## 3. 近期改动关联

- **2026-08-04 之后，`BottomTabBar.tsx` / `KoalaShell.tsx` / `TopNavBar.tsx` 均无任何提交**（`git log --since=2026-08-04 -- <三文件>` 输出为空）。用户怀疑的时间窗内**没有**改动，本问题**不是近期回归**。
- 关键提交时间线（`git log -- BottomTabBar.tsx`）：

| commit | 日期 | 对底部栏博客入口的影响 |
|---|---|---|
| `ecbb269` fix(nav): simplify … to 4 items | 2026-05-26 10:23 | 设计为 `教授库 \| [Ola] \| 博客 \| 我的`，**博客在位**（`BookOpen`→`/koala/blog`）|
| **`c11b957`** feat: replace koala mascot with Ola学姐 | **2026-05-26 22:11** | **删除「博客」项、import 去掉 `BookOpen`、新增「首页」`Home`→`/koala/home` 放到第 1 格，「教授库」移到原博客位** |
| （此后至今） | — | 底部栏未再改动，博客一直缺席 |

即：博客底部入口自 **2026-05-26 `c11b957`** 起就已消失，距今约 2.5 个月。

### 连带发现：手机端博客「完全不可达」

- 顶栏 `TopNavBar.tsx` 里博客链接**存在**（L14 `{ href: '/koala/blog', icon: BookOpen, label: '博客' }`），
- 但顶栏容器为 `className="hidden lg:flex ..."`（L48）——**仅 `lg`（≥1024px 桌面）显示，手机端隐藏**。
- 底部栏（`lg:hidden`，手机端显示）又没有博客。

→ **手机端用户当前没有任何常驻导航入口进入 `/koala/blog`**。这才是需要修的实质缺口（而非"图标渲染失败"）。

---

## 4. 结论与修复方案（本次不实施）

### 结论
1. 第 2 格空白 = **Ola 居中按钮的占位空格**，属既有设计，非渲染 bug。
2. 底部栏**从未有 bug**——是 `c11b957` 有意移除了博客 tab，换成首页。
3. **真实问题**：手机端（顶栏隐藏 + 底部栏无博客）**无法进入博客**；且非 2026-08-04 后的回归，而是 5-26 起的长期状态。

### 修复方案（供决策，均为 UI 改动，实施前须先读 `docs/design-system/DESIGN.md`）

**方案 A（推荐，最小改动、贴合原设计）**：在 `BottomTabBar.tsx` 把第 2 格的空占位 `<div className="flex-1" />` 替换回「博客」项（`BookOpen`→`/koala/blog`，样式复用现有 tab 的点亮/灰色/strokeWidth 规则）。
- 代价：第 2 格与居中浮起的 Ola 按钮在水平位置上有部分重叠风险，需微调（Ola `absolute left-1/2`，第 2 格 flow 位置约在 3/8 处，实测多数情况不完全重叠，但需在 375px 下核对点击热区不被 Ola 遮挡）。
- 结果：恢复"教授库/博客/我的 + 首页 + Ola"五元素，博客手机端可达。

**方案 B**：保留首页，用博客替换当前的某一格（如把「教授库」并入「我的」面板，第 3 格改博客），维持 4 格 + Ola 不新增拥挤。
- 代价：改变现有信息架构，需产品确认哪个入口降级。

**方案 C（兜底，不动底部栏）**：让顶栏在手机端也显示博客入口（去掉/放宽 `hidden lg:flex`，或在移动端加一个含博客的入口），确保移动端可达。
- 代价：顶栏移动端布局需重新设计，改动面比 A 大。

**建议**：优先 **方案 A**（还原被 `c11b957` 顺手删掉的博客 tab，语义与用户预期一致），实施时在 375px 真机/模拟器核对第 2 格与 Ola 按钮的重叠与点击热区。

（以上为诊断结论，未对任何代码做修改。）
