## 1. 积分消耗类型

- [x] 1.1 `app/api/user/credits/spend/route.ts` 添加 `blog_generation: { amount: 10, label: '生成教授博客' }`

## 2. 用户端生成 API

- [x] 2.1 创建 `app/api/professors/[id]/generate-blog/route.ts`
  - 用户认证 (getServerUser)
  - 检查该教授是否已有博客 (blog_posts WHERE professor_id = id)
  - 首次免费逻辑：credit_transactions WHERE user_id AND type = 'spend_blog_generation' count = 0
  - 非首次：扣 10 积分
  - 转发到 generate-professor API 生成博客
  - 更新博客状态为 published
  - 返回博客信息

## 3. 详情页查询优化

- [x] 3.1 `page.tsx` relatedBlogs 查询增加 professor_id 匹配（OR 条件）

## 4. 前端 UI

- [x] 4.1 `ProfessorDetailClient.tsx` 当无关联博客时，显示"生成教授介绍文章"按钮
- [x] 4.2 生成中 loading 状态 + 进度提示
- [x] 4.3 积分不足提示（引导购买/赚取）
- [x] 4.4 生成成功后跳转或显示文章链接

## 5. 验证

- [x] 5.1 `npm run build` 通过
