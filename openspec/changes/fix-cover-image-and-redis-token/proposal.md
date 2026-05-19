## Why

Blog cover image generation fails with "All image models failed" when the fallback chain reaches dall-e-3, because the code passes `response_format: 'b64_json'` which dall-e-3 does not support (400 Unknown parameter). Additionally, the Upstash Redis token in Vercel has trailing whitespace/newline causing auth failures.

## What Changes

- Fix dall-e-3 fallback in `app/api/blog/generate-cover/route.ts`: remove `response_format: 'b64_json'` for dall-e-3 calls, fetch the returned URL and convert to base64 instead
- Provide operational instructions for manually trimming the `UPSTASH_REDIS_REST_TOKEN` environment variable in Vercel dashboard

## Capabilities

### New Capabilities

_(none — these are bug fixes to existing functionality)_

### Modified Capabilities

_(none — no spec-level behavior changes, only implementation fixes)_

## Impact

- **Code**: `app/api/blog/generate-cover/route.ts` — dall-e-3 branch modified
- **Ops**: Vercel environment variable `UPSTASH_REDIS_REST_TOKEN` needs manual cleanup
- **No breaking changes**
