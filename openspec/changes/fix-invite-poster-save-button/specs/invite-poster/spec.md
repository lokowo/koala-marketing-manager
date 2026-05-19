## ADDED Requirements

### Requirement: Poster save uses server-rendered image
The system SHALL fetch the poster PNG from `/api/invite-poster` and trigger a client-side download, without using html2canvas or any client-side screenshot library.

#### Scenario: Desktop browser save
- **WHEN** user clicks "保存海报" on a desktop browser
- **THEN** the system fetches `/api/invite-poster?code={referralCode}`, converts the response to a blob, and triggers an `<a download>` to save `koala-invite-{code}.png`

#### Scenario: Mobile browser save
- **WHEN** user clicks "保存海报" on a mobile browser
- **THEN** the system attempts `window.open(blobUrl)` to display the image in a new tab, with a toast "长按图片保存到相册"; if popup is blocked, falls back to `<a download>`

#### Scenario: API failure fallback
- **WHEN** the fetch to `/api/invite-poster` fails (network error, 500, timeout)
- **THEN** the system shows toast "保存失败，请长按图片保存" and the poster image remains visible in the modal for manual long-press save

### Requirement: No stale OG invite route
The `/api/og/invite` route SHALL be removed to prevent confusion with the canonical `/api/invite-poster` endpoint.

#### Scenario: OG invite route deleted
- **WHEN** a request is made to `/api/og/invite`
- **THEN** it returns 404 (route no longer exists)
