// Gemini gravürlerini şeffaf WebP'ye çevirir ve Art bileşeninin okuduğu manifesti yazar.
//
//   npm run art               assets-src/illustrations/<ad>.png       (düz beyaz zemin)  → public/art/<ad>.webp
//                             assets-src/illustrations/<ad>-dark.png  (düz siyah zemin)  → public/art/<ad>-dark.webp
//   npm run art -- --self-test
//
// Gemini gerçek alfa vermez; prompt düz beyaz/siyah zemin ister, zemin burada kenardan
// taşma dolgusuyla silinir. Manifest (src/data/art-manifest.json) yalnız var olan dosyaları listeler,
// böylece eksik görsel hiçbir zaman kırık <img> olmaz, mürekkep SVG yedeği çizilir.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const SRC = 'assets-src/illustrations'
const OUT = 'public/art'
const MANIFEST = 'src/data/art-manifest.json'
const MAX_SIDE = 1024

const isLightBg = (r, g, b) => Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) <= 18
const isDarkBg = (r, g, b) => Math.max(r, g, b) <= 46 && Math.max(r, g, b) - Math.min(r, g, b) <= 18

/** Kenara bağlı zemin piksellerini şeffaf yapar; kesim kenarı yarı saydam yumuşatılır. */
export function clearBackground(px, w, h, dark) {
  const isBg = dark ? isDarkBg : isLightBg
  const seen = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    const i = y * w + x
    if (seen[i]) return
    seen[i] = 1
    const o = i * 4
    if (isBg(px[o], px[o + 1], px[o + 2])) stack.push(i)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  let cleared = 0
  while (stack.length) {
    const i = stack.pop()
    px[i * 4 + 3] = 0
    cleared++
    const x = i % w
    const y = (i / w) | 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  if (dark) cleared += clearEnclosedHoles(px, w, h)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    if (px[o + 3] === 0) continue
    const x = i % w
    const y = (i / w) | 0
    const near = (x > 0 && px[o - 1] === 0) || (x < w - 1 && px[o + 7] === 0) || (y > 0 && px[o - w * 4 + 3] === 0) || (y < h - 1 && px[o + w * 4 + 3] === 0)
    const v = dark ? Math.max(px[o], px[o + 1], px[o + 2]) < 90 : Math.min(px[o], px[o + 1], px[o + 2]) > 160
    if (near && v) px[o + 3] = 128
  }
  return cleared
}

/**
 * Koyu sürümde çizimin içinde kalan saf siyah boşlukları (halka içi, mühür zemini) da siler.
 * Yalnız koyu için: açık sürümde kırık beyaz kâğıt alanları zemine benzer, delinmemeli.
 * Ufak noktalar (tarama araları) kalır; yalnız görselin %0,05'inden büyük bölgeler silinir.
 */
function clearEnclosedHoles(px, w, h) {
  const isHole = (o) => px[o + 3] !== 0 && Math.max(px[o], px[o + 1], px[o + 2]) <= 20
  const minArea = Math.max(64, Math.round(w * h * 0.0005))
  const seen = new Uint8Array(w * h)
  let cleared = 0
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !isHole(start * 4)) continue
    const region = [start]
    seen[start] = 1
    for (let k = 0; k < region.length; k++) {
      const i = region[k]
      const x = i % w
      const y = (i / w) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || seen[j] || !isHole(j * 4)) continue
        seen[j] = 1
        region.push(j)
      }
    }
    if (region.length < minArea) continue
    for (const i of region) px[i * 4 + 3] = 0
    cleared += region.length
  }
  return cleared
}

async function convert(file) {
  const name = parse(file).name.toLowerCase()
  const dark = name.endsWith('-dark')
  const { data, info } = await sharp(join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let hasAlpha = false
  for (let o = 3; o < data.length; o += 4 * 97) if (data[o] < 250) { hasAlpha = true; break }
  const cleared = hasAlpha ? 0 : clearBackground(data, info.width, info.height, dark)
  // Kırpılmış hâli geniş bir şeritse (footer, süs) uzun kenar 2048'e kadar korunur, yoksa geniş ekranda bulanıklaşır
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true })
  const maxSide = trimmed.info.width / trimmed.info.height > 2.5 ? MAX_SIDE * 2 : MAX_SIDE
  const out = await sharp(trimmed.data)
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(join(OUT, `${name}.webp`))
  const share = cleared / (info.width * info.height)
  console.log(`${name}: ${hasAlpha ? 'gerçek alfa korundu' : `zeminin %${(share * 100).toFixed(0)}'i silindi`} → ${out.width}×${out.height}`)
  if (!hasAlpha && share < 0.05) console.warn(`  ! ${name}: neredeyse hiç zemin silinmedi; zemin düz ${dark ? 'siyah' : 'beyaz'} mi?`)
}

function writeManifest() {
  const files = existsSync(OUT) ? readdirSync(OUT).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)) : []
  const light = files.filter((f) => !f.endsWith('-dark')).sort()
  const dark = files.filter((f) => f.endsWith('-dark')).map((f) => f.slice(0, -5)).sort()
  writeFileSync(MANIFEST, JSON.stringify({ light, dark }, null, 2) + '\n')
  console.log(`manifest: ${light.length} açık, ${dark.length} koyu → ${MANIFEST}`)
}

function selfTest() {
  for (const dark of [false, true]) {
    const w = 40, h = 40, bg = dark ? 10 : 252, ink = dark ? 240 : 25
    const px = Buffer.alloc(w * h * 4, 255)
    for (let i = 0; i < w * h; i++) px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = bg
    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) { const o = (y * w + x) * 4; px[o] = px[o + 1] = px[o + 2] = ink }
    clearBackground(px, w, h, dark)
    const a = (x, y) => px[(y * w + x) * 4 + 3]
    if (!(a(0, 0) === 0 && a(39, 39) === 0 && a(20, 20) === 255)) { console.log('self-test FAILED', dark ? 'dark' : 'light'); process.exit(1) }
  }
  console.log('self-test ok')
}

if (process.argv.includes('--self-test')) selfTest()
else {
  mkdirSync(OUT, { recursive: true })
  const files = existsSync(SRC) ? readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort() : []
  if (!files.length) console.log(`${SRC}/ içinde görsel yok`)
  for (const f of files) await convert(f)
  writeManifest()
}
