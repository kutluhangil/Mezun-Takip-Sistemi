import type { Pool } from 'pg'

export function sslConfig(connectionString: string): { rejectUnauthorized: boolean } | undefined
export function hashPassword(password: string): string
export function migrationsDir(): string
export function listMigrations(dir?: string): string[]
export function runMigrations(pool: Pool, opts?: { log?: (msg: string) => void }): Promise<string[]>
export function surveyHash(surveyJson: unknown): string
export function ensureSeed(
  pool: Pool,
  surveyJson: { slug: string; title: { tr: string; en: string } },
  opts?: { isProd?: boolean; env?: Record<string, string | undefined>; log?: (msg: string) => void }
): Promise<void>
