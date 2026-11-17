import { NextResponse } from 'next/server'

/**
 * İstemci IP'si. Vercel x-forwarded-for'u kendisi yazar (sahtelenemez); Cloudflare Tunnel arkasında
 * cf-connecting-ip güvenilir kaynaktır. Diğer başlıklar yalnızca son çare.
 */
export function clientIp(req: Request): string {
  const h = req.headers
  const raw =
    (process.env.VERCEL ? h.get('x-forwarded-for')?.split(',')[0] : null) ||
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0] ||
    'local'
  return raw.trim().slice(0, 64)
}

/** KVKK: IPv4 son okteti, IPv6 son 4 grubu sıfırlanır. */
export function maskIp(ip: string): string {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.replace(/\.\d+$/, '.0')
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::'
  return ip.slice(0, 16)
}

export class BodyError extends Error {
  constructor(public status: 400 | 413, message: string) {
    super(message)
  }
}

/** Boyut sınırlı JSON gövdesi. Bozuk JSON 400, büyük gövde 413. */
export async function readJson<T>(req: Request, maxBytes = 32 * 1024): Promise<T> {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new BodyError(413, 'payload_too_large')
  const text = await req.text()
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new BodyError(413, 'payload_too_large')
  try {
    const parsed = JSON.parse(text || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not_object')
    return parsed as T
  } catch {
    throw new BodyError(400, 'invalid_json')
  }
}

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status })
}

/** Rota içindeki beklenmeyen hatayı tek biçimde loglayıp güvenli yanıta çevirir. */
export function handleRouteError(tag: string, err: unknown, fallback: string) {
  if (err instanceof BodyError) return jsonError(err.status, err.message)
  console.error(`[${tag}]`, err)
  return jsonError(500, fallback)
}
