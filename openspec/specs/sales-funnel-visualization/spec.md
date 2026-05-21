## ADDED Requirements

### Requirement: Sales dashboard funnel visualization
The Sales dashboard MUST display a 4-level funnel visualization replacing the existing funnel section. Each level MUST show: KPI number label, level name, a horizontal bar with proportional width (relative to KPI 1 visits count), and the absolute count. Bar widths MUST be proportional to visits with a minimum of 5%. Each bar MUST use the KPI color with 20% opacity fill and a 3px solid left border.

Between consecutive levels, a conversion rate arrow MUST show the inter-level conversion percentage (e.g., "转化率 40%").

#### Scenario: Full funnel with data
- **WHEN** visits=100, registrations=40, payments=10, offline=3
- **THEN** bars show widths 100%, 40%, 10%, 5% (min) with conversion arrows: 40% (1→2), 25% (2→3), 30% (3→4)

#### Scenario: Zero visits
- **WHEN** visits=0
- **THEN** all bars show minimum 5% width, all conversion rates show "0%"

#### Scenario: Funnel colors match KPI scheme
- **WHEN** funnel renders
- **THEN** level 1 uses #3B82F6, level 2 uses #22C55E, level 3 uses #F59E0B, level 4 uses #8B5CF6

### Requirement: Funnel shows overall conversion percentages
Each funnel level (except the first) MUST show its value as a percentage of visits on the right side. Level 1 MUST show "100%".

#### Scenario: Right-side percentages
- **WHEN** visits=200, registrations=80, payments=20, offline=5
- **THEN** right labels show: 100%, 40%, 10%, 2.5% (rounded to nearest integer: 100%, 40%, 10%, 3%)
