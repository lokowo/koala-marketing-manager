# Spec: Sales Promo Center

## ADDED Requirements

### Requirement: Three-Tab Layout
The promo center page MUST display 3 tabs: 推广链接, 推广二维码, 推广海报. The first tab SHALL be active by default. Tab switching MUST NOT cause a full page reload.

#### Scenario: Default tab is promotion links
- **WHEN** a sales user navigates to /dashboard/sales/promo-center
- **THEN** the 推广链接 tab is active and its content is displayed

#### Scenario: Tab switching is seamless
- **WHEN** the user clicks the 推广二维码 tab
- **THEN** the tab content switches to QR code view without a page reload

### Requirement: Promotion Links Tab (推广链接)
The links tab MUST display 9 channel cards, each with the channel name, a copy button, a link preview, and click statistics. Clicking the copy button MUST copy the full promotion URL to clipboard.

#### Scenario: Channel cards render with stats
- **WHEN** the 推广链接 tab is active
- **THEN** 9 channel cards are displayed, each showing the channel name, a preview of the link, click count, and a copy button

#### Scenario: Copy link to clipboard
- **WHEN** the user clicks the copy button on a channel card
- **THEN** the promotion link with the user's referral code and channel parameter is copied to clipboard and a "已复制" toast appears

### Requirement: QR Code Tab (推广二维码)
The QR code tab MUST display a large QR code at 240px, a channel selector dropdown, and download buttons for PNG and SVG formats. Changing the channel selector MUST regenerate the QR code with the new channel parameter.

#### Scenario: QR code renders at correct size
- **WHEN** the 推广二维码 tab is active
- **THEN** a QR code renders at 240x240px encoding the promotion link for the currently selected channel

#### Scenario: Channel selector changes QR code
- **WHEN** the user selects a different channel from the dropdown
- **THEN** the QR code regenerates to encode the promotion link with the newly selected channel parameter

#### Scenario: Download QR code as PNG
- **WHEN** the user clicks the "下载 PNG" button
- **THEN** the QR code image downloads as a PNG file named with the channel and referral code

#### Scenario: Download QR code as SVG
- **WHEN** the user clicks the "下载 SVG" button
- **THEN** the QR code image downloads as an SVG file

### Requirement: Poster Tab (推广海报)
The poster tab MUST offer 3 poster templates: 简约, 学术, 活力. Each template MUST be rendered using Canvas API. The user MUST be able to input a custom tagline. A download button MUST export the poster as PNG.

#### Scenario: Three poster templates are displayed
- **WHEN** the 推广海报 tab is active
- **THEN** 3 poster template previews (简约, 学术, 活力) are displayed for selection

#### Scenario: Custom tagline input
- **WHEN** the user types a custom tagline in the input field
- **THEN** the selected poster template preview updates in real time to show the custom tagline text

#### Scenario: Download poster as PNG
- **WHEN** the user clicks the download button with a template selected
- **THEN** the poster is generated via Canvas API and downloaded as a PNG file

### Requirement: Legacy Route Redirect
The old /dashboard/sales/promo-tools route MUST redirect to /dashboard/sales/promo-center permanently.

#### Scenario: Old promo-tools URL redirects
- **WHEN** a user or bookmark navigates to /dashboard/sales/promo-tools
- **THEN** they are redirected to /dashboard/sales/promo-center
