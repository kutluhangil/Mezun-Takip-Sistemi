import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, rawPool } from '@/lib/db'
import { getActiveSurvey, getGraduatesWithStatus } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function normalizeTerm(raw: string): 'guz' | 'bahar' | 'yaz' | null {
  const s = normalizeHeader(raw)
  if (!s) return null
  if (s.includes('guz') || s.includes('fall') || s.includes('autumn')) return 'guz'
  if (s.includes('bahar') || s.includes('spring')) return 'bahar'
  if (s.includes('yaz') || s.includes('summer')) return 'yaz'
  return null
}

function parseCsvLines(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ','
  return lines.map((line) => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur.trim())
    return out
  })
}

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const survey = await getActiveSurvey()
  const graduates = await getGraduatesWithStatus(survey.id, survey.active_period)
  return NextResponse.json({ graduates })
}

// Tekil mezun ekle veya mevcut mezunun e-postasını / profilini güncelle (Owner yetkisi gerekir)
export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (admin.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için Program Başkanı (Owner) yetkisi gerekir.' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as {
      id?: string
      email?: string
      full_name?: string
      student_number?: string
      graduation_year?: number | string | null
      graduation_term?: string | null
    }

    const email = String(body.email ?? '').trim().toLowerCase()
    const fullName = String(body.full_name ?? '').trim()
    const studentNumber = String(body.student_number ?? '').trim()
    const gradYear = body.graduation_year ? Number(body.graduation_year) : null
    const gradTerm = body.graduation_term ? normalizeTerm(String(body.graduation_term)) : null

    if (!email.includes('@') || !fullName) {
      return NextResponse.json({ error: 'Geçerli e-posta ve ad-soyad giriniz.' }, { status: 400 })
    }

    if (body.id) {
      await query(
        `UPDATE graduates
         SET email = $2,
             full_name = $3,
             student_number = $4,
             graduation_year = $5,
             graduation_term = $6,
             updated_at = NOW()
         WHERE id = $1`,
        [body.id, email, fullName, studentNumber, gradYear, gradTerm]
      )
      return NextResponse.json({ ok: true, mode: 'updated' })
    }

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
    return NextResponse.json({ ok: true, mode: 'upserted' })
  } catch (err) {
    console.error('[admin/graduates POST]', err)
    return NextResponse.json({ error: 'Mezun kaydı güncellenemedi (aynı e-posta zaten kayıtlı olabilir).' }, { status: 400 })
  }
}

// Excel (.xlsx) veya CSV toplu mezun listesi içe aktarma (Owner)
export async function PUT(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (admin.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için Program Başkanı (Owner) yetkisi gerekir.' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excel (.xlsx) veya CSV dosyası seçiniz.' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    let rows: string[][] = []

    if (file.name.toLowerCase().endsWith('.csv')) {
      rows = parseCsvLines(buf.toString('utf8'))
    } else {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0])
      const ws = wb.worksheets[0]
      if (ws) {
        ws.eachRow((row) => {
          const vals = row.values as unknown[]
          rows.push(vals.slice(1).map((v) => (v === null || v === undefined ? '' : String(v).trim())))
        })
      }
    }

    if (rows.length < 2) {
      return NextResponse.json({ error: 'Dosyada başlık ve en az 1 veri satırı bulunmalıdır.' }, { status: 400 })
    }

    const headers = rows[0].map(normalizeHeader)
    const findCol = (candidates: string[]) => headers.findIndex((h) => candidates.some((c) => h.includes(c)))

    const emailIdx = findCol(['eposta', 'e_posta', 'email', 'mail'])
    const nameIdx = findCol(['ad_soyad', 'adsoyad', 'full_name', 'isim', 'adi_soyadi', 'name'])
    const studentIdx = findCol(['ogrenci', 'student'])
    const yearIdx = findCol(['yil', 'year'])
    const termIdx = findCol(['donem', 'term'])

    if (emailIdx === -1 || nameIdx === -1) {
      return NextResponse.json(
        { error: 'Dosyada ad_soyad ve eposta sütunları bulunamadı.' },
        { status: 400 }
      )
    }

    let imported = 0
    let skipped = 0
    const pool = await rawPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      for (const r of rows.slice(1)) {
        const email = (r[emailIdx] ?? '').trim().toLowerCase()
        const fullName = (r[nameIdx] ?? '').trim()
        if (!email.includes('@') || !fullName) {
          skipped++
          continue
        }
        const studentNo = studentIdx >= 0 ? (r[studentIdx] ?? '').trim() : ''
        const yrRaw = yearIdx >= 0 ? Number((r[yearIdx] ?? '').trim()) : NaN
        const gradYear = Number.isInteger(yrRaw) && yrRaw >= 2018 && yrRaw <= 2035 ? yrRaw : null
        const gradTerm = termIdx >= 0 ? normalizeTerm(r[termIdx] ?? '') : null

        await client.query(
          `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             student_number = COALESCE(NULLIF(EXCLUDED.student_number, ''), graduates.student_number),
             graduation_year = COALESCE(EXCLUDED.graduation_year, graduates.graduation_year),
             graduation_term = COALESCE(EXCLUDED.graduation_term, graduates.graduation_term),
             updated_at = NOW()`,
          [email, fullName, studentNo, gradYear, gradTerm]
        )
        imported++
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({ ok: true, imported, skipped })
  } catch (err) {
    console.error('[admin/graduates PUT]', err)
    return NextResponse.json({ error: 'Dosya içe aktarılamadı.' }, { status: 500 })
  }
}
