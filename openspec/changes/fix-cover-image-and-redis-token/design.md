## Context

The blog cover image generation endpoint (`app/api/blog/generate-cover/route.ts`) uses a fallback chain: gpt-image-2 → gpt-image-1 → dall-e-3. All three branches currently pass `response_format: 'b64_json'`, but dall-e-3 does not support this parameter and returns a 400 error, making the entire fallback chain fail.

Separately, the `UPSTASH_REDIS_REST_TOKEN` env var on Vercel contains trailing whitespace or newline characters, causing Redis auth failures.

## Goals / Non-Goals

**Goals:**
- dall-e-3 fallback works correctly by fetching the image URL and converting to base64
- Provide clear Vercel env var cleanup instructions for the Redis token

**Non-Goals:**
- Changing the model priority order
- Adding new image models
- Programmatic env var trimming (Vercel dashboard is the source of truth)

## Decisions

**Decision 1: Fetch URL + convert for dall-e-3**
- dall-e-3 returns a URL in `response.data[0].url` when no `response_format` is specified
- We fetch that URL, read the response as an ArrayBuffer, then convert to base64
- This keeps the rest of the pipeline (Supabase upload) unchanged since it already expects base64
- Alternative considered: passing `response_format: 'url'` explicitly — rejected because the default is already URL and being explicit about an unsupported param namespace risks future breakage

**Decision 2: Operational runbook for Redis token**
- The fix is trimming whitespace in the Vercel dashboard — no code change needed
- We document the exact steps rather than adding `.trim()` in code, because the env var should be clean at the source

## Risks / Trade-offs

- [Risk] dall-e-3 URL may expire before fetch completes → Mitigation: fetch happens immediately in the same request, URLs are valid for ~60 minutes
- [Risk] Large image fetch may timeout → Mitigation: dall-e-3 images are typically <5MB, well within Vercel function limits
