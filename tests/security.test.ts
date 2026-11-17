import { describe, expect, it } from 'vitest'
import surveyJson from '../data/surveys/mezun-bilgi-2026.json'
import { sslConfig, surveyHash } from '../db/core.mjs'
import { csvEscape } from '../src/lib/exports/csv'
import { mapRows, normalizeTerm, parseCsv } from '../src/lib/graduates/import'
import { BodyError, maskIp, readJson } from '../src/lib/http'
import { eligibilityFor, sanitizeAnswers } from '../src/lib/survey-validation'
import type { SurveyDefinition } from '../src/lib/survey-types'

const def = surveyJson as unknown as SurveyDefinition

describe('csvEscape', () => {
  it('formül başlangıçlarını düz metne çevirir', () => {
    expect(csvEscape('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvEscape('+90 555')).toBe("'+90 555")
    expect(csvEscape('-1')).toBe("'-1")
    expect(csvEscape('@SUM(1)')).toBe("'@SUM(1)")
  })
  it('sayıları ve normal metni değiştirmez', () => {
    expect(csvEscape(-5)).toBe('-5')
    expect(csvEscape('İstanbul')).toBe('İstanbul')
    expect(csvEscape('a, b')).toBe('"a, b"')
  })
})

describe('sanitizeAnswers', () => {
  it('tanımsız soruları, kilitli profil alanlarını ve geçersiz seçenekleri atar', () => {
    const out = sanitizeAnswers(def, {
      q_hack: 'x',
      q_full_name: 'Sahte',
      q_email: 'x@y.z',
      q_work_status: { choice: 'olmayan_secenek' },
      q_satisfaction: 42,
      q_work_province: 'Atlantis',
    })
    expect(out).toEqual({})
  })
  it('geçerli cevapları korur, metni kırpar, seçim sınırını uygular', () => {
    const strengths = def.questions.find((q) => q.id === 'q_strengths')!
    const all = (strengths.options ?? []).map((o) => o.value)
    const out = sanitizeAnswers(def, {
      q_work_status: { choice: 'ozel_sektor', otherText: 'yok sayılır' },
      q_satisfaction: 7,
      q_work_province: 'İzmir',
      q_suggestions: 'a'.repeat(5000),
      q_strengths: { choices: [...all, all[0]] },
      q_total_experience: { notWorking: false, years: 2, months: 13 },
    })
    expect(out.q_work_status).toEqual({ choice: 'ozel_sektor' })
    expect(out.q_satisfaction).toBe(7)
    expect(out.q_work_province).toBe('İzmir')
    expect((out.q_suggestions as string).length).toBe(2000)
    expect((out.q_strengths as { choices: string[] }).choices.length).toBe(strengths.maxSelect ?? all.length)
    expect(out.q_total_experience).toBeUndefined()
  })
  it('nesne olmayan girdide boş döner', () => {
    expect(sanitizeAnswers(def, null)).toEqual({})
    expect(sanitizeAnswers(def, ['x'])).toEqual({})
  })
})

describe('eligibilityFor', () => {
  const base = { is_open: true, repeat_mode: 'period' as const, active_period: '2026-Guz', cooldown_days: 180 }
  it('aynı dönemde ikinci gönderimi engeller', () => {
    expect(eligibilityFor(base, { submitted_at: new Date().toISOString(), period_key: '2026-Guz' }).allowed).toBe(false)
    expect(eligibilityFor(base, { submitted_at: new Date().toISOString(), period_key: '2026-Bahar' }).allowed).toBe(true)
  })
  it('kapalı ankete izin vermez', () => {
    expect(eligibilityFor({ ...base, is_open: false }, undefined).reason).toBe('survey_closed')
  })
})

describe('maskIp', () => {
  it('IPv4 ve IPv6 adreslerini maskeler', () => {
    expect(maskIp('85.105.12.201')).toBe('85.105.12.0')
    expect(maskIp('2a02:e0:1:2:3:4:5:6')).toBe('2a02:e0:1:2::')
  })
})

describe('readJson', () => {
  const req = (body: string) => new Request('http://x', { method: 'POST', body })
  it('boyut sınırını aşan gövdeyi 413 ile reddeder', async () => {
    await expect(readJson(req('{"a":"' + 'x'.repeat(100) + '"}'), 50)).rejects.toMatchObject({ status: 413 })
  })
  it('bozuk JSON ve dizi gövdesini 400 ile reddeder', async () => {
    await expect(readJson(req('{bozuk'))).rejects.toBeInstanceOf(BodyError)
    await expect(readJson(req('[1,2]'))).rejects.toMatchObject({ status: 400 })
  })
})

describe('mezun listesi içe aktarma', () => {
  it('başlıkları tanır, geçersiz ve tekrar eden satırları atlar', () => {
    const table = parseCsv('Öğrenci No;Ad Soyad;E-posta;Mezuniyet Yılı;Dönem\n1;Ali Veli;ALI@x.com;2024;Bahar\n2;Ayşe;bozuk;2024;Güz\n3;Tekrar;ali@x.com;2023;Yaz\n4;;y@x.com;2024;Güz')
    const parsed = mapRows(table)
    expect(parsed.rows).toEqual([
      { email: 'ali@x.com', full_name: 'Ali Veli', student_number: '1', graduation_year: 2024, graduation_term: 'bahar' },
    ])
    expect(parsed.skipped.map((s) => s.reason)).toEqual(['email', 'duplicate', 'name'])
  })
  it('dönem adlarını normalleştirir', () => {
    expect(normalizeTerm('GÜZ')).toBe('guz')
    expect(normalizeTerm('Spring')).toBe('bahar')
    expect(normalizeTerm('?')).toBeNull()
  })
})

describe('db çekirdeği', () => {
  it('uzak veritabanında sertifikayı doğrular, yerelde SSL açmaz', () => {
    expect(sslConfig('postgresql://u:p@ep-x.neon.tech/db?sslmode=require')).toEqual({ rejectUnauthorized: true })
    expect(sslConfig('postgresql://u:p@localhost:5432/db')).toBeUndefined()
  })
  it('anket hash değeri içerik değişince değişir', () => {
    expect(surveyHash({ a: 1 })).not.toBe(surveyHash({ a: 2 }))
  })
})
