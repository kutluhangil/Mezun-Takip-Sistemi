<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Mezun Takip Sistemi — proje kuralları

- **Yanıtlar kalıcıdır:** gönderilmiş (`submitted`) yanıt silinmez, üzerine yazılmaz. KVKK silme talebi yalnız `POST /api/admin/graduates/anonymize` ile yapılır (kimlik silinir, cevaplar kimliksiz kalır).
- **Şema değişikliği:** yeni dosya `db/migrations/NNN_ad.sql` (idempotent: `IF NOT EXISTS`). Mevcut migration dosyası düzenlenmez. Uygulama her sunucu örneğinde bekleyen migration'ı kendisi uygular (`db/core.mjs`); elle: `npm run db:migrate`.
- **Anket metni:** `data/surveys/mezun-bilgi-2026.json`. Dosya değişince veritabanındaki tanım içerik hash'iyle kendiliğinden güncellenir. Soru `id` değerleri değiştirilmez (eski yanıtlar bu id'lere bağlı).
- **Sunucuda doğrulama:** istemciden gelen cevap haritası her zaman `sanitizeAnswers` ile temizlenir; istek gövdeleri `readJson(req, limit)` ile okunur; hata yanıtları `handleRouteError` / `jsonError`.
- **Yetki:** yazan her admin rotası `role === 'owner'` kontrol eder; kritik eylemler `audit()` ile kaydedilir.
- **Kişisel veri:** analiz ekranlarına giden yanıtlar `stripIdentity` ile kimliksizleştirilir. Kimlik yalnız Yanıtlar ve Mezunlar sayfalarında görünür.
- **Tasarım:** `fildisi-kagit` dili. Renkler `globals.css` token'larından (`bg-bg`, `text-ink`, `text-clay` …); açık ve koyu temada kontrol et. Mobilde dokunma hedefi ≥ 48 px. Ortak parçalar `src/components/ui/AppShell.tsx` (`btn`, `Card`, `Section`, `PageHeader`, `Notice`) ve `src/components/admin/kit.tsx`.
- **Görseller:** prompt'lar `docs/GEMINI-GORSEL-PROMPTLARI.md`; ham dosya `assets-src/illustrations/`, dönüştürme `npm run art`.
- **Doğrulama:** `npm run check` (tsc + eslint + vitest) temiz olmadan iş bitmiş sayılmaz.
