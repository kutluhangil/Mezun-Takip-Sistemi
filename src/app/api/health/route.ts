import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await query('SELECT 1')
    return NextResponse.json({ ok: true, db: 'connected', ts: new Date().toISOString() })
  } catch (err) {
    console.error('[health]', err)
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 })
  }
}
