# Spec: Sales Settings Page

## ADDED Requirements

### Requirement: Personal Info Section
The settings page MUST display a personal info section containing: avatar (display only), name (readonly), email (readonly), phone (editable), and referral code (readonly with copy button).

#### Scenario: Personal info renders with correct editability
- **WHEN** a sales user navigates to /dashboard/sales/settings
- **THEN** avatar, name, email, and referral code are displayed as readonly, and the phone field is editable with the current value pre-filled

#### Scenario: Phone number update
- **WHEN** the user edits the phone field and clicks save
- **THEN** the phone number is persisted to the sales_agents table and a success toast appears

### Requirement: Payment Info Section
The settings page MUST display a payment info section with: a method dropdown (bank transfer, PayPal, WeChat), an account number/ID field, and a payee name field. All fields MUST be editable and pre-filled with existing data.

#### Scenario: Payment info renders with existing data
- **WHEN** the settings page loads and the user has saved payment info
- **THEN** the payment method dropdown, account field, and name field are pre-filled with the stored values

#### Scenario: Payment info saves successfully
- **WHEN** the user selects "wechat" as method, enters an account ID and name, and clicks save
- **THEN** payment_method, payment_account, and payment_name are persisted to the sales_agents table

### Requirement: Notification Toggles
The settings page MUST display 3 notification toggles: registration notifications (新注册通知), commission notifications (佣金到账通知), and weekly report (每周报告). Each toggle MUST reflect the current database state.

#### Scenario: Notification toggles reflect saved state
- **WHEN** the settings page loads
- **THEN** each toggle (registration, commission, weekly report) reflects the current boolean value from the database

#### Scenario: Toggle a notification preference
- **WHEN** the user toggles the commission notification off and clicks save
- **THEN** notify_commission is set to false in the sales_agents table

### Requirement: Database Schema Extension
The sales_agents table MUST be extended with the following new columns: phone (text, nullable), avatar_url (text, nullable), payment_method (text, nullable, one of 'bank'/'paypal'/'wechat'), payment_account (text, nullable), payment_name (text, nullable), notify_registration (boolean, default true), notify_commission (boolean, default true), notify_weekly_report (boolean, default true).

#### Scenario: New columns exist with defaults
- **WHEN** a new sales agent record is created
- **THEN** notify_registration, notify_commission, and notify_weekly_report default to true, and phone, avatar_url, payment_method, payment_account, payment_name default to null

### Requirement: Save All Sections Together
The page MUST have a single save button that persists all sections (personal info, payment info, notification toggles) in one API call to avoid partial saves.

#### Scenario: Single save updates all fields
- **WHEN** the user edits phone, payment method, and toggles a notification, then clicks save
- **THEN** all changes are persisted in a single API request and a success toast confirms the update
