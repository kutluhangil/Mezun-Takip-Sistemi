import fs from 'node:fs'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import pg from 'pg'

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const stdin = process.stdin
    let value = ''
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
        if (c === '\u007f' || c === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            if (!hidden) process.stdout.write('\b \b')
          }
          continue
        }
        value += c
        if (!hidden) process.stdout.write(c)
      }
    }
    stdin.on('data', onData)
  })
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const APP_URL = 'https://mezun-takip-sistemi-bay.vercel.app'

async function main() {
  console.log('\nMezun Takip Sistemi — canlı sır kurulumu')
  console.log('Yazdıkların ekranda görünmez (şifreler) ve hiçbir yere kaydedilmez, yalnız Vercel ve Neon\'a gider.\n')

  console.log('— 1/2  Yönetici (Program Başkanı) hesabı —')
  const adminEmail = (await ask('Yönetici e-posta: ')).trim().toLowerCase()
  if (!EMAIL_RE.test(adminEmail)) throw new Error('Geçerli bir e-posta gir.')
  const adminName = (await ask('Görünen ad (boş bırakırsan "Program Başkanı"): ')).trim() || 'Program Başkanı'
  const adminPass = await ask('Yönetici şifresi (en az 10 karakter): ', { hidden: true })
  if (adminPass.length < 10) throw new Error('Şifre en az 10 karakter olmalı.')
  const adminPass2 = await ask('Şifreyi tekrar yaz: ', { hidden: true })
  if (adminPass !== adminPass2) throw new Error('Şifreler aynı değil.')

  console.log('\n— 2/2  Gmail ile e-posta gönderimi —')
  const gmail = (await ask('Gmail adresi: ')).trim().toLowerCase()
  if (!EMAIL_RE.test(gmail)) throw new Error('Geçerli bir Gmail adresi gir.')
  const appPass = (await ask('Gmail uygulama şifresi (16 haneli, boşluklar olabilir): ', { hidden: true })).replace(/\s+/g, '')
  if (appPass.length !== 16) throw new Error('Uygulama şifresi 16 karakter olmalı.')

  const envFile = fs.readFileSync('.env.local', 'utf8')
  const dbUrl = (envFile.match(/^DATABASE_URL="?([^"\n]+)"?/m) || [])[1]
  if (!dbUrl) throw new Error('.env.local içinde DATABASE_URL yok (önce: vercel env pull .env.local).')

  console.log('\nNeon yönetici hesabı güncelleniyor...')
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  try {
    const hash = hashPassword(adminPass)
    const upd = await pool.query(
      `UPDATE admins SET email = $1, full_name = $2, password_hash = $3, active = true
       WHERE LOWER(email) = 'admin@fbu.edu.tr'`,
      [adminEmail, adminName, hash]
    )
    if (upd.rowCount === 0) {
      await pool.query(
        `INSERT INTO admins (email, full_name, role, password_hash) VALUES ($1, $2, 'owner', $3)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, active = true`,
        [adminEmail, adminName, hash]
      )
    }
    const left = await pool.query(`SELECT COUNT(*)::int AS c FROM admins WHERE LOWER(email) = 'admin@fbu.edu.tr'`)
    console.log(left.rows[0].c === 0 ? '  ✓ Varsayılan admin@fbu.edu.tr artık yok' : '  ! Varsayılan hesap hâlâ duruyor')
  } finally {
    await pool.end()
  }

  console.log('\nVercel ortam değişkenleri (production + preview) yazılıyor...')
  setVercelEnv('SMTP_HOST', 'smtp.gmail.com')
  setVercelEnv('SMTP_PORT', '465')
  setVercelEnv('SMTP_SECURE', 'true')
  setVercelEnv('SMTP_USER', gmail)
  setVercelEnv('SMTP_PASS', appPass)
  setVercelEnv('MAIL_FROM', `FBÜ İlk ve Acil Yardım Mezun Takip <${gmail}>`)
  setVercelEnv('APP_BASE_URL', APP_URL)

  console.log('\nBitti. Claude\'a "kurulum bitti" yaz; canlıya alıp test edeceğim.')
}

main().catch((err) => {
  console.error('\nHata:', err.message)
  process.exit(1)
})
