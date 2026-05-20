## ADDED Requirements

### Requirement: Desktop TopNavBar includes blog link
The desktop TopNavBar SHALL include a "博客" link pointing to `/koala/blog`, positioned between "定价" and "我的".

#### Scenario: Desktop nav blog link
- **WHEN** user views the TopNavBar on desktop
- **THEN** a "博客" link with BookOpen icon is visible between "定价" and "我的"
- **THEN** clicking it navigates to `/koala/blog`

### Requirement: TopNavBar首页 link points to /koala/home
The "首页" link in TopNavBar SHALL point to `/koala/home` instead of `/koala/discover`.

#### Scenario: Desktop nav首页 link
- **WHEN** user clicks "首页" in the TopNavBar
- **THEN** browser navigates to `/koala/home`

### Requirement: BottomTabBar首页 link points to /koala/home
The "首页" tab in BottomTabBar SHALL point to `/koala/home` instead of `/koala/discover`.

#### Scenario: Mobile首页 tab
- **WHEN** user taps "首页" in the mobile BottomTabBar
- **THEN** browser navigates to `/koala/home`

### Requirement: Theme toggle removed from TopNavBar
The TopNavBar SHALL NOT contain a theme toggle button. Theme switching SHALL be available in the my-profile page settings section instead.

#### Scenario: No theme toggle in nav
- **WHEN** user views the TopNavBar on desktop
- **THEN** no light/dark/system theme toggle button is present in the navigation bar

#### Scenario: Theme toggle on my-profile
- **WHEN** user visits `/koala/my-profile`
- **THEN** a theme settings row is displayed with light/dark/system options
- **THEN** selecting an option immediately changes the theme

### Requirement: BottomTabBar active state correctness
The BottomTabBar center Ola button SHALL only be active on `/koala/chat` paths. The "首页" tab SHALL be active on `/koala/home` path.

#### Scenario: Active states on homepage
- **WHEN** user is on `/koala/home`
- **THEN** the "首页" tab is highlighted as active
- **THEN** the center Ola button is NOT highlighted as active
