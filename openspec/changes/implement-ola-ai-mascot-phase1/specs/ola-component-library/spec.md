## ADDED Requirements

### Requirement: OlaAvatar component
The system SHALL provide an `OlaAvatar` component at `app/koala/components/ola/OlaAvatar.tsx`.

Props:
- `state`: `'welcome' | 'thinking' | 'celebrate' | 'suggest' | 'sleepy' | 'cheer' | 'surprise' | 'focus'` (required)
- `size`: `'sm' | 'md' | 'lg' | 'xl'` (default `'md'`)
- `className`: optional string

Size mapping:
- `sm` → 32px, renders SVG
- `md` → 48px, renders SVG
- `lg` → 128px, renders PNG (128px asset)
- `xl` → 512px, renders PNG (512px asset)

The component SHALL fall back to SVG if the PNG fails to load (via `onError` handler).

#### Scenario: Render at small size
- **WHEN** `<OlaAvatar state="welcome" size="sm" />` is rendered
- **THEN** a 32px SVG image of Ola in welcome state is displayed

#### Scenario: Render at large size
- **WHEN** `<OlaAvatar state="thinking" size="lg" />` is rendered
- **THEN** a 128px PNG image of Ola in thinking state is displayed

#### Scenario: PNG load failure fallback
- **WHEN** `<OlaAvatar state="celebrate" size="lg" />` is rendered and the PNG fails to load
- **THEN** the component falls back to displaying the SVG version

#### Scenario: Dark mode rendering
- **WHEN** OlaAvatar is rendered in dark mode
- **THEN** the image displays correctly on dark backgrounds (PNG has transparent background, SVG uses hardcoded hex colors)

### Requirement: OlaWidget floating button component
The system SHALL provide an `OlaWidget` component at `app/koala/components/ola/OlaWidget.tsx`.

The component SHALL render a circular floating button displaying `OlaAvatar` in welcome state at 48px size, with a green border ring (#0D7C5F).

Props:
- `onClick`: callback function (required)
- `className`: optional string

The button SHALL scale to 1.1× on hover with a CSS transition.

#### Scenario: Default rendering
- **WHEN** `<OlaWidget onClick={handler} />` is rendered
- **THEN** a 48px circular Ola avatar with green border ring is displayed

#### Scenario: Hover interaction
- **WHEN** user hovers over the OlaWidget
- **THEN** the button scales to 1.1× with a smooth transition

#### Scenario: Click interaction
- **WHEN** user clicks the OlaWidget
- **THEN** the `onClick` callback is invoked

### Requirement: OlaLoading component
The system SHALL provide an `OlaLoading` component at `app/koala/components/ola/OlaLoading.tsx`.

The component SHALL display:
1. OlaAvatar in `thinking` state at `lg` size (128px)
2. Text below: "小欧正在思考..." (Chinese) or "Ola is thinking..." (English)
3. A CSS animation: thought bubble dots fading in and out in a loop

Props:
- `lang`: `'zh' | 'en'` (default `'zh'`)
- `className`: optional string

#### Scenario: Chinese loading display
- **WHEN** `<OlaLoading />` is rendered
- **THEN** Ola thinking avatar (128px) is shown with text "小欧正在思考..." and animated thought bubbles

#### Scenario: English loading display
- **WHEN** `<OlaLoading lang="en" />` is rendered
- **THEN** Ola thinking avatar (128px) is shown with text "Ola is thinking..."

### Requirement: OlaEmpty component
The system SHALL provide an `OlaEmpty` component at `app/koala/components/ola/OlaEmpty.tsx`.

The component SHALL display:
1. OlaAvatar in `sleepy` state at `lg` size (128px)
2. A message string below the avatar
3. An optional action button (link)

Props:
- `message`: string (required)
- `actionLabel`: optional string
- `actionHref`: optional string
- `className`: optional string

The action button SHALL use the project's standard button style: `bg-[#1A1A2E] text-white dark:bg-[#D4A843] dark:text-[#080c10]`.

#### Scenario: Empty state with message only
- **WHEN** `<OlaEmpty message="没找到匹配的教授" />` is rendered
- **THEN** Ola sleepy avatar (128px) is shown with the message text below

#### Scenario: Empty state with action button
- **WHEN** `<OlaEmpty message="还没有收藏" actionLabel="去教授库" actionHref="/koala/professors" />` is rendered
- **THEN** Ola sleepy avatar, message text, and a "去教授库" button linking to `/koala/professors` are displayed

#### Scenario: Dark mode display
- **WHEN** OlaEmpty is rendered in dark mode
- **THEN** text uses dark mode colors (text-[#c8d0d4] for message, button uses dark variant)
