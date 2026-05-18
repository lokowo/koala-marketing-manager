## og-invite-poster

Server-side invite poster generation via next/og ImageResponse.

### API

**GET /api/og/invite?code={INVITE_CODE}**

Query params:
- `code` (required): 6-character invite code (e.g., `KOALA-XXX` or `ABC123`)

Response:
- Content-Type: `image/png`
- Size: 750x1334 pixels
- Cache: `public, max-age=3600` (1 hour — regenerated if user changes avatar/name)

Error cases:
- Missing `code` → 400 JSON `{ error: "Missing code parameter" }`
- Invalid/unknown code → 404 JSON `{ error: "Invalid invite code" }`

### Poster Layout (750x1334)

```
┌──────────────────────────────────┐
│  gradient bg #0D7C5F → #085544  │
│                                  │
│     [Koala logo emoji 🐨]       │
│     KOALA STUDY ADVISORS         │
│                                  │
│     ┌────────────────────┐       │
│     │   [user avatar]    │       │
│     │     64x64 circle   │       │
│     └────────────────────┘       │
│     "{displayName} 同学邀请你加入"│
│                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 🎯  │ │ 📚  │ │ ✉️  │       │
│  │AI匹 │ │24k+ │ │一站 │       │
│  │配导师│ │教授库│ │式申请│      │
│  └─────┘ └─────┘ └─────┘       │
│                                  │
│     ┌────────────────┐           │
│     │   QR CODE      │           │
│     │   200x200      │           │
│     └────────────────┘           │
│     扫码注册 各得15积分           │
│                                  │
│     ─────────────────            │
│     koalaphd.com                 │
└──────────────────────────────────┘
```

### Data Requirements

From Supabase given the invite code:
- `user_profiles.display_name` or `user_profiles.full_name` → displayName
- `user_profiles.avatar_url` → user avatar (optional, fallback to initial letter)

QR code content: `https://www.koalaphd.com/koala/auth?ref={code}`

### Font

Noto Sans SC Regular (400) fetched from Google Fonts CDN at request time.

### SharePoster Component Changes

Replace current DOM-based poster rendering with:
1. `<img>` tag pointing to `/api/og/invite?code={referralCode}`
2. Loading skeleton while image loads
3. "长按图片保存到相册" text below image
4. "复制链接" button (keep existing clipboard logic)
5. Remove: html2canvas, drawPosterFallback, client-side QRCode generation, posterRef
