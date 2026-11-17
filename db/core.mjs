// Uygulama (src/lib/db.ts) ve script'lerin (scripts/*.mjs) ortak veritabanı çekirdeği.
// Tek kaynak: SSL kararı, şifre hash'i, sürümlü migration'lar, anket ve ilk yönetici tohumu.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres', '::1'])

export function sslConfig(connectionString) {
  if (process.env.DATABASE_SSL === 'false') return undefined
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: true }
  try {
    const parsed = new URL(connectionString)
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
      return parsed.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: true } : undefined
    }
  } catch {
    // Ayrıştırılamayan adres: güvenli tarafta kal
  }
  return { rejectUnauthorized: true }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function migrationsDir() {
  return path.join(process.cwd(), 'db', 'migrations')
}

// turbopackIgnore: yol çalışma anında hesaplanır; Next izleyicisi tüm projeyi pakete katmasın.
// Migration dosyaları next.config.ts > outputFileTracingIncludes ile açıkça eklenir.
export function listMigrations(dir = migrationsDir()) {
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) return []
  return fs
    .readdirSync(/*turbopackIgnore: true*/ dir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort()
}

async function appliedVersions(client) {
  try {
    const res = await client.query('SELECT version FROM schema_migrations')
    return new Set(res.rows.map((r) => r.version))
  } catch (err) {
    if (err && err.code === '42P01') return new Set()
    throw err
  }
}

/** Uygulanmamış migration'ları sırayla, her biri kendi transaction'ında uygular. Uygulananların adını döner. */
export async function runMigrations(pool, { log = () => {} } = {}) {
  const files = listMigrations()
  const client = await pool.connect()
  const applied = []
  try {
    const done = await appliedVersions(client)
    const pending = files.filter((f) => !done.has(f))
    if (pending.length === 0) return applied

    // Transaction kilidi: aynı anda açılan iki sunucu örneği aynı migration'ı iki kez çalıştırmaz.
    // Oturum kilidi yerine xact kilidi, çünkü Neon havuzu (pgbouncer) transaction kipinde çalışır.
    for (const file of pending) {
      const sql = fs.readFileSync(/*turbopackIgnore: true*/ path.join(migrationsDir(), file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query('SELECT pg_advisory_xact_lock(727274)')
        await client.query(
          `CREATE TABLE IF NOT EXISTS schema_migrations (
             version TEXT PRIMARY KEY,
             applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
           )`
        )
        const already = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file])
        if (already.rowCount === 0) {
          await client.query(sql)
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
          applied.push(file)
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${file} uygulanamadı: ${err.message}`)
      }
      if (applied.includes(file)) log(`[db] ${file} uygulandı`)
    }
    return applied
  } finally {
    client.release()
  }
}

export function surveyHash(surveyJson) {
  return crypto.createHash('sha256').update(JSON.stringify(surveyJson)).digest('hex')
}

/**
 * Anket tanımını ve ilk yöneticiyi gerekiyorsa yazar. Kararlı durumda tek sorgu atar.
 * Anket dosyası değişince (içerik hash'i) tanım güncellenir; sürüm numarası unutulsa bile.
 */
export async function ensureSeed(pool, surveyJson, { isProd = false, env = process.env, log = () => {} } = {}) {
  const hash = surveyHash(surveyJson)
  const state = await pool.query(
    `SELECT
       (SELECT value->>'hash' FROM app_settings WHERE key = 'survey_hash') AS survey_hash,
       (SELECT COUNT(*)::int FROM surveys WHERE slug = $1) AS survey_count,
       (SELECT COUNT(*)::int FROM admins) AS admin_count`,
    [surveyJson.slug]
  )
  const row = state.rows[0]

  if (row.survey_hash !== hash || row.survey_count === 0) {
    await pool.query(
      `INSERT INTO surveys (slug, title_tr, title_en, definition)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (slug) DO UPDATE SET
         title_tr = EXCLUDED.title_tr,
         title_en = EXCLUDED.title_en,
         definition = EXCLUDED.definition,
         updated_at = NOW()`,
      [surveyJson.slug, surveyJson.title.tr, surveyJson.title.en, JSON.stringify(surveyJson)]
    )
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('survey_hash', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify({ hash })]
    )
    log('[db] Anket tanımı güncellendi')
  }

  if (row.admin_count === 0) {
    const email = env.ADMIN_OWNER_EMAIL?.trim().toLowerCase()
    const password = env.ADMIN_OWNER_PASSWORD
    if (!email || !password) {
      if (isProd) {
        console.error('[db] ADMIN_OWNER_EMAIL / ADMIN_OWNER_PASSWORD tanımlı değil; yönetici oluşturulmadı.')
        return
      }
    }
    const finalEmail = email || 'dev@localhost.test'
    const finalPassword = password || crypto.randomBytes(12).toString('base64url')
    await pool.query(
      `INSERT INTO admins (email, full_name, role, password_hash)
       VALUES ($1, $2, 'owner', $3)
       ON CONFLICT (email) DO NOTHING`,
      [finalEmail, (env.ADMIN_OWNER_NAME || 'Program Başkanı').trim(), hashPassword(finalPassword)]
    )
    if (!password) log(`[db] Geliştirme yöneticisi: ${finalEmail} / ${finalPassword}`)
    else log(`[db] İlk yönetici eklendi: ${finalEmail}`)
  }
}
