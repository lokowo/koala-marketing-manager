## ADDED Requirements

### Requirement: Homepage displays AI tools card grid
The `/koala/home` page SHALL display a grid of 6 AI tool cards after the Three Steps section. Each card SHALL show an emoji icon, title, description, and link to the corresponding Ola chat mode. The grid SHALL be 2 columns on mobile and 3 columns on desktop.

#### Scenario: AI tools grid displays all 6 tools
- **WHEN** user visits `/koala/home`
- **THEN** 6 AI tool cards are displayed: AI 选校, 科研助手, AI 聊天, 套磁信生成, RP 助手, 模拟面试
- **THEN** each card links to `/koala/chat` with the appropriate mode parameter

#### Scenario: User clicks AI tool card
- **WHEN** user clicks the "套磁信生成" card
- **THEN** browser navigates to `/koala/chat?mode=write`

### Requirement: Homepage displays pricing preview section
The `/koala/home` page SHALL display a pricing preview section after the blog carousel showing 3 credit pack highlights (入门 AUD 4.99, 标准 AUD 9.99, 专业 AUD 19.99) with a CTA link to `/koala/pricing`.

#### Scenario: Pricing preview content
- **WHEN** user views the pricing preview section on homepage
- **THEN** 3 credit pack cards are shown with pack name, credit amount, and price
- **THEN** a "查看完整定价" link navigates to `/koala/pricing`

### Requirement: Homepage displays footer
The `/koala/home` page SHALL display a footer section at the bottom with: copyright notice, brand name "Koala PhD 考拉博士", contact email, and links to terms/privacy.

#### Scenario: Footer content
- **WHEN** user scrolls to the bottom of `/koala/home`
- **THEN** footer displays "© 2026 Koala PhD 考拉博士", contact info, and legal links

### Requirement: Homepage section ordering
The `/koala/home` page sections SHALL appear in this order: Hero, Three Steps, AI Tools Grid, Research Areas, Hot Professors, Blog Carousel, Pricing Preview, Bottom CTA, Footer.

#### Scenario: Section order on page
- **WHEN** user scrolls through `/koala/home`
- **THEN** sections appear in the specified order from top to bottom
