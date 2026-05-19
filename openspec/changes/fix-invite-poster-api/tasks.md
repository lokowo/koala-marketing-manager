## Tasks

### Task 1: Make font loading resilient

- Try local font file first (public/fonts/NotoSansSC-Regular.ttf)
- Fall back to Google Fonts with 5s timeout
- Return null instead of throwing if both fail
- Render with sans-serif fallback when no CJK font available

### Task 2: Add timeouts to external fetches

- Avatar fetch: 5s timeout
- Google Fonts CSS fetch: 5s timeout
- Google Fonts file fetch: 5s timeout

### Verification

- Build includes /api/og/invite route
- Valid code returns PNG image
- Invalid code returns 404 JSON
- Missing code returns 400 JSON
