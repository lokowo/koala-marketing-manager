## 1. Fix dall-e-3 fallback in cover image generation

- [x] 1.1 Modify dall-e-3 branch in `app/api/blog/generate-cover/route.ts`: remove `response_format: 'b64_json'`, use default URL response, fetch the URL and convert to base64
- [x] 1.2 Verify build passes with `npm run build`

## 2. Redis token cleanup instructions

- [x] 2.1 Create operational note with step-by-step Vercel dashboard instructions for trimming `UPSTASH_REDIS_REST_TOKEN`
