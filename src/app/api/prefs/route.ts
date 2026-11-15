import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { LANG_COOKIE } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lang?: string }
    const lang = body.lang === 'en' ? 'en' : 'tr'
    const jar = await cookies()
    jar.set(LANG_COOKIE, lang, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return NextResponse.json({ ok: true, lang })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
