import { NextResponse } from 'next/server'
import { clearGraduateCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearGraduateCookie()
  return NextResponse.json({ ok: true })
}
