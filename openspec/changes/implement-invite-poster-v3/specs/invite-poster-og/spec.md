## ADDED Requirements

### Requirement: Poster renders as 750×1334 PNG via ImageResponse

The API route `GET /api/invite-poster?code={code}` SHALL return a 750×1334 PNG image generated using `ImageResponse` from `next/og`. The route file SHALL be `app/api/invite-poster/route.tsx` (replacing the existing `.ts`).

#### Scenario: Valid referral code returns PNG
- **WHEN** a GET request is made to `/api/invite-poster?code=KOALA-ABC123`
- **THEN** the response SHALL have `Content-Type: image/png`, status 200, and body containing a valid PNG image of dimensions 750×1334

#### Scenario: Missing code parameter returns 400
- **WHEN** a GET request is made to `/api/invite-poster` without a `code` parameter
- **THEN** the response SHALL return status 400 with JSON `{ "error": "Missing code parameter" }`

#### Scenario: Response includes cache headers
- **WHEN** any successful PNG response is returned
- **THEN** the response SHALL include `Cache-Control: public, max-age=3600, s-maxage=86400`

---

### Requirement: Chinese text renders correctly with Noto Sans SC Bold

The poster SHALL use Noto Sans SC Bold font for all Chinese text. The font SHALL be loaded from a bundled `.ttf` file at `assets/NotoSansSC-Bold.subset.ttf`.

#### Scenario: Chinese characters display without tofu boxes
- **WHEN** the poster is generated with Chinese user name "张三"
- **THEN** all Chinese characters SHALL render as readable glyphs, not replacement boxes

#### Scenario: Font is loaded from local file
- **WHEN** the route handler initializes
- **THEN** it SHALL read the font via `readFile(join(process.cwd(), 'assets/NotoSansSC-Bold.subset.ttf'))`

---

### Requirement: Green gradient background

The poster background SHALL be a vertical linear gradient from `#0D7C5F` (top) to `#063D32` (bottom), filling the entire 750×1334 canvas.

#### Scenario: Background gradient renders
- **WHEN** the poster is generated
- **THEN** the background SHALL display a green gradient from `#0D7C5F` to `#063D32`

---

### Requirement: Top branding section

The poster top section SHALL display:
1. Ola avatar — a circular element with the Ola mascot SVG icon
2. "Koala PhD" in white bold text
3. "www.koalaphd.com" in smaller white/semi-transparent text

#### Scenario: Branding elements are visible
- **WHEN** the poster is generated
- **THEN** the top area SHALL show the Ola avatar circle, "Koala PhD" in white bold, and the domain "www.koalaphd.com"

---

### Requirement: User invite card with personalization

The poster SHALL display a semi-transparent rounded card containing:
1. A gold (#FFD700) circle with the user's first character (initial)
2. Text: "{用户名}同学邀请你加入"
3. Text showing days since registration: "已使用 {N} 天"

User data SHALL be queried from Supabase by looking up the referral code in `referral_codes` table, then the user profile from `user_profiles` table.

#### Scenario: Known user with referral code
- **WHEN** the code matches a `referral_codes` record with a linked `user_profiles` entry having `display_name = "小明"` and `created_at` 30 days ago
- **THEN** the card SHALL show a gold circle with "小", text "小明同学邀请你加入", and "已使用 30 天"

#### Scenario: Unknown referral code falls back to defaults
- **WHEN** the code does not match any `referral_codes` record
- **THEN** the card SHALL show initial "K", name "Koala 用户", and "已使用 1 天"

---

### Requirement: Headline and subtitle

The poster SHALL display:
1. Headline: "邀请好友 各得15积分" where "15积分" is rendered in gold (#FFD700)
2. Subtitle: "你的PhD申请AI智能顾问平台" in white/semi-transparent text

#### Scenario: Headline with gold accent
- **WHEN** the poster is generated
- **THEN** "邀请好友 各得" SHALL appear in white and "15积分" SHALL appear in gold #FFD700

---

### Requirement: Four feature rows with gold icons

The poster SHALL display 4 horizontal rows, each containing a gold (#FFD700) SVG icon on the left and white descriptive text on the right:

1. Search/magnifier icon — "AI 智能匹配 · 24,494 位澳洲学者库"
2. Envelope icon — "一键生成个性化套磁信 · 30秒搞定"
3. Document icon — "CV / SOP 文书审阅 + 模拟面试"
4. Book icon — "学术知识库 · 快速查找技术资料与索引"

#### Scenario: All four features render
- **WHEN** the poster is generated
- **THEN** 4 rows SHALL be visible, each with a gold icon and the corresponding Chinese text

---

### Requirement: QR code with white rounded frame

The poster SHALL display a QR code in the lower-left area:
1. White rounded-corner container
2. QR code generated from URL `https://www.koalaphd.com/koala/register?ref={code}`
3. Label "扫码注册" below the QR
4. Referral code badge below the label

The QR SHALL be generated using the `qrcode` library as a data URL.

#### Scenario: QR code is scannable
- **WHEN** the poster with code "KOALA-TEST" is generated and the QR area is scanned
- **THEN** it SHALL decode to `https://www.koalaphd.com/koala/register?ref=KOALA-TEST`

#### Scenario: QR code has white frame
- **WHEN** the poster is generated
- **THEN** the QR code SHALL be inside a white rounded-corner container

---

### Requirement: Ola welcome section (lower-right)

The poster lower-right area SHALL display:
1. Ola mascot welcome SVG illustration
2. A speech bubble with text: "我叫Ola，是你澳洲研究型课程的小助理~"

#### Scenario: Ola mascot and bubble render
- **WHEN** the poster is generated
- **THEN** the Ola illustration and speech bubble text SHALL be visible in the lower-right area

---

### Requirement: Footer with domain

The poster bottom SHALL display "www.koalaphd.com" in semi-transparent white text, centered.

#### Scenario: Footer renders
- **WHEN** the poster is generated
- **THEN** the bottom of the poster SHALL show "www.koalaphd.com" centered

---

### Requirement: Frontend SharePoster uses the same endpoint

The existing `SharePoster.tsx` component SHALL continue to work with `GET /api/invite-poster?code={code}`. No frontend changes are required since the API contract is preserved.

#### Scenario: SharePoster displays the new poster
- **WHEN** a user opens the share poster modal
- **THEN** the `<img>` element SHALL load from `/api/invite-poster?code={referralCode}` and display the v3 poster design
