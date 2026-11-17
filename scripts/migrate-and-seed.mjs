import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { ensureSeed, runMigrations, sslConfig } from '../db/core.mjs'

// Kullanım: npm run db:migrate            → bekleyen migration'lar + anket + ilk yönetici
//           npm run db:migrate -- --demo  → ek olarak örnek mezun ve yanıtlar (yalnız yerel/deneme)
async function main() {
  const isDemo = process.argv.includes('--demo')
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL tanımlı değil.')
  if (isDemo && process.env.NODE_ENV === 'production') throw new Error('--demo üretimde çalıştırılamaz.')

  const pool = new pg.Pool({ connectionString, ssl: sslConfig(connectionString) })
  const log = (m) => console.log(m)

  try {
    const applied = await runMigrations(pool, { log })
    if (applied.length === 0) log('[db:migrate] Bekleyen migration yok.')

    const survey = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'surveys', 'mezun-bilgi-2026.json'), 'utf8'))
    await ensureSeed(pool, survey, { log })

    const surveyRow = await pool.query(`SELECT id, active_period FROM surveys WHERE slug = $1`, [survey.slug])
    const surveyId = surveyRow.rows[0].id
    const activePeriod = surveyRow.rows[0].active_period

    if (isDemo) {
      const demoGraduates = [
        { email: 'ayse.demir@example.com', full_name: 'Ayşe Demir', student_number: '210401001', year: 2023, term: 'bahar' },
        { email: 'mehmet.kaya@example.com', full_name: 'Mehmet Kaya', student_number: '220401014', year: 2024, term: 'bahar' },
        { email: 'zeynep.yilmaz@example.com', full_name: 'Zeynep Yılmaz', student_number: '220401029', year: 2024, term: 'guz' },
        { email: 'emre.sahin@example.com', full_name: 'Emre Şahin', student_number: '230401042', year: 2025, term: 'bahar' },
        { email: 'elif.ozturk@example.com', full_name: 'Elif Öztürk', student_number: '230401055', year: 2025, term: 'bahar' },
      ]

      const gradIds = []
      for (const g of demoGraduates) {
        const gRes = await pool.query(
          `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [g.email, g.full_name, g.student_number, g.year, g.term]
        )
        gradIds.push({ id: gRes.rows[0].id, ...g })
      }

      const existingResp = await pool.query(
        `SELECT COUNT(*)::int AS c FROM responses WHERE survey_id = $1 AND status = 'submitted'`,
        [surveyId]
      )
      if (existingResp.rows[0].c === 0) {
        const samples = [
          {
            g: gradIds[0],
            answers: {
              q_student_number: gradIds[0].student_number,
              q_grad_year: 2023,
              q_grad_term: { choice: 'bahar' },
              q_work_status: { choice: 'kamu_sozlesmeli' },
              q_job_title: { choice: 'paramedik_112' },
              q_institution: { choice: '112_istasyonu' },
              q_prev_workplaces: { none: false, text: 'Özel Medikal Ambulans A.Ş.' },
              q_unemployment_duration: { choice: '6_12m' },
              q_how_found_first_job: { choice: 'kpss' },
              q_workplace_order: { choice: '2' },
              q_work_province: 'İstanbul',
              q_total_experience: { notWorking: false, years: 2, months: 4 },
              q_current_tenure: { notWorking: false, years: 1, months: 6 },
              q_monthly_income: { choice: 'mw_1_5_2' },
              q_continue_paramedic: { choice: 'evet' },
              q_abroad_interest: { choice: 'want_abroad' },
              q_career_develop: { choices: ['uygulamaci', 'yabanci_dil'] },
              q_certificates: { none: false, text: 'İleri Yaşam Desteği, Travma Resüsitasyon' },
              q_scientific_research: { choice: 'hayir' },
              q_dgs_status: { choice: 'planliyorum' },
              q_keep_ties: { choice: 'evet' },
              q_recommend_uni: { choice: 'kesinlikle_evet' },
              q_alumni_reunion: { choice: 'evet' },
              q_satisfaction: 9,
              q_strengths: { choices: ['s2', 's5', 's6'] },
              q_weaknesses: { choices: ['w7', 'w9'] },
              q_program_matrix: { m1: '5', m2: '5', m3: '4', m4: '4', m5: '5', m6: '4', m7: '4', m8: '5', m9: '4', m10: '4', m11: '3', m12: '5', m13: '5' },
              q_suggestions: 'Uygulamalı vaka simülasyonlarının artırılması sahaya çıkarken çok faydalı oldu.',
            },
          },
          {
            g: gradIds[1],
            answers: {
              q_student_number: gradIds[1].student_number,
              q_grad_year: 2024,
              q_grad_term: { choice: 'bahar' },
              q_work_status: { choice: 'ozel_sektor' },
              q_job_title: { choice: 'acil_servis' },
              q_institution: { choice: 'ozel_hastane' },
              q_prev_workplaces: { none: true },
              q_unemployment_duration: { choice: 'lt_6m' },
              q_how_found_first_job: { choice: 'staj' },
              q_workplace_order: { choice: '1' },
              q_work_province: 'İstanbul',
              q_total_experience: { notWorking: false, years: 1, months: 3 },
              q_current_tenure: { notWorking: false, years: 1, months: 3 },
              q_monthly_income: { choice: 'mw_1_1_5' },
              q_continue_paramedic: { choice: 'evet' },
              q_abroad_interest: { choice: 'no' },
              q_career_develop: { choices: ['kuramsal', 'iletisim', '__other__'], otherText: 'Triyaj eğitimi' },
              q_certificates: { none: false, text: 'Temel Yaşam Desteği' },
              q_scientific_research: { choice: 'evet' },
              q_dgs_status: { choice: 'devam' },
              q_keep_ties: { choice: 'evet' },
              q_recommend_uni: { choice: 'evet' },
              q_alumni_reunion: { choice: 'evet' },
              q_satisfaction: 8,
              q_strengths: { choices: ['s1', 's3', 's5'] },
              q_weaknesses: { choices: ['w1', 'w4'] },
              q_program_matrix: { m1: '4', m2: '4', m3: '4', m4: '4', m5: '4', m6: '3', m7: '4', m8: '4', m9: '4', m10: '4', m11: '4', m12: '4', m13: '4' },
              q_suggestions: 'Hastane stajlarında vaka çeşitliliği daha da artırılabilir.',
            },
          },
          {
            g: gradIds[2],
            answers: {
              q_student_number: gradIds[2].student_number,
              q_grad_year: 2024,
              q_grad_term: { choice: 'guz' },
              q_work_status: { choice: 'kpss_hazirlik' },
              q_job_title: { choice: 'calismiyorum' },
              q_institution: { choice: 'calismiyorum' },
              q_prev_workplaces: { none: true },
              q_unemployment_duration: { choice: '12_18m' },
              q_how_found_first_job: { choice: 'henuz_yok' },
              q_workplace_order: { choice: 'calismiyorum' },
              q_work_province: 'not_working',
              q_total_experience: { notWorking: true },
              q_current_tenure: { notWorking: true },
              q_monthly_income: { choice: 'none' },
              q_continue_paramedic: { choice: 'evet' },
              q_abroad_interest: { choice: 'want_abroad' },
              q_career_develop: { choices: ['yabanci_dil', 'uygulamaci'] },
              q_certificates: { none: true },
              q_scientific_research: { choice: 'hayir' },
              q_dgs_status: { choice: 'hayir' },
              q_keep_ties: { choice: 'evet' },
              q_recommend_uni: { choice: 'kararsizim' },
              q_alumni_reunion: { choice: 'evet' },
              q_satisfaction: 7,
              q_strengths: { choices: ['s2', 's9'] },
              q_weaknesses: { choices: ['w3', 'w7', 'w10'] },
              q_program_matrix: { m1: '4', m2: '3', m3: '4', m4: '3', m5: '4', m6: '4', m7: '4', m8: '4', m9: '3', m10: '3', m11: '3', m12: '4', m13: '4' },
              q_suggestions: 'KPSS ve atama süreçleriyle ilgili mezun seminerleri düzenlenebilir.',
            },
          },
        ]

        for (const s of samples) {
          const ins = await pool.query(
            `INSERT INTO responses (survey_id, graduate_id, period_key, submission_number, status, submitted_at)
             VALUES ($1, $2, $3, 1, 'submitted', NOW())
             RETURNING id`,
            [surveyId, s.g.id, activePeriod]
          )
          const rid = ins.rows[0].id
          for (const [qid, val] of Object.entries(s.answers)) {
            await pool.query(
              `INSERT INTO answers (response_id, question_id, value) VALUES ($1, $2, $3::jsonb)`,
              [rid, qid, JSON.stringify(val)]
            )
          }
        }
        console.log('[db:migrate] Demo mezunlar ve örnek 3 yanıt eklendi (--demo).')
      }
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[db:migrate] Hata:', err)
  process.exit(1)
})
