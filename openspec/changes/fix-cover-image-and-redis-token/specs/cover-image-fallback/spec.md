## ADDED Requirements

### Requirement: dall-e-3 fallback uses URL fetch instead of b64_json
The generate-cover endpoint SHALL NOT pass `response_format: 'b64_json'` when calling dall-e-3. Instead, it SHALL use the default URL response, fetch the image, and convert to base64.

#### Scenario: dall-e-3 fallback succeeds after gpt-image models fail
- **WHEN** gpt-image-2 and gpt-image-1 both fail
- **AND** dall-e-3 is attempted
- **THEN** the API call SHALL omit `response_format` parameter
- **AND** the returned URL SHALL be fetched and converted to base64
- **AND** the base64 image SHALL be uploaded to Supabase Storage as normal

#### Scenario: dall-e-3 URL fetch failure
- **WHEN** dall-e-3 returns a URL but the fetch fails
- **THEN** the error SHALL be caught and logged
- **AND** the endpoint SHALL return the "All image models failed" error
