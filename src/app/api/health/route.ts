import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await query('SELECT 1')
    return NextResponse.json({ ok: true, db: 'connected', ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: 'error', error: (err as Error).message },
      { status: 500 }
    )
  }
}
