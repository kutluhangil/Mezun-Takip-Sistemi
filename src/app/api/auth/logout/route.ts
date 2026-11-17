import { NextResponse } from 'next/server'
import { clearGraduateCookie, getGraduateSession, revokeSessions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const graduate = await getGraduateSession()
  if (graduate) await revokeSessions('graduate', graduate.id)
  await clearGraduateCookie()
  return NextResponse.json({ ok: true })
}
