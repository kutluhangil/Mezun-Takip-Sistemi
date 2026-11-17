import { NextResponse } from 'next/server'
import { getGraduateSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, maskIp, readJson } from '@/lib/http'
import { getAppSettings } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

/** KVKK metni güncellendiğinde mezundan güncel sürüme yeniden onay alınır. */
export async function POST(req: Request) {
  const graduate = await getGraduateSession()
  if (!graduate) return jsonError(401, 'unauthorized')
  try {
    const body = await readJson<{ accepted?: unknown }>(req, 512)
    if (body.accepted !== true) return jsonError(400, 'consent_required')
    const { kvkkNotice } = await getAppSettings()
    await query(`INSERT INTO consents (graduate_id, text_version, ip_hint) VALUES ($1, $2, $3)`, [
      graduate.id,
      kvkkNotice.version,
      maskIp(clientIp(req)),
    ])
    return NextResponse.json({ ok: true, version: kvkkNotice.version })
  } catch (err) {
    return handleRouteError('survey/consent', err, 'Onay kaydedilemedi.')
  }
}
