## Why

教授库页面无限滚动失效：下拉到底部时 loading spinner 一直转但不出新数据。根因是 `loadMore` 中 `setPage(p => p + 1)` 通过 React state 递增页码，但 `pageRef.current = page` 要等下次渲染才同步。`.finally()` 在渲染前就把 `loadingMoreRef` 解锁，IntersectionObserver 可能在 React 重渲染前再次触发 `loadMore`，此时 `pageRef.current` 仍是旧值，导致重复请求同一页，dedup 过滤掉全部重复数据，列表不增长。

## What Changes

- 将 `pageRef` 改为页码的唯一来源（source of truth），在 `.then()` 中直接 `pageRef.current += 1`，不再依赖 React state → ref 同步
- 移除 `page` state 及 `setPage`，消除 state/ref 双源竞争
- 移除 dedup 逻辑（`ids.has(p.id)` 过滤）——页码正确递增后不会出现重复数据，dedup 反而会掩盖未来类似 bug

## Capabilities

### New Capabilities

- `infinite-scroll-fix`: 修复教授列表无限滚动的页码竞态条件，移除冗余 dedup

### Modified Capabilities

_(none)_

## Impact

- `app/koala/professors/ProfessorsClient.tsx` — loadMore 函数、page state、pageRef 同步逻辑、dedup 逻辑
- 无 API 变更，无数据库变更
