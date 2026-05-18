## Tasks

### Task 1: Update stats card labels and numbers

**File**: `app/koala/home/HomeClient.tsx`

- [x] Line ~627: Change `认证导师` → `教授·学者·研究员`
- [x] Line ~630: Change `8` → `30+`
- [x] Line ~631: Change `Go8 大学` → `澳洲大学`

### Task 2: Update three-step flow copy

**File**: `app/koala/home/HomeClient.tsx`

- [x] Line ~329: Change `覆盖 8 所 Go8 大学` → `覆盖全澳 30+ 所大学`
- [x] Line ~338: Change `从 ${profCount} 位导师中` → `从 ${profCount} 位导师/学者中`

### Verification

- [x] `npm run build` passes
- [ ] Visual check: stats section shows "教授·学者·研究员", "30+", "澳洲大学"
- [ ] Visual check: step 1 shows "覆盖全澳 30+ 所大学"
- [ ] Visual check: step 2 mentions "导师/学者"
