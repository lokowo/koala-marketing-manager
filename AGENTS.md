<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ============ 以下为 2026-04-28 更新的开发规则 ============
# AGENTS.md — Koala PhD 开发规则

## 规则 1：先读文档再写代码
开始任何任务前，先阅读：
1. `CLAUDE.md` — 项目上下文和技术规范
2. `docs/koala_prd_v2.md` — 完整产品需求
3. `docs/koala_ai_prompts.md` — AI Prompt 库

## 规则 2：不要一次性改太多文件
每次 commit 只做一件事。不要同时改 UI + API + 数据库。

## 规则 3：类型安全
所有函数的输入输出必须有 TypeScript 类型。类型定义统一在 `src/types/` 中。

## 规则 4：服务器代码隔离
`src/lib/server/` 下的文件绝不能被前端组件 import。如果需要在前端使用服务端数据，走 API Route。

## 规则 5：Mobile-First
所有 UI 先为 375px 宽度设计。用 Tailwind 的 `sm:` `md:` `lg:` 做响应式放大，不要反过来。

## 规则 6：不编造数据
- 开发阶段可以用 mock 数据，但必须标注 `// MOCK DATA - replace with real API`
- 永远不要在代码中硬编码教授信息
- 示例数据放在 `src/lib/mock-data.ts`，生产环境不加载

## 规则 7：错误处理
所有 API 调用都要 try-catch。Semantic Scholar API 可能返回 429 (rate limit)，必须处理。Claude API 可能超时，必须处理。

## 规则 8：每个 API Route 的结构

```typescript
export async function POST(req: Request) {
  try {
    // 1. 解析请求
    const body = await req.json();
    
    // 2. 验证输入
    if (!body.required_field) {
      return Response.json({ error: "Missing required_field" }, { status: 400 });
    }
    
    // 3. 业务逻辑
    const result = await doSomething(body);
    
    // 4. 返回结果
    return Response.json(result);
    
  } catch (error) {
    console.error("[API_NAME]", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 规则 9：commit message 格式
```
feat(ai): implement research dive RAG engine
fix(professors): correct Semantic Scholar matching logic
ui(home): add hero section with AI entry point
api(outreach): add credit check before email generation
```

## 规则 10：不要安装未列出的依赖
只使用 CLAUDE.md 中列出的依赖。如果需要新依赖，先说明理由。
