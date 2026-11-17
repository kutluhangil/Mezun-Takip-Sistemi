import ExcelJS from 'exceljs'

export type GradTerm = 'guz' | 'bahar' | 'yaz'

export interface ImportRow {
  email: string
  full_name: string
  student_number: string
  graduation_year: number | null
  graduation_term: GradTerm | null
}

export interface ParsedImport {
  rows: ImportRow[]
  skipped: { line: number; reason: 'email' | 'name' | 'duplicate' }[]
}

export const IMPORT_COLUMNS = ['ogrenci_no', 'ad_soyad', 'eposta', 'mezuniyet_yili', 'mezuniyet_donemi'] as const
export const MAX_IMPORT_ROWS = 5000
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

export function normalizeHeader(raw: string): string {
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

export function normalizeTerm(raw: string): GradTerm | null {
  const s = normalizeHeader(raw)
  if (!s) return null
  if (s.includes('guz') || s.includes('fall') || s.includes('autumn')) return 'guz'
  if (s.includes('bahar') || s.includes('spring')) return 'bahar'
  if (s.includes('yaz') || s.includes('summer')) return 'yaz'
  return null
}

export function parseCsv(text: string): string[][] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
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
        } else inQuotes = !inQuotes
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    out.push(cur.trim())
    return out
  })
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] }
    if (o.richText) return o.richText.map((r) => r.text).join('').trim()
    if (typeof o.text === 'string') return o.text.trim()
    if (o.result !== undefined) return String(o.result).trim()
  }
  return String(v).trim()
}

export async function readSheet(fileName: string, buf: Buffer): Promise<string[][]> {
  if (fileName.toLowerCase().endsWith('.csv')) return parseCsv(buf.toString('utf8'))
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0])
  const ws = wb.worksheets[0]
  const rows: string[][] = []
  ws?.eachRow((row) => {
    rows.push((row.values as unknown[]).slice(1).map(cellText))
  })
  return rows
}

export class ImportError extends Error {}

/** Başlık satırından sütunları bulur, satırları doğrular; veritabanına dokunmaz. */
export function mapRows(table: string[][]): ParsedImport {
  if (table.length < 2) throw new ImportError('Dosyada başlık ve en az 1 veri satırı bulunmalıdır.')
  if (table.length - 1 > MAX_IMPORT_ROWS) throw new ImportError(`En fazla ${MAX_IMPORT_ROWS} satır içe aktarılabilir.`)

  const headers = table[0].map(normalizeHeader)
  const col = (c: string[]) => headers.findIndex((h) => c.some((x) => h.includes(x)))
  const emailIdx = col(['eposta', 'e_posta', 'email', 'mail'])
  const nameIdx = col(['ad_soyad', 'adsoyad', 'full_name', 'isim', 'adi_soyadi', 'name'])
  const studentIdx = col(['ogrenci', 'student'])
  const yearIdx = col(['yil', 'year'])
  const termIdx = col(['donem', 'term'])
  if (emailIdx === -1 || nameIdx === -1) throw new ImportError('Dosyada ad_soyad ve eposta sütunları bulunamadı.')

  const seen = new Set<string>()
  const parsed: ParsedImport = { rows: [], skipped: [] }
  const maxYear = new Date().getFullYear() + 1
  table.slice(1).forEach((r, i) => {
    const line = i + 2
    const email = (r[emailIdx] ?? '').trim().toLowerCase()
    const full_name = (r[nameIdx] ?? '').trim().slice(0, 120)
    if (!EMAIL_RE.test(email)) return parsed.skipped.push({ line, reason: 'email' })
    if (!full_name) return parsed.skipped.push({ line, reason: 'name' })
    if (seen.has(email)) return parsed.skipped.push({ line, reason: 'duplicate' })
    seen.add(email)
    const yr = yearIdx >= 0 ? Number((r[yearIdx] ?? '').trim()) : NaN
    parsed.rows.push({
      email,
      full_name,
      student_number: studentIdx >= 0 ? (r[studentIdx] ?? '').trim().slice(0, 32) : '',
      graduation_year: Number.isInteger(yr) && yr >= 2000 && yr <= maxYear ? yr : null,
      graduation_term: termIdx >= 0 ? normalizeTerm(r[termIdx] ?? '') : null,
    })
  })
  return parsed
}

export async function templateWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Mezunlar')
  ws.columns = IMPORT_COLUMNS.map((key) => ({ header: key, key, width: key === 'eposta' ? 32 : 20 }))
  ws.getRow(1).font = { bold: true }
  ws.addRow({ ogrenci_no: '220401001', ad_soyad: 'Ayşe Yılmaz', eposta: 'ayse.yilmaz@gmail.com', mezuniyet_yili: 2024, mezuniyet_donemi: 'Bahar' })
  ws.addRow({ ogrenci_no: '210401014', ad_soyad: 'Mehmet Demir', eposta: 'mehmet.demir@gmail.com', mezuniyet_yili: 2023, mezuniyet_donemi: 'Güz' })
  const help = wb.addWorksheet('Açıklama')
  help.addRows([
    ['Sütun', 'Zorunlu', 'Açıklama'],
    ['ogrenci_no', 'Hayır', 'Okul numarası'],
    ['ad_soyad', 'Evet', 'Ad ve soyad'],
    ['eposta', 'Evet', 'Mezunun kişisel e-postası (giriş kodu buraya gider)'],
    ['mezuniyet_yili', 'Hayır', 'Örn. 2024'],
    ['mezuniyet_donemi', 'Hayır', 'Güz, Bahar veya Yaz'],
  ])
  help.getRow(1).font = { bold: true }
  help.columns = [{ width: 20 }, { width: 10 }, { width: 60 }]
  return Buffer.from(await wb.xlsx.writeBuffer())
}
