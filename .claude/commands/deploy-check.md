# 部署前检查清单

在部署到 Vercel 之前运行此检查。

## 执行步骤

1. 运行 `npm run build`，确认 exit 0 且无 TypeScript 错误
2. 运行 smoke-tester agent，获取测试报告
3. 如果有 UI 变更，运行 design-reviewer agent
4. 检查 git status，确认没有未提交的变更
5. 检查 git log --oneline -5，确认 commit message 清晰

## 输出

```
## 部署检查 — {date}
- [ ] Build: PASS/FAIL
- [ ] Smoke test: PASS/FAIL（{N}/{M} 通过）
- [ ] Design review: PASS/FAIL/N/A
- [ ] Git clean: YES/NO
- [ ] 结论: 🟢 GO / 🔴 NO-GO
```

如果结论为 🔴，列出所有阻塞项，不要部署。
