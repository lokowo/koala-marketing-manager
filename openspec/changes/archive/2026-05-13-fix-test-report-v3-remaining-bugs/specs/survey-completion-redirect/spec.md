## MODIFIED Requirements

### Requirement: Survey completion page uses correct domain and brand name
The survey success page (`/s/[code]/success`) and all public-facing survey pages SHALL reference the current domain `koalaphd.com` and brand name from `BRAND` constants. No hardcoded references to the old domain `koalastudy.net` or outdated brand name `Koala Study Advisors` SHALL exist in user-facing code.

#### Scenario: User completes survey and sees success page
- **WHEN** a respondent completes a survey and lands on `/s/{code}/success`
- **THEN** the brand description reads the value from `BRAND.name` (currently "Koala Study Advisors")
- **AND** the "访问 Koala" button links to `/koala/home` (relative path)

#### Scenario: QR code URL generation
- **WHEN** the system generates a QR code for survey distribution via `/api/surveys/qrcodes`
- **THEN** the base URL uses `process.env.NEXT_PUBLIC_APP_URL` with fallback to `https://koalaphd.com` (not `koalastudy.net`)

### Requirement: Export documents use current domain
All AI chat export documents (DOCX, Markdown) SHALL reference `koalaphd.com` instead of `koalastudy.net`.

#### Scenario: User exports AI conversation
- **WHEN** a user exports an AI chat conversation
- **THEN** the footer/header in the exported document shows `koalaphd.com`
