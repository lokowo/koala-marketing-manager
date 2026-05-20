## ADDED Requirements

### Requirement: /koala/register redirects to /koala/auth
Requests to `/koala/register` SHALL permanently redirect to `/koala/auth` preserving all query parameters.

#### Scenario: Scan old invite poster QR code
- **WHEN** a user visits `/koala/register?ref=ABC123`
- **THEN** they are redirected to `/koala/auth?ref=ABC123` with a permanent redirect status

#### Scenario: No query params
- **WHEN** a user visits `/koala/register` with no query params
- **THEN** they are redirected to `/koala/auth`

### Requirement: New invite posters encode correct URL
The invite poster QR code SHALL encode `https://koalaphd.com/koala/auth?ref=${code}` instead of `https://www.koalaphd.com/koala/register?ref=${code}`.

#### Scenario: Generate invite poster
- **WHEN** the invite poster API generates a QR code
- **THEN** the QR code encodes `https://koalaphd.com/koala/auth?ref=${code}`
