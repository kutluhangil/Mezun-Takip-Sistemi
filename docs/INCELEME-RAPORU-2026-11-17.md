# Mezun Takip Sistemi — Genel İnceleme Raporu (2026-11-17)

> Kapsam: tüm sunucu kodu (`src/lib`, `src/app/api`), veritabanı şeması, Docker/Vercel yapılandırması, belgeler (`docs/`), canlı site (`mezun-takip-sistemi-bay.vercel.app`) dış taraması.
> Çalıştırılanlar: `tsc --noEmit` ✅ temiz · `vitest` ✅ 10/10 · `npm audit` ⚠️ 3 açık (1 high) · canlı başlık taraması.
> **Doğrulanamayan:** canlı Neon veritabanının içeriği (varsayılan admin, deneme verisi). Okuma izni verilmedi; Bölüm 1.1'deki tek komutla kontrol edilebilir.

## Genel hüküm

Proje sağlam bir temel üzerine kurulmuş: tüm SQL sorguları parametreli (SQL injection yok), şifreler `scrypt` ile hash'leniyor, OTP kodları HMAC ile saklanıyor, oturum çerezleri `httpOnly` + imzalı, admin yetkileri her istekte veritabanından okunuyor, demo uçları canlıda 404 dönüyor. Tip denetimi ve testler temiz.

Eksikler ağırlıklı olarak **"canlıya tam açmadan önce"** sınıfında: tekrar gönderim yarışı, CSV formül enjeksiyonu, güvenlik başlıkları, TLS sertifika doğrulaması, toplu hatırlatmanın Vercel'de zaman aşımı riski ve temizlenmeyen tablolar. Hiçbiri şu an veri sızdıran bir açık değil, ama 600 mezun gelmeden kapatılmalı.

Öncelik: 🔴 canlı açılıştan önce şart · 🟠 kısa vadede · 🟡 iyileştirme

---

## 1. Yarım kalan işler (belgelerden + koddan)

| # | İş | Durum | Kimde |
|---|----|-------|-------|
| 1.1 | 🔴 Neon'daki `admin@fbu.edu.tr` / `ChangeMe123!` varsayılan yönetici | `KALAN-ISLER-DEVIR.md`'de "hâlâ duruyor" yazıyor, site artık herkese açık. Silindiği doğrulanmadı. | Kutluhan |
| 1.2 | 🔴 5 dosya commit bekliyor (`auth.ts`, `admin/login`, `AdminLoginClient`, `i18n`, `setup-prod-secrets.mjs` — "beni hatırla" 30 gün) | Canlıda çalışıyor ama repo'da yok → bir sonraki deploy bunu geri alabilir. | Kutluhan ("commit at") |
| 1.3 | 🔴 Deneme verisi temizliği (`Demo Mezun%`, `example.com`, test OTP'leri) | Yapılmadı/doğrulanmadı | Kutluhan |
| 1.4 | 🟠 Resmi KVKK metni | `v0-placeholder`; `data/kvkk-aydinlatma-taslak.json` var ama koda bağlı değil | Öğretmen |
| 1.5 | 🟠 600 mezun listesi + whitelist'i açmak | Liste gelmedi; whitelist kapalıyken **herhangi bir e-posta sahibi** kayıt olup anket doldurabilir | Öğretmen |
| 1.6 | 🟠 Tekrar kuralı (sabit dönem mi, 180 gün mü), gelir dilimleri, matris 11. madde | `acik-sorular.md` | Öğretmen |
| 1.7 | 🟡 Demo giriş kodlarının silinmesi (2 route + 2 client'taki `showDemoLogin`) | Canlıda kapalı ama ölü kod | Kod |
| 1.8 | 🟡 4 dışa aktarımın (xlsx/csv/docx/pdf) Vercel'de gerçek veriyle testi | Belgede "test edilecek" | Kod + Kutluhan |
| 1.9 | 🟡 Mac mini Docker yolu (`DEPLOY-MACMINI.md`, `docker-compose.yml`) | Vercel'e geçildi; bu yol artık yedek mi, silinecek mi belirsiz | Karar |

**1.1 için tek komut (Mac'te, proje klasöründe):**
```bash
set -a; . ./.env.local; set +a; psql "$DATABASE_URL" -c "select email, role, active from admins;"
```

---

## 2. Güvenlik bulguları

### 🔴 G1 — Aynı dönem için çift gönderim yarışı
`src/app/api/survey/submit/route.ts:32-45` — Uygunluk (`checkSubmissionEligibility`) transaction **dışında** kontrol ediliyor; veritabanında da "bir mezun, bir dönem, bir gönderim" kuralı yok. Çift tıklama veya iki sekme → aynı dönemde iki `submitted` kayıt → istatistikler şişer. "Yanıtlar asla silinmez" kuralı yüzünden sonradan temizlemek de zor.
**Çözüm:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_responses_submitted_period
  ON responses (survey_id, graduate_id, period_key) WHERE status = 'submitted';
```
+ uygunluk kontrolünü `BEGIN` sonrasına, `SELECT ... FOR UPDATE` ile mezun satırını kilitleyerek taşı; benzersizlik ihlalinde `409` dön. (Not: `cooldown_days` modunda aynı period_key ile tekrar gönderim olabileceği için index'i mod'a göre düşün — `period` modunda kesin uygula.)

### 🔴 G2 — CSV formül enjeksiyonu
`src/lib/exports/csv.ts:4` — Serbest metin cevapları `=`, `+`, `-`, `@` ile başlarsa Excel'de formül olarak çalışır (`=HYPERLINK(...)` vb.). Mezun yazıyor, öğretmen açıyor → klasik saldırı yolu.
**Çözüm:** `csvEscape` içinde `/^[=+\-@\t\r]/` ile başlayan değerlerin başına `'` ekle. Excel export'ta (`exceljs`) da aynı kontrolü yap.

### 🔴 G3 — Güvenlik başlıkları yok
Canlı taramada: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` **yok**; `X-Powered-By: Next.js` açık. (HSTS Vercel'den geliyor ✅.)
**Çözüm:** `next.config.ts` → `poweredByHeader: false` + `headers()` ile en azından:
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, temel bir CSP (`default-src 'self'; img-src 'self' data:; frame-ancestors 'none'`).

### 🟠 G4 — Veritabanı TLS sertifikası doğrulanmıyor
`src/lib/db.ts:39` — `ssl: { rejectUnauthorized: false }`. Neon geçerli sertifika kullanır; bu ayar ortadaki-adam saldırısına kapı bırakır.
**Çözüm:** Uzak host'ta `rejectUnauthorized: true` (Neon'da sorunsuz çalışır).

### 🟠 G5 — Yönetici hesabı kilitlenerek engellenebilir (DoS)
`src/lib/login-throttle.ts` — E-posta başına 15 dk'da 5 hata → kilit. Owner e-postasını bilen biri 15 dakikada bir 5 yanlış şifre atarak Program Başkanı'nı sürekli dışarıda tutar.
**Çözüm:** Kilidi `e-posta + IP` çiftine bağla (IP başına kilit zaten var); e-posta bazlı sayacı sadece "yavaşlatma" (artan gecikme) için kullan.

### 🟠 G6 — OTP deneme sınırı paralel isteklerle aşılabilir
`src/app/api/auth/verify-otp/route.ts:63-85` — `attempts >= 5` kontrolü ile `attempts + 1` arasında kilit yok; aynı anda 50 istek atılırsa hepsi "4. deneme" görür. Ayrıca `consumed_at` güncellemesi `WHERE consumed_at IS NULL` içermiyor (kod iki kez kullanılabilir).
**Çözüm:** Tek atomik sorgu: `UPDATE otp_codes SET attempts = attempts + 1 WHERE id=$1 AND attempts < 5 AND consumed_at IS NULL RETURNING attempts` → satır dönmezse reddet; tüketimde `... AND consumed_at IS NULL RETURNING id`.

### 🟠 G7 — OTP isteğinde IP sınırı yok (e-posta bombardımanı)
`request-otp` sınırı yalnızca **e-posta başına** (30 sn + saatte 8). Saldırgan her seferinde farklı adres yazarak sizin Gmail hesabınızdan binlerce mail gönderttirebilir → Gmail günlük kotası (≈500) dolar, gönderen hesap spam'e düşer, **gerçek mezunlar kod alamaz**.
**Çözüm:** IP başına saatlik sınır (ör. 10) + whitelist açılınca listede olmayana mail hiç gönderilmemeli (şu an zaten öyle ✅). Uzun vadede Vercel Firewall rate-limit kuralı veya Cloudflare Turnstile (görünmez captcha).

### 🟠 G8 — Taslak/gönderim gövdesi doğrulanmıyor
`survey/draft` ve `survey/submit` — `answers` içindeki **her anahtar** (soru tanımında olmasa bile) ve **her boyutta** değer veritabanına yazılıyor. Seçenek değerleri (`choice`) tanımlı seçeneklerle karşılaştırılmıyor, metin uzunluğu sınırı yok.
**Çözüm:** Yalnızca `definition.questions` içindeki id'leri kabul et; `single/multi` seçeneklerini tanıma göre doğrula; metinlere 2.000 karakter, toplam gövdeye ~100 KB sınırı koy.

### 🟠 G9 — Oturumlar geri alınamıyor
Token durumsuz (stateless). Çıkış sadece çerezi siliyor; çalınan bir admin çerezi 30 güne kadar geçerli kalır. Şifre değişikliği eski oturumları düşürmüyor.
**Çözüm:** `admins` tablosuna `session_version INT` ekle, token'a koy, `getAdminSession`'da karşılaştır; çıkış/şifre değişiminde artır.

### 🟡 G10 — Küçük maddeler
- `newAdmin` şifresi en az **6** karakter (`settings/route.ts:78`) → en az 12 yap.
- `newAdmin` mevcut bir e-postayla gelirse o adminin şifresini/rolünü sessizce **ezer** → ayrı "şifre sıfırla" eylemi yap, onay iste.
- Admin kendi şifresini değiştiremiyor (UI'da yok) → "Şifremi değiştir" ekle.
- Kritik admin eylemleri (rol değişimi, toplu içe aktarma, ayar değişimi, export) için **denetim kaydı (audit log)** tablosu yok.
- `/api/health` hata durumunda `err.message` döndürüyor (DB host bilgisi sızabilir) → genel mesaj dön.
- Var olmayan e-postada `scrypt` çalışmıyor → yanıt süresinden admin e-postası tahmin edilebilir (küçük risk) → sahte hash ile her zaman `verifyPassword` çalıştır.
- OTP kodu mail **konusunda** (`mail.ts:86`) → kilit ekranı bildiriminde görünür. Kabul edilebilir UX tercihi ama bilinçli olsun.
- `npm audit`: `nodemailer` 7.0.13'te 7 advisory (high; çoğu DoS/adres ayrıştırma) → `nodemailer@^10` (breaking, test et). `exceljs` → `uuid` moderate (sadece içe aktarmada, düşük risk).
- `docker-compose.yml` varsayılanları `ChangeMe123!` ve `mezun_change_me` — Mac mini yolu kullanılacaksa varsayılanı kaldır, eksikse başlatma hata versin.

---

## 3. Performans bulguları

### 🟠 P1 — Her soğuk başlangıçta migration + seed çalışıyor
`src/lib/db.ts:51` `runBootstrap()` her yeni Vercel örneğinde `001_init.sql`'in tamamını, anket upsert'ini ve admin sayımını çalıştırıyor. Canlıda `/api/health` ilk istekte **~2,1 sn** (diğer sayfalar ~200 ms).
**Çözüm:** Migration'ı build/deploy adımına taşı (`npm run db:migrate` → Vercel "Build Command" sonrası veya elle); runtime'da sadece bağlantı. Anket tanımı değişince sürüm numarasıyla güncelle.

### 🟠 P2 — Toplu hatırlatma Vercel'de zaman aşımına düşebilir
`admin/reminders/route.ts:34` — 600 mezuna **sırayla** mail + her biri için ayrı INSERT. Gmail SMTP ile mail başına ~1–2 sn → 10–20 dk. Vercel fonksiyon süresi sınırını aşar, yarıda kesilir, hangi mezuna gittiği belirsiz kalır. Gmail ayrıca toplu gönderimde hesabı geçici kilitler.
**Çözüm:** Partiler halinde (ör. 25'erli) istemciden tekrar çağrılan bir akış veya kuyruk; aynı gün zaten hatırlatılanı atla (çift tıklama koruması); `maxDuration` ayarla; nodemailer transporter'ını tekrar kullan (`pool: true`).

### 🟠 P3 — Satır satır INSERT döngüleri
Taslak kaydı (her 750 ms), gönderim ve mezun içe aktarma her cevap/satır için ayrı sorgu atıyor (30 soru = 30 gidiş-dönüş; 600 mezun = 600). Neon'da her gidiş-dönüş ~5–20 ms.
**Çözüm:** `INSERT ... SELECT * FROM jsonb_each($2::jsonb)` veya `unnest` ile tek sorgu. Taslakta sadece değişen cevapları gönder.

### 🟡 P4 — Admin sayfaları tüm veriyi istemciye gönderiyor
`requireAdminData()` ve `/api/admin/dashboard` her açılışta **tüm yanıtları + tüm cevapları + tüm mezunları** yüklüyor ve JSON/HTML'e gömüyor. 600 mezun × birkaç dönem → birkaç MB sayfa, kişisel veri tarayıcı belleğinde. Özet sayfası sadece sayı gösteriyor ama tüm cevaplar gidiyor.
**Çözüm:** Toplamaları SQL'de yap (veya sunucuda yapıp sadece özeti gönder); yanıt listesine sayfalama ekle.

### 🟡 P5 — Diğer
- `layout.tsx` `force-dynamic` → ana sayfa dahil hiçbir sayfa statik/önbellekli değil. Dil çerezi için tüm site dinamik. Ana sayfayı statik yapıp dili istemcide okumak mümkün.
- 3 değişken font tüm alt kümeleriyle yükleniyor → yalnızca `latin` + `latin-ext` alt kümelerini al (`@fontsource-variable/inter/latin-ext.css` gibi).
- `public/brand/fbu-campus.png` 354 KB PNG → WebP/AVIF (~60 KB). `images.unoptimized: true` olduğu için Next görsel optimizasyonu kapalı.
- `getLogoBuffer()` her PDF/DOCX'te diskten okuyor → modül seviyesinde bir kez önbellekle.
- `otp_codes` ve `login_attempts` hiç temizlenmiyor → haftalık `DELETE ... WHERE created_at < NOW() - INTERVAL '30 days'` (Vercel Cron).
- `getGraduatesWithStatus` her mezun için 3 alt sorgu (korelasyonlu) → 600'de sorun değil, ama `LATERAL` / tek `GROUP BY` ile sadeleşir.

---

## 4. Veri bütünlüğü ve KVKK

- 🔴 **Whitelist kapalıyken herkes kayıt olabilir.** Liste yüklenmeden site herkese açık; okul dışından biri istatistikleri kirletebilir. Liste gelene kadar "kayıt olmayan e-posta" için ek doğrulama (öğrenci no + yıl eşleşmesi) veya geçici kapalı mod öner.
- 🟠 **Açık rıza metni boşken onay toplanıyor** (`consents.text_version = v0-placeholder`). KVKK açısından boş metne verilmiş onay geçersiz sayılabilir. Resmi metin gelince sürüm `v1` yapılmalı ve `v0` ile onay verenlerden bir sonraki girişte yeniden onay alınmalı (kod bunu şu an yapmıyor).
- 🟠 **Silme / ilgili kişi talepleri.** "Hiçbir yanıt silinmez" kuralı KVKK md. 11 (silme hakkı) ile çatışabilir. En azından admin panelinde "mezunu anonimleştir" (ad/e-posta/öğrenci no'yu sil, cevapları istatistik için tut) eylemi olmalı.
- 🟠 **Yedekleme planı yok.** Neon ücretsiz planda geçmişe dönme süresi kısıtlı. Haftalık `pg_dump` (GitHub Action veya Mac mini cron → şifreli dosya) önerilir.
- 🟡 Export dosyaları tam kişisel veri içeriyor (ad, e-posta, öğrenci no). "Anonim export" seçeneği (kimlik sütunları olmadan) raporlama için yeterli olur.
- 🟡 `consents.ip_hint` tam IP saklıyor → KVKK metninde belirtilmeli veya son okteti maskelenmeli.

---

## 5. Kod kalitesi / temizlik

- `hashPasswordSync` (`db.ts:45`) ile `hashPassword` (`auth.ts:24`) **kopya** → tek fonksiyon.
- `scripts/setup-prod-secrets.mjs` ve `migrate-and-seed.mjs` içinde üçüncü bir hash kopyası olabilir → ortak modül.
- Uygunluk kontrolü bloğu 4 yerde kopya (`anket/page`, `draft GET/PUT`, `submit`) → `getEligibility(survey, graduateId)` yardımcısı.
- Draft cevap sorgusu 2 yerde kopya (`anket/page.tsx`, `draft GET`).
- `AGENTS.md` sadece Next.js'in otomatik bloğunu içeriyor; proje kuralları (append-only, KVKK, roller) için asıl bir `AGENTS.md`/`CLAUDE.md` yazılmalı.
- Kök dizinde `.DS_Store`, `tsconfig.tsbuildinfo` var (gitignore'da ✅, ama klasörde) — sorun değil.
- `ui-` ve admin istemci bileşenlerinde i18n tamam, ama sunucu hata mesajlarının bir kısmı sadece Türkçe (`admin/login`, `graduates`, `settings`).
- ESLint yok (`lint` script'i aslında `tsc`). `eslint-config-next` + `react-hooks` kuralları eklenmeli.

---

## 6. Testler

Mevcut: 10 birim testi (toplama + doğrulama + export). Eksik olanlar:
- API uç testleri: OTP akışı (yanlış kod, süre dolumu, 5 deneme), çift gönderim, yetkisiz `viewer`'ın owner eylemleri (403).
- CSV formül enjeksiyonu testi (G2 düzeltmesiyle birlikte).
- Playwright E2E: giriş → anket → teşekkürler; admin giriş → export indir.
- CI yok: GitHub Actions'ta `tsc + vitest + npm audit --omit=dev` her push'ta çalışsın.

---

## 7. Eklenebilecek özellikler (öneri)

| Öncelik | Özellik | Neden |
|---|---|---|
| 🟠 | **Hatırlatma zamanlayıcısı** (Vercel Cron, ör. dönem başı + 2 hafta sonra) | Öğretmen elle basmak zorunda kalmaz |
| 🟠 | **Mezun "bağlantıyla giriş"** (OTP yerine e-postadaki tek tık link, aynı güvenlik) | Mobilde kod kopyalamaktan kolay, dönüş oranı artar |
| 🟠 | **Dönem karşılaştırma grafiği** (2026-Güz vs 2027-Bahar istihdam oranı) | Planın asıl amacı; veri modeli hazır |
| 🟠 | **Excel şablonu indir** butonu (`/admin/mezunlar`) | Öğretmen doğru sütunlarla liste hazırlar, içe aktarma hatası azalır |
| 🟠 | İçe aktarma **önizleme**si (kaç yeni, kaç güncellenecek, kaç atlanacak — kaydetmeden önce) | Yanlış dosyayla 600 kaydı ezmeyi önler |
| 🟡 | Yanıt oranı göstergesi (yıl/döneme göre "600'de 212 doldurdu") ve "doldurmayanlar" listesinden tek tık hatırlatma | Takip kolaylığı |
| 🟡 | Admin denetim kaydı sayfası | Kim ne zaman export aldı / ayar değiştirdi (KVKK hesap verebilirlik) |
| 🟡 | Mezuna "geçmiş yanıtlarım" (salt okunur) görünümü | Şeffaflık; "düzenleme yok" kuralını bozmaz |
| 🟡 | Hata izleme (Sentry ücretsiz plan veya Vercel Observability) | Canlıda sessiz hataları görmek |
| 🟡 | `robots.txt` (`Disallow: /admin`, `/api`) + `noindex` admin sayfalarında | Şu an `robots.txt` 404 |
| 🟡 | Erişilebilirlik turu (form etiketleri, odak sırası, kontrast) — kamu üniversitesi için önemli | |

---

## 8. Önerilen uygulama sırası (fazlar)

**Faz 1 — Canlı güvenliği (½ gün)** 🔴
1. Varsayılan admini kontrol et/sil (1.1), bekleyen 5 dosyayı commit et (1.2), deneme verisini temizle (1.3).
2. G1 çift gönderim index'i + transaction içi kontrol.
3. G2 CSV/Excel formül kaçışı.
4. G3 güvenlik başlıkları + `poweredByHeader: false` + `robots.txt`.
5. G4 `rejectUnauthorized: true`.

**Faz 2 — Kötüye kullanım koruması (½ gün)** 🟠
6. G6 atomik OTP denemesi, G7 IP başına OTP sınırı, G5 kilit stratejisi.
7. G8 cevap gövdesi doğrulaması + boyut sınırı.
8. `nodemailer@10` yükseltmesi + OTP/hatırlatma testi.

**Faz 3 — Ölçeklenme (600 mezun öncesi, 1 gün)** 🟠
9. P1 migration'ı runtime'dan çıkar.
10. P2 hatırlatmayı partili + tekrar koruması yap.
11. P3 toplu INSERT'ler; P4 admin verisini sunucuda topla.
12. İçe aktarma önizlemesi + Excel şablonu.

**Faz 4 — KVKK ve işletim (1 gün)** 🟠
13. Resmi KVKK metni + eski onaylar için yeniden onay akışı.
14. Anonimleştirme eylemi, audit log, haftalık yedek, tablo temizliği cron'u.
15. G9 oturum sürümü, şifre değiştirme ekranı, şifre politikası.

**Faz 5 — Kalite ve özellikler** 🟡
16. Kopya kod birleştirme, demo kodunun silinmesi, ESLint, CI, API + E2E testleri.
17. Dönem karşılaştırma, otomatik hatırlatma, link ile giriş, hata izleme.
