import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function makeRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

const redis = makeRedis()

function makeLimiter(tokens: number, window: Duration): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window) })
}

// 5 submissões por IP a cada 10 minutos
export const submitLimiter = makeLimiter(5, '10 m')

// 120 polls por IP por minuto (poll a cada 5s = 12/min, margem para abas duplicadas)
export const statusLimiter = makeLimiter(120, '1 m')

// 10 ajustes por IP a cada 10 minutos
export const adjustLimiter = makeLimiter(10, '10 m')

export function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}
