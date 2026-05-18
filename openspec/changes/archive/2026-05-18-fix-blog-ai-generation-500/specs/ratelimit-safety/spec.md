## MODIFIED Requirements

### Requirement: Rate limiters fail-open on Redis errors
All rate limiter calls SHALL catch Redis connection/auth errors and allow the request to proceed. Rate limiting is non-critical middleware.

#### Scenario: Redis token expired
- **WHEN** Upstash Redis token is expired and a rate-limited route is called
- **THEN** the route SHALL skip rate limiting and proceed normally

#### Scenario: Redis unavailable
- **WHEN** Upstash Redis is unreachable and a rate-limited route is called
- **THEN** the route SHALL log a warning and proceed normally

### Requirement: Stripe checkout returns actionable errors
Stripe checkout SHALL return specific error messages based on the Stripe SDK error type.

#### Scenario: Invalid price ID
- **WHEN** Stripe returns "No such price" error
- **THEN** the response SHALL include an error indicating price configuration issue

#### Scenario: Missing API key
- **WHEN** Stripe returns "No API key provided" error
- **THEN** the response SHALL include an error indicating payment system not configured
