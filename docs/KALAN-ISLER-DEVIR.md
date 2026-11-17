# Kalan İşler ve Devir Listesi (2026-11-17)

> Mimari ve geçmiş için [DEVIR-NOTU.md](DEVIR-NOTU.md). Bu turda yapılanların listesi [PLAN-V2.md](PLAN-V2.md), gerekçeler [INCELEME-RAPORU-2026-11-17.md](INCELEME-RAPORU-2026-11-17.md).
> **Durum:** v2 yerelde bitti ve doğrulandı (`npm run check` temiz, `next build` temiz, uçtan uca API testi 36/36). **Commit ve deploy yapılmadı.**

## 1. Canlıya almadan önce (Kutluhan)

1. **Commit + push** ("commit at" demen yeterli). Vercel otomatik deploy eder.
2. **Vercel ortam değişkenleri** (production + preview):
   - `CRON_SECRET`: yeni, rastgele bir değer. Günlük temizlik işi (`/api/cron/cleanup`, `vercel.json`) bununla korunur. Üret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `SESSION_SECRET`: en az 32 karakter olduğundan emin ol (kod 16'nın altını reddeder).
3. **İlk açılışta ne olur:**
   - `002_hardening.sql` migration'ı ilk istekte kendiliğinden uygulanır (yeni sütunlar, denetim tablosu, çift gönderim index'i, IP maskeleme).
   - Oturum çerezinin biçimi değişti: **açık tüm oturumlar bir kez kapanır**, herkes yeniden giriş yapar. Bu beklenen davranış.
   - İstersen önce yerelden de uygulayabilirsin: `vercel env pull .env.local` sonra `set -a; . ./.env.local; set +a; npm run db:migrate`
4. **Canlıda kontrol:** `/api/health` → `{"ok":true}`, ana sayfa açık ve koyu tema, `/giris` ile gerçek OTP e-postası, `/admin/ayarlar` → şifre değiştir, `/admin/rapor` → 4 dosya.
5. **Deneme verisi temizliği** (Neon): `graduates` tablosunda `email LIKE '%@example.com'` veya `full_name LIKE 'Demo%'` satırları. Silmeden önce kontrol et; anonimleştirme panelden de yapılabilir.

## 2. Gemini görselleri — tamam

- 11 görsel × açık/koyu `public/art/` altında: 9 sayfa gravürü + `footer` bandı + sitenin `logo`su (FBÜ logosu yerine; sekme ikonu `src/app/icon.png` ondan üretildi). Resmi raporlarda (PDF/DOCX) FBÜ logosu bilerek kalıyor.
- Yenisi gerekirse aynı adla `assets-src/illustrations/` içine koyup `npm run art`.

## 3. Öğretmenlerden beklenen (değişmedi)

- **Mezun listesi (~600):** `/admin/mezunlar` → "Excel şablonu" ile doldurulup "Liste yükle" (önce önizleme gösterir). Sonra `/admin/ayarlar` → "Yalnız mezun listesindekiler girebilsin" açılmalı. Liste gelene kadar panelde uyarı bandı duruyor.
- **Resmi KVKK metni:** Şu an `data/kvkk-aydinlatma-taslak.json` taslağı gösteriliyor. Resmi metin gelince `/admin/ayarlar` → KVKK, **sürüm etiketini de değiştir**; mezunlar bir sonraki girişte yeniden onaylar.
- **Tekrar kuralı, gelir dilimleri, matris 11. madde:** [acik-sorular.md](acik-sorular.md).

## 4. İsteğe bağlı sonraki adımlar

- Otomatik dönem hatırlatması (Vercel Cron ile dönem başında `reminders` partileri).
- Dönem karşılaştırma grafiği (2026-Güz vs 2027-Bahar istihdam oranı).
- Hata izleme (Vercel Observability veya Sentry).
- Haftalık veritabanı yedeği (Neon dalı veya `pg_dump` GitHub Action).
- `README` başındaki `docs/media/hero.svg` hâlâ eski konsept afişi; istenirse `readme-tema` ile yeni tasarıma göre yenilenir.
