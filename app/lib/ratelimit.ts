import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export async function safeLimit(limiter: Ratelimit | null, key: string): Promise<boolean> {
  if (!limiter) return true
  try {
    const { success } = await limiter.limit(key)
    return success
  } catch (e) {
    console.warn('[ratelimit] Redis error, skipping rate limit:', (e as Error).message)
    return true
  }
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/^"|"$/g, '')
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/^"|"$/g, '')

const redis = redisUrl
  ? new Redis({ url: redisUrl, token: redisToken! })
  : null

// 调研问卷提交限流：每个 IP 每分钟最多 5 次
export const surveySubmitLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
    })
  : null

// AI 功能限流：每个用户每分钟最多 10 次
export const aiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
    })
  : null

// 深度搜索（Claude web search）限流：每用户每小时 5 次
export const deepSearchLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
    })
  : null

// URL 导入限流：每用户每天 5 次
export const urlImportLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 d'),
    })
  : null

// 认证端点限流：每个 IP 每分钟最多 3 次（注册、忘记密码、发验证码）
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'),
    })
  : null
