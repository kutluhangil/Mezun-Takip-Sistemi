import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import surveyJson from '../../data/surveys/mezun-bilgi-2026.json'

declare global {
  // eslint-disable-next-line no-var
  var __mtsPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __mtsInitPromise: Promise<void> | undefined
}

function shouldUseSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL === 'false') return false
  if (process.env.DATABASE_SSL === 'true') return true
  try {
    const parsed = new URL(connectionString)
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === 'postgres') {
      return parsed.searchParams.get('sslmode') === 'require'
    }
    return true
  } catch {
    return connectionString.includes('sslmode=require')
  }
}

function getPool(): Pool {
  if (!global.__mtsPool) {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://mezun:mezun_dev_pass@localhost:5432/mezun_takip'
    const useSsl = shouldUseSsl(connectionString)
    global.__mtsPool = new Pool({
      connectionString,
      max: process.env.VERCEL ? 5 : 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  }
  return global.__mtsPool
}

export function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

async function runBootstrap(): Promise<void> {
  const pool = getPool()
  const migrationPath = path.join(process.cwd(), 'db', 'migrations', '001_init.sql')
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    await pool.query(sql)
  }

  // Varsayılan anket yoksa veya tanımı güncel değilse ekle/güncelle
  await pool.query(
    `INSERT INTO surveys (slug, title_tr, title_en, definition)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (slug) DO UPDATE SET
       title_tr = EXCLUDED.title_tr,
       title_en = EXCLUDED.title_en,
       definition = EXCLUDED.definition,
       updated_at = NOW()`,
    [
      surveyJson.slug,
      surveyJson.title.tr,
      surveyJson.title.en,
      JSON.stringify(surveyJson),
    ]
  )

  // Hiç yönetici yoksa env değerleriyle ilk program başkanı (owner) hesabını aç
  const adminCount = await pool.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM admins')
  if (Number(adminCount.rows[0]?.c ?? 0) === 0) {
    const email = (process.env.ADMIN_OWNER_EMAIL || 'admin@fbu.edu.tr').trim().toLowerCase()
    const fullName = (process.env.ADMIN_OWNER_NAME || 'Program Başkanı').trim()
    const rawPassword = process.env.ADMIN_OWNER_PASSWORD || 'ChangeMe123!'
    const hash = hashPasswordSync(rawPassword)
    await pool.query(
      `INSERT INTO admins (email, full_name, role, password_hash)
       VALUES ($1, $2, 'owner', $3)
       ON CONFLICT (email) DO NOTHING`,
      [email, fullName, hash]
    )
  }
}

export async function ensureDbReady(): Promise<void> {
  if (!global.__mtsInitPromise) {
    global.__mtsInitPromise = runBootstrap().catch((err) => {
      global.__mtsInitPromise = undefined
      throw err
    })
  }
  return global.__mtsInitPromise
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  await ensureDbReady()
  return getPool().query<T>(text, params)
}

export async function rawPool(): Promise<Pool> {
  await ensureDbReady()
  return getPool()
}
