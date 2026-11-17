import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { getAdminSession } from '@/lib/auth'
import { isUniqueViolation, query, withTransaction } from '@/lib/db'
import {
  ImportError,
  mapRows,
  MAX_IMPORT_BYTES,
  normalizeTerm,
  readSheet,
} from '@/lib/graduates/import'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'
import { getActiveSurvey, getGraduatesWithStatus } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OWNER_ONLY = 'Bu işlem için Program Başkanı (Owner) yetkisi gerekir.'

export async function GET() {
  if (!(await getAdminSession())) return jsonError(401, 'unauthorized')
  const survey = await getActiveSurvey()
  return NextResponse.json({ graduates: await getGraduatesWithStatus(survey.id, survey.active_period) })
}

/** Tekil mezun ekle veya düzenle (owner). */
export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')
  if (admin.role !== 'owner') return jsonError(403, OWNER_ONLY)

  try {
    const body = await readJson<{
      id?: unknown
      email?: unknown
      full_name?: unknown
      student_number?: unknown
      graduation_year?: unknown
      graduation_term?: unknown
    }>(req, 4 * 1024)

    const email = String(body.email ?? '').trim().toLowerCase()
    const fullName = String(body.full_name ?? '').trim().slice(0, 120)
    const studentNumber = String(body.student_number ?? '').trim().slice(0, 32)
    const yr = body.graduation_year ? Number(body.graduation_year) : null
    const gradYear = yr && Number.isInteger(yr) && yr >= 2000 && yr <= new Date().getFullYear() + 1 ? yr : null
    const gradTerm = body.graduation_term ? normalizeTerm(String(body.graduation_term)) : null
    const id = body.id ? String(body.id) : null

    if (!EMAIL_RE.test(email) || !fullName) return jsonError(400, 'Geçerli e-posta ve ad-soyad giriniz.')
    if (id && !UUID_RE.test(id)) return jsonError(400, 'Geçersiz kayıt.')

    if (id) {
      const res = await query(
        `UPDATE graduates
         SET email = $2, full_name = $3, student_number = $4, graduation_year = $5, graduation_term = $6,
             session_version = CASE WHEN email <> $2 THEN session_version + 1 ELSE session_version END,
             updated_at = NOW()
         WHERE id = $1 AND anonymized_at IS NULL`,
        [id, email, fullName, studentNumber, gradYear, gradTerm]
      )
      if (res.rowCount === 0) return jsonError(404, 'Mezun bulunamadı.')
    } else {
      await query(
        `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           student_number = COALESCE(NULLIF(EXCLUDED.student_number, ''), graduates.student_number),
           graduation_year = COALESCE(EXCLUDED.graduation_year, graduates.graduation_year),
           graduation_term = COALESCE(EXCLUDED.graduation_term, graduates.graduation_term),
           updated_at = NOW()`,
        [email, fullName, studentNumber, gradYear, gradTerm]
      )
    }
    await audit(admin.id, 'graduate.upsert', { target: id ?? email, ip: clientIp(req) })
    return NextResponse.json({ ok: true, mode: id ? 'updated' : 'upserted' })
  } catch (err) {
    if (isUniqueViolation(err)) return jsonError(409, 'Bu e-posta başka bir mezunda kayıtlı.')
    return handleRouteError('admin/graduates POST', err, 'Mezun kaydı güncellenemedi.')
  }
}

/**
 * Excel/CSV toplu içe aktarma (owner). `?preview=1` ile hiçbir şey yazmadan
 * kaç yeni, kaç güncel, kaç atlanacak satır olduğunu döner.
 */
export async function PUT(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')
  if (admin.role !== 'owner') return jsonError(403, OWNER_ONLY)

  try {
    const preview = new URL(req.url).searchParams.get('preview') === '1'
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return jsonError(400, 'Excel (.xlsx) veya CSV dosyası seçiniz.')
    if (file.size > MAX_IMPORT_BYTES) return jsonError(413, 'Dosya en fazla 5 MB olabilir.')
    if (!/\.(xlsx|csv)$/i.test(file.name)) return jsonError(400, 'Yalnızca .xlsx veya .csv yükleyebilirsiniz.')

    const parsed = mapRows(await readSheet(file.name, Buffer.from(await file.arrayBuffer())))
    const emails = parsed.rows.map((r) => r.email)
    const existing = await query<{ email: string }>(`SELECT email FROM graduates WHERE email = ANY($1::text[])`, [emails])
    const existingSet = new Set(existing.rows.map((r) => r.email))
    const summary = {
      total: parsed.rows.length + parsed.skipped.length,
      created: parsed.rows.filter((r) => !existingSet.has(r.email)).length,
      updated: parsed.rows.filter((r) => existingSet.has(r.email)).length,
      skipped: parsed.skipped.length,
      skippedLines: parsed.skipped.slice(0, 50),
    }
    if (preview) return NextResponse.json({ ok: true, preview: true, ...summary })

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
         SELECT email, full_name, student_number, graduation_year, graduation_term
         FROM jsonb_to_recordset($1::jsonb)
           AS r(email text, full_name text, student_number text, graduation_year int, graduation_term text)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           student_number = COALESCE(NULLIF(EXCLUDED.student_number, ''), graduates.student_number),
           graduation_year = COALESCE(EXCLUDED.graduation_year, graduates.graduation_year),
           graduation_term = COALESCE(EXCLUDED.graduation_term, graduates.graduation_term),
           updated_at = NOW()`,
        [JSON.stringify(parsed.rows)]
      )
    })

    await audit(admin.id, 'graduate.import', {
      ip: clientIp(req),
      detail: { file: file.name.slice(0, 120), created: summary.created, updated: summary.updated, skipped: summary.skipped },
    })
    return NextResponse.json({ ok: true, imported: parsed.rows.length, ...summary })
  } catch (err) {
    if (err instanceof ImportError) return jsonError(400, err.message)
    return handleRouteError('admin/graduates PUT', err, 'Dosya içe aktarılamadı.')
  }
}
