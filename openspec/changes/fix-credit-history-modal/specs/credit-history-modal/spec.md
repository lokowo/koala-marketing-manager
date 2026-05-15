## ADDED Requirements

### Requirement: Credit history modal opens on button click
The system SHALL display a modal overlay when the user clicks the「查看积分明细 →」button on the my-profile page. The modal MUST appear immediately without requiring the user to scroll.

#### Scenario: User opens credit history modal
- **WHEN** user clicks「查看积分明细 →」button in the credits card
- **THEN** a modal overlay appears with a semi-transparent backdrop covering the full viewport
- **THEN** the modal content panel displays the credit transaction history

#### Scenario: User closes modal via backdrop
- **WHEN** the modal is open and user clicks the backdrop area outside the content panel
- **THEN** the modal closes and returns to the my-profile page

#### Scenario: User closes modal via close button
- **WHEN** the modal is open and user clicks the「关闭」or「×」button
- **THEN** the modal closes and returns to the my-profile page

### Requirement: Modal displays complete transaction history
The modal SHALL display all credit transactions for the current user, ordered by time descending (newest first). Each transaction row MUST include: time, type badge, description, amount change, and balance after change.

#### Scenario: Transaction row displays all required fields
- **WHEN** the modal is open and transactions exist
- **THEN** each row displays the time formatted as YYYY-MM-DD HH:mm
- **THEN** each row displays a colored type badge (e.g. 签到, 购买, 消耗)
- **THEN** each row displays the transaction description text
- **THEN** each row displays the amount: green text with + prefix for positive, red text with - prefix for negative
- **THEN** each row displays the balance_after value

#### Scenario: No transactions exist
- **WHEN** the modal is open and the user has no credit transactions
- **THEN** the modal displays an empty state message「暂无积分记录」

### Requirement: Type badge color mapping
The system SHALL map transaction type values to distinct colored badges for visual differentiation.

#### Scenario: Known transaction types display correct badges
- **WHEN** a transaction has type `daily_checkin`
- **THEN** the badge displays「签到」with blue styling

- **WHEN** a transaction has type `profile_complete`
- **THEN** the badge displays「完善资料」with green styling

- **WHEN** a transaction has type `referral`
- **THEN** the badge displays「邀请好友」with purple styling

- **WHEN** a transaction has type `purchase`
- **THEN** the badge displays「购买」with gold styling

- **WHEN** a transaction has type `spend`
- **THEN** the badge displays「消耗」with orange styling

#### Scenario: Unknown transaction type
- **WHEN** a transaction has an unrecognized type value
- **THEN** the badge displays the raw type string with gray styling

### Requirement: Modal responsive layout
The modal MUST adapt to screen size following mobile-first design.

#### Scenario: Mobile viewport (< 768px)
- **WHEN** the viewport width is less than 768px
- **THEN** the modal content panel anchors to the bottom of the screen (bottom sheet style)
- **THEN** the panel has a maximum height of 70vh with internal scrolling

#### Scenario: Desktop viewport (>= 768px)
- **WHEN** the viewport width is 768px or greater
- **THEN** the modal content panel is centered on screen
- **THEN** the panel has max-width of 28rem (md) and maximum height of 70vh with internal scrolling

### Requirement: Modal supports dark mode
The modal MUST respect the current theme (light/dark) of the my-profile page.

#### Scenario: Dark mode active
- **WHEN** dark mode is active
- **THEN** the modal backdrop, content panel, text colors, and badge colors use dark-mode variants consistent with the existing page theme

### Requirement: API returns full transaction history
The `GET /api/user/credits` endpoint SHALL return up to 200 transactions instead of the current limit of 10.

#### Scenario: User has fewer than 200 transactions
- **WHEN** the API is called and user has 50 transactions
- **THEN** all 50 transactions are returned in `recentTransactions`

#### Scenario: User has more than 200 transactions
- **WHEN** the API is called and user has 300 transactions
- **THEN** the 200 most recent transactions are returned in `recentTransactions`
