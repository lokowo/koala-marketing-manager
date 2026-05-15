## ADDED Requirements

### Requirement: Ola image generation script
The system SHALL provide a Node.js script at `scripts/generate-ola-images.mjs` that generates Ola mascot images using the OpenAI gpt-image-1 API.

The script SHALL generate PNG images for 8 expression states: welcome, thinking, celebrate, suggest, sleepy, cheer, surprise, focus.

For each expression, the script SHALL generate two sizes:
- 512×512 px → `public/images/ola/ola-{state}-512.png`
- 128×128 px → `public/images/ola/ola-{state}-128.png`

The script SHALL use `OPENAI_API_KEY` from environment variables (loaded from `.env.local` or process.env).

The script SHALL use Node.js native `fetch` without requiring additional npm packages.

#### Scenario: Successful generation of all images
- **WHEN** the script is run with `node scripts/generate-ola-images.mjs`
- **THEN** 16 PNG files are created in `public/images/ola/` (8 states × 2 sizes)

#### Scenario: Missing API key
- **WHEN** the script is run without OPENAI_API_KEY set
- **THEN** the script SHALL exit with a clear error message indicating the missing key

#### Scenario: API error for a single expression
- **WHEN** gpt-image-1 returns an error for one expression
- **THEN** the script SHALL log the error and continue generating remaining expressions

### Requirement: Ola SVG assets
The system SHALL include hand-crafted SVG files for each of the 8 expression states at `public/images/ola/ola-{state}.svg`.

Each SVG SHALL depict a cartoon koala with:
- Round body, large fluffy ears (gray #A39E99, inner ear #C4BAB2)
- Big round eyes, black oval nose
- Green PhD graduation cap (#0D7C5F) with gold tassel (#FFD700)
- White/cream belly patch
- Pink blush on cheeks
- Expression-specific features matching the state name

SVG colors SHALL be hardcoded hex values, not CSS variables, to ensure theme independence.

#### Scenario: SVG files exist for all states
- **WHEN** the asset generation is complete
- **THEN** 8 SVG files exist at `public/images/ola/ola-{state}.svg` for each of the 8 states

### Requirement: Ola avatar SVG
The system SHALL include a simplified 48×48 SVG at `public/images/ola/ola-avatar.svg` showing only the Ola head (head, ears, eyes, nose, cap) without body or arms.

#### Scenario: Avatar SVG exists
- **WHEN** asset creation is complete
- **THEN** `public/images/ola/ola-avatar.svg` exists with viewBox appropriate for head-only rendering

### Requirement: Complete asset inventory
After all assets are generated, `public/images/ola/` SHALL contain exactly 25 files: 16 PNG (8 states × 2 sizes) + 8 full SVG + 1 avatar SVG.

#### Scenario: All assets present
- **WHEN** all asset generation and creation steps are complete
- **THEN** `ls public/images/ola/ | wc -l` outputs 25
