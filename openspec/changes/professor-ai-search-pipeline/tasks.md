## 1. 数据库 Migration

- [x] 1.1 执行 SQL migration：修改 `professors` 表 CHECK 约束，新增 `'user_contributed'` 到 `verification_status` 允许值
- [x] 1.2 执行 SQL migration：新增 `contributed_by` (UUID, nullable, FK → auth.users) 和 `contributed_at` (TIMESTAMPTZ, nullable) 字段

## 2. 类型与服务层

- [x] 2.1 更新 `app/lib/types.ts`：`Professor` 类型的 `verificationStatus` 联合类型新增 `'user_contributed'`，新增 `contributedBy?: string` 和 `contributedAt?: string` 字段
- [x] 2.2 更新 `app/lib/services/professorAutoAdd.ts`：`saveCandidateToDb(candidate, userId?)` 增加可选 `userId` 参数，传入时设 `verification_status: 'user_contributed'`、`contributed_by: userId`、`contributed_at: new Date().toISOString()`；不传时保持 `'Verified'`
- [x] 2.3 更新 `app/lib/services/professorAutoAdd.ts`：`fromRow()` 映射新增 `contributedBy` 和 `contributedAt` 字段

## 3. API 层

- [x] 3.1 更新 `app/api/professors/auto-search/route.ts`：POST 方法将 `user.id` 传递给 `saveCandidateToDb(candidate, user.id)`

## 4. 前端 — 录入后操作面板

- [x] 4.1 更新 `app/koala/professors/ProfessorsClient.tsx`：新增 `savedProfessors` state（Map<string, Professor>），录入成功后存入返回的 professor 对象
- [x] 4.2 更新 `ProfessorsClient.tsx`：外部候选人卡片区域，已录入的候选人显示操作面板替代原来的搜索结果卡片，包含教授摘要信息（姓名、大学、研究方向）+ "已录入"成功标记
- [x] 4.3 操作面板包含三个按钮：「查看详情」→ `/koala/professors/{id}`、「写套磁信」→ `/koala/chat?action=outreach&prof={id}&name={name}`、「模拟面试」→ `/koala/chat?action=interview&prof={id}&name={name}`
- [x] 4.4 录入按钮点击后显示加载动画 + 禁止重复点击，成功后平滑过渡到操作面板，失败时显示错误提示并保留原卡片

## 5. Admin 审核页面

- [x] 5.1 创建 `app/dashboard/koala/professors/contributed/page.tsx`：查询 `verification_status = 'user_contributed'` 的教授列表，按 `contributed_at` 倒序，显示教授姓名、大学、研究方向、贡献者信息、贡献时间
- [x] 5.2 实现「通过」按钮：调用 `PUT /api/professors/[id]` 将 `verification_status` 更新为 `'Verified'`，刷新列表
- [x] 5.3 实现「删除」按钮：二次确认弹窗 → 调用 `DELETE /api/professors/[id]`，刷新列表
- [x] 5.4 实现「编辑」功能：点击后展开内联编辑表单（姓名、大学、职位、研究方向），保存时调用 PUT 更新信息，可选同时通过审核
- [x] 5.5 空状态处理：无待审核数据时显示"暂无待审核的用户贡献数据"提示

## 6. Admin 导航

- [x] 6.1 更新 `app/dashboard/koala/layout.tsx`：在"教授库"子菜单中新增 `{ label: '用户贡献', href: '/dashboard/koala/professors/contributed' }` 入口

## 7. 验证

- [x] 7.1 `npm run build` 确认无编译错误
- [ ] 7.2 端到端验证：教授搜索 → AI 深度搜索 → 录入 → 操作面板显示 → 点击写套磁信跳转正确
- [ ] 7.3 Admin 审核页验证：列表展示 → 通过/删除/编辑操作正常
