## ADDED Requirements

### Requirement: Poster API returns user invite data
`/api/share/poster` SHALL return the authenticated user's referral code, referral link URL, remaining invite count, and display name.

#### Scenario: Authenticated user requests poster data
- **WHEN** authenticated user sends GET to `/api/share/poster`
- **THEN** response contains `{ referralCode, referralUrl, remainingInvites, displayName }` with status 200

#### Scenario: Unauthenticated request
- **WHEN** unauthenticated user sends GET to `/api/share/poster`
- **THEN** response returns status 401

### Requirement: Share poster component renders visual poster
`SharePoster` component SHALL render a branded poster containing the user's display name, referral QR code (encoding `https://koalaphd.com/auth/register?ref={code}`), the referral code in text, remaining invite count, and Koala PhD branding.

#### Scenario: Poster renders with user data
- **WHEN** SharePoster receives valid poster data
- **THEN** poster displays QR code, referral code text, user name, remaining invites, and brand footer

#### Scenario: Invites exhausted for normal user
- **WHEN** user has 0 remaining invites and role is not admin
- **THEN** poster shows "邀请名额已用完" and disables save button

### Requirement: Poster can be saved as image
User SHALL be able to save the poster as a PNG image via html2canvas screenshot.

#### Scenario: User taps save button
- **WHEN** user taps "保存海报" button
- **THEN** html2canvas captures the poster element and triggers a download/save of the PNG

#### Scenario: html2canvas fails
- **WHEN** html2canvas throws an error (e.g. unsupported browser)
- **THEN** component shows a fallback with copy-link button and toast "截图失败，请手动复制链接"

### Requirement: My-profile page has invite entry point
The user's profile page SHALL have an "邀请好友" button that opens the share poster in a modal.

#### Scenario: User taps invite button
- **WHEN** user taps "邀请好友" on my-profile page
- **THEN** modal opens showing the SharePoster component

#### Scenario: User is not logged in
- **WHEN** unauthenticated user visits my-profile
- **THEN** invite button is not shown (page requires auth)
