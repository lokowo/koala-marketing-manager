## ADDED Requirements

### Requirement: Milestone definitions stored in database
The system SHALL store milestone definitions in `ola_milestones` with: milestone_key (unique), name_zh, name_en, description, reward_credits, ola_state, icon, sort_order.

### Requirement: User milestone tracking
The system SHALL track achieved milestones in `user_milestones` with: user_id, milestone_key (unique per user), achieved_at, reward_claimed.

### Requirement: Milestone detection at action time
#### Scenario: First professor search
- **WHEN** a user searches for professors for the first time
- **THEN** checkMilestone returns the first_search milestone with +2 credits

#### Scenario: Already achieved milestone
- **WHEN** checkMilestone is called for an already-achieved milestone
- **THEN** null is returned (no duplicate)

### Requirement: Celebration UI on achievement
#### Scenario: New milestone achieved
- **WHEN** a milestone is newly achieved
- **THEN** a full-screen celebration overlay shows with Ola celebrate avatar, milestone name, credit reward, and confetti animation

### Requirement: Achievements displayed on profile
#### Scenario: Profile achievements section
- **WHEN** user views their profile page
- **THEN** an achievements section shows unlocked milestones (colored) and locked milestones (greyed), with progress bar
