## MODIFIED Requirements

### Requirement: Tools page shows only free tools
The `/koala/tools` page SHALL display only the free tools grid, a CTA banner linking to `/koala/pricing`, human consultation card, and a free tools reminder. It SHALL NOT display credit packs, Stripe checkout UI, or credit usage instructions.

#### Scenario: Tools page content
- **WHEN** user visits `/koala/tools`
- **THEN** the page shows the free tools grid, a "查看订阅套餐" CTA linking to `/koala/pricing`, human consultation card, and free tools reminder
- **THEN** no credit pack purchase UI is displayed

#### Scenario: Tools page title
- **WHEN** user visits `/koala/tools`
- **THEN** the page title reads "免费工具箱" (not "工具 & 定价")

### Requirement: Top navigation includes pricing link
The desktop TopNavBar SHALL include a "定价" link pointing to `/koala/pricing`, positioned between "教授库" and "我的".

#### Scenario: Desktop nav pricing link
- **WHEN** user views the TopNavBar on desktop
- **THEN** a "定价" link with CreditCard icon is visible and navigates to `/koala/pricing`

### Requirement: My-profile credits section links to pricing
The credits card on `/koala/my-profile` SHALL include a "充值/订阅 →" link that navigates to `/koala/pricing`.

#### Scenario: Credits card pricing link
- **WHEN** user views the credits card on their profile page
- **THEN** a "充值/订阅 →" link is displayed alongside the existing "查看积分明细 →" link
- **THEN** clicking it navigates to `/koala/pricing`
