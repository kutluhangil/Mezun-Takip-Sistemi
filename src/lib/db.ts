import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'
import { ensureSeed, runMigrations, sslConfig } from '../../db/core.mjs'
import surveyJson from '../../data/surveys/mezun-bilgi-2026.json'

declare global {
  var __mtsPool: Pool | undefined
  var __mtsInitPromise: Promise<void> | undefined
}

function getPool(): Pool {
  if (!global.__mtsPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL tanımlı değil.')
    global.__mtsPool = new Pool({
      connectionString,
      max: process.env.VERCEL ? 5 : 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      ssl: sslConfig(connectionString),
    })
  }
  return global.__mtsPool
}

/** Sunucu örneği başına bir kez: bekleyen migration'lar + anket/yönetici tohumu. Kararlı durumda 2 hafif sorgu. */
async function bootstrap(): Promise<void> {
  const pool = getPool()
  const log = (msg: string) => console.info(msg)
  await runMigrations(pool, { log })
  await ensureSeed(pool, surveyJson, { isProd: process.env.NODE_ENV === 'production', log })
}

export async function ensureDbReady(): Promise<void> {
  if (!global.__mtsInitPromise) {
    global.__mtsInitPromise = bootstrap().catch((err) => {
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

/** BEGIN/COMMIT/ROLLBACK ve bağlantı iadesini tek yerde yönetir. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureDbReady()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}
