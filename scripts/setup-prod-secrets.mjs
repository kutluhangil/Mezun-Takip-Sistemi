import fs from 'node:fs'
import readline from 'node:readline/promises'
import { spawnSync } from 'node:child_process'
import pg from 'pg'
import { hashPassword, runMigrations, sslConfig } from '../db/core.mjs'

async function askVisible(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const stdin = process.stdin
    let value = ''
    let inEscape = false
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          stdin.setRawMode?.(false)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          return resolve(value)
        }
        if (c === '\u0003') process.exit(130)
        if (c === '\u001b') {
          inEscape = true
          continue
        }
        if (inEscape) {
          if (c >= '@' && c <= '~') inEscape = false
          continue
        }
        if (c === '\u007f' || c === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }
        if (c < ' ') continue
        value += c
        process.stdout.write('*')
      }
    }
    stdin.on('data', onData)
  })
}

function setVercelEnv(name, value) {
  for (const target of ['production', 'preview']) {
    spawnSync('vercel', ['env', 'rm', name, target, '--yes'], { stdio: 'ignore' })
    const res = spawnSync('vercel', ['env', 'add', name, target], { input: value, encoding: 'utf8' })
    if (res.status !== 0) {
      console.error(`  ✗ ${name} (${target}) eklenemedi:`, (res.stderr || res.stdout || '').trim().split('\n').pop())
      process.exit(1)
    }
  }
  console.log(`  ✓ ${name}`)
}

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const APP_URL = 'https://mezun-takip-sistemi-bay.vercel.app'

async function main() {
  const adminOnly = process.argv.includes('--admin-only')

  console.log('\nMezun Takip Sistemi — canlı sır kurulumu')
  console.log('Şifreler yıldız (*) olarak görünür ve hiçbir yere düz yazılmaz, yalnız Vercel ve Neon\'a gider.\n')

  console.log(adminOnly ? '— Yönetici (Program Başkanı) hesabı güncelleme —' : '— 1/2  Yönetici (Program Başkanı) hesabı —')
  const adminEmail = (await askVisible('Yönetici e-posta: ')).trim().toLowerCase()
  if (!EMAIL_RE.test(adminEmail)) throw new Error('Geçerli bir e-posta gir (yalnızca harf, rakam ve standart e-posta karakterleri).')
  const adminName = (await askVisible('Görünen ad (boş bırakırsan "Program Başkanı"): ')).trim() || 'Program Başkanı'
  const adminPass = await askHidden('Yönetici şifresi (en az 12 karakter): ')
  if (adminPass.length < 12) throw new Error('Şifre en az 12 karakter olmalı.')
  const adminPass2 = await askHidden('Şifreyi tekrar yaz: ')
  if (adminPass !== adminPass2) throw new Error('Şifreler aynı değil.')

  let gmail = ''
  let appPass = ''
  if (!adminOnly) {
    console.log('\n— 2/2  Gmail ile e-posta gönderimi —')
    gmail = (await askVisible('Gmail adresi: ')).trim().toLowerCase()
    if (!EMAIL_RE.test(gmail)) throw new Error('Geçerli bir Gmail adresi gir.')
    appPass = (await askHidden('Gmail uygulama şifresi (16 haneli, boşluklar olabilir): ')).replace(/\s+/g, '')
    if (appPass.length !== 16) throw new Error('Uygulama şifresi 16 karakter olmalı.')
  }

  const envFile = fs.readFileSync('.env.local', 'utf8')
  const dbUrl = (envFile.match(/^DATABASE_URL="?([^"\n]+)"?/m) || [])[1]
  if (!dbUrl) throw new Error('.env.local içinde DATABASE_URL yok (önce: vercel env pull .env.local).')

  console.log('\nNeon yönetici hesabı güncelleniyor...')
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: sslConfig(dbUrl) })
  try {
    await runMigrations(pool, { log: (m) => console.log('  ' + m) })
    const hash = hashPassword(adminPass)
    const upd = await pool.query(
      `UPDATE admins SET email = $1, full_name = $2, password_hash = $3, active = true, session_version = session_version + 1
       WHERE id = (SELECT id FROM admins WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1)`,
      [adminEmail, adminName, hash]
    )
    if (upd.rowCount === 0) {
      await pool.query(
        `INSERT INTO admins (email, full_name, role, password_hash) VALUES ($1, $2, 'owner', $3)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, active = true`,
        [adminEmail, adminName, hash]
      )
    }
    await pool.query(`DELETE FROM login_attempts`)
    const check = await pool.query(`SELECT email, active FROM admins WHERE role = 'owner'`)
    console.log(`  ✓ Kayıtlı yönetici e-posta: ${check.rows[0]?.email} (aktif: ${check.rows[0]?.active})`)
  } finally {
    await pool.end()
  }

  if (!adminOnly) {
    console.log('\nVercel ortam değişkenleri (production + preview) yazılıyor...')
    setVercelEnv('SMTP_HOST', 'smtp.gmail.com')
    setVercelEnv('SMTP_PORT', '465')
    setVercelEnv('SMTP_SECURE', 'true')
    setVercelEnv('SMTP_USER', gmail)
    setVercelEnv('SMTP_PASS', appPass)
    setVercelEnv('MAIL_FROM', `FBÜ İlk ve Acil Yardım Mezun Takip <${gmail}>`)
    setVercelEnv('APP_BASE_URL', APP_URL)
  }

  console.log('\nBitti. Artık https://mezun-takip-sistemi-bay.vercel.app/admin/giris adresinden giriş yapabilirsin.')
}

main().catch((err) => {
  console.error('\nHata:', err.message)
  process.exit(1)
})
