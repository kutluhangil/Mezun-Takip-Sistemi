# Mezun Takip Sistemi — Kapsamlı Proje Özeti ve Devir Notu

> **Amaç:** Bu belge, projede 12–15 Kasım 2026 arasında alınan tüm mimari kararları, yapılan geliştirmeleri, mevcut altyapı durumunu ve kalan adımları herhangi bir yapay zekâ asistanının (Claude Code, Codex, Antigravity) bağlam kaybetmeden devam edebilmesi için özetler.
> **Son güncelleme:** 2026-11-15

---

## 1. Proje Özeti ve Kapsam

- **Kurum ve Program:** Fenerbahçe Üniversitesi, Sağlık Hizmetleri Meslek Yüksekokulu, **İlk ve Acil Yardım Programı** (~600 mezun).
- **Amaç:** Mezunların istihdam durumunu, mesleki gelişimini ve program memnuniyetini takip etmek; öğretmenlere (admin) grafikli analiz ve dışa aktarım sunmak.
- **Dil:** Tam iki dilli (**TR + EN**) — karşılama, giriş, 30 soruluk anket, yönetici paneli, 404 sayfası, e-posta şablonları ve 4 rapor çıktısı.
- **Tasarım Dili (`fildisi-kagit`):**
  - Yalnızca **Açık Tema (Fildişi Kâğıt)**: `#f9f9f7` (zemin), `#ffffff` (yükseltilmiş kart), `#141413` (mürekkep), `#d97757` (kil turuncusu vurgu), `#ebc9b7` (şeftali dokunuş), `#87867f` (ikincil metin).
  - Kullanıcının talebiyle **dark tema ve tema değiştirme düğmesi tamamen kaldırıldı** (yalnız `SiteFooter` `#141413` koyu zemindedir).
  - Tipografi: `Source Serif 4 Variable` (başlıklar), `Inter Variable` (gövde), `JetBrains Mono Variable` (kod/OTP/öğrenci no), tüm sayılarda `tabular-nums`.
  - Mobil öncelikli ergonomi: altta sabit `MobileNav`, minimum `44px+` dokunma hedefleri.

---

## 2. Altyapı ve Karar Evrimi (Kronolojik)

1. **12 Kasım 2026:** Ebelik örnek PDF'inden (`docs/kaynak/anket-orijinal.pdf`) yola çıkılarak öğretmenlere 43 soruluk soru belgesi (`docs/ogretmen-sorulari.md` + `.docx`) hazırlandı.
2. **15 Kasım 2026 (Sabaha karşı):**
   - `docs/ogretmen-sorulari-cevaplar.docx` içindeki yanıtlar işlenerek `docs/PLAN.md` ve `docs/acik-sorular.md` oluşturuldu.
   - Uygulama baştan sona inşa edildi (Next.js 16.4.6 App Router, Tailwind CSS v4, `pg`, Vitest, `exceljs`, `docx`, `pdfkit`, `dejavu-fonts-ttf`, `nodemailer`).
   - Geçici olarak yerel Docker Postgres ile test edilip sonra kullanıcının isteğiyle yerel Docker konteyneri silindi (üretim için `Dockerfile` + `docker-compose.yml` ve `docs/DEPLOY-MACMINI.md` korundu).
   - Mezun `/giris` ekranına geçici dev-only **"Ankete Geç"** demo düğmesi eklendi.
3. **15 Kasım 2026 (Gündüz):**
   - **Görseller tamamlandı:**
     - (2026-11-17'de kaldırıldı) Bina görseli yerine ana sayfada `hero` gravürü kullanılıyor.
     - Görsel prompt'ları artık `docs/GEMINI-GORSEL-PROMPTLARI.md` içinde; Codex tarafından 6 şeffaf `.webp` gravür (`thanks.webp`, `ornament.webp`, `seal.webp`, `admin.webp`, `empty.webp`, `offline.webp`) `public/art/` altına üretildi (ham PNG'ler `.gitignore` kapsamındaki `assets-src/illustrations/` içinde).
     - `src/components/ui/Art.tsx` içinde tüm 6 görsel aktif edildi; `src/app/not-found.tsx` ve admin boş durum görselleri bağlandı. Canlı `next start` üzerinde ekran görüntüleriyle (`/` hero + ornament + `#141413` footer `seal` + `/olmayan-sayfa-404`) doğrulandı.
   - **Yayın altyapısı Vercel + Neon olarak güncellendi:**
     - Supabase (yer darlığı) ve alan adı gerektiren `macmini-server` Cloudflare Tunnel yerine **Vercel + Neon PostgreSQL** seçildi.
     - Vercel projesi bağlandı (`kutluhans-projects-93876a9e/mezun-takip-sistemi`, `.vercel` `.gitignore` içine eklendi).
     - Vercel Marketplace üzerinden **Neon PostgreSQL (`mezun-takip-db`, Free plan, Frankfurt `fra1`)** oluşturuldu ve Vercel ortam değişkenlerine (`DATABASE_URL` vb.) bağlandı; `SESSION_SECRET` Production ve Preview için üretilip eklendi.
     - `src/lib/db.ts` ve `scripts/migrate-and-seed.mjs` bulut Postgres SSL + serverless havuz (`max: 5`) için güncellendi; `next.config.ts` içine `outputFileTracingIncludes` (`./db/migrations/**/*`, `./public/brand/fbu-logo.png`, `./node_modules/dejavu-fonts-ttf/ttf/**/*`) ve `output: process.env.VERCEL ? undefined : 'standalone'` eklendi.
     - Neon ortam değişkenleri `.env.local` dosyasına çekildi (`vercel env pull .env.local`). Yerel `next dev` (port `3474`) Docker olmadan doğrudan Neon'a bağlanıyor; ilk açılışta `001_init.sql` şeması ve anket tanımı Neon'a otomatik işlendi.
   - **Yönetici Demo Girişi eklendi:**
     - `/admin/giris` sayfasına dev-only **"Panele Geç"** geçici önizleme düğmesi ve `/api/admin/demo-login` eklendi (`NODE_ENV === 'production'` altında 404 döner ve görünmez).

---

## 3. Mimari ve Dosya Haritası

### Veri ve Veritabanı
- `db/migrations/001_init.sql`: `surveys`, `graduates`, `otp_codes`, `responses` (append-only, dönem/sıra bazlı), `answers`, `admins` (`owner` / `viewer`), `app_settings`, `reminder_logs`.
- `src/lib/db.ts`: `pg` havuzu, Neon/uzak sunucu SSL otomatik algılama, `ensureDbReady()` ile ilk çalışmada otomatik migration + `mezun-bilgi-2026.json` senkronizasyonu + ilk `owner` admin oluşturma.
- `data/surveys/mezun-bilgi-2026.json`: 30 soruluk tam TR/EN anket tanımı (5 bölüm; DGS sorusu, 0–10 memnuniyet ölçeği, 9 güçlü / 11 zayıf yön + "Diğer", "Çalışmıyorum"/"Yok" kısa yolları, 5'li Likert matrisi, S29'dan gelen 5 yeni soru).
- `data/provinces.ts`: 81 il listesi + `"Çalışmıyorum"` seçeneği.
- `scripts/migrate-and-seed.mjs`: Elle migration ve `--demo` bayrağıyla örnek 5 mezun + 3 yanıt yükleme betiği.

### Kimlik Doğrulama, Anket ve Admin
- `src/lib/auth.ts`: HMAC-SHA256 imzalı HTTP-only cookie oturumları (`mts_graduate_session`, `mts_admin_session`), `scrypt` şifre hash'leme.
- `src/lib/mail.ts`: `RESEND_API_KEY` varsa Resend API, `SMTP_HOST` varsa Nodemailer SMTP, ikisi de boşsa geliştirme konsol logu (`dev-log`).
- **Mezun akışı:** `/` (`LandingClient`) → `/giris` (`GraduateLoginClient`: Ad-Soyad + E-posta + Öğrenci No + Mezuniyet Yılı/Dönemi → 6 haneli OTP + KVKK onay kutusu) → `/anket` (`SurveyClient` + `QuestionField`: otomatik taslak kaydetme) → `/tesekkurler` (`ThanksClient`).
- **Yönetici akışı:** `/admin/giris` (`AdminLoginClient`) → `/admin` (`AdminOverviewClient`: KPI + özet grafikler + `AdminSettingsPanel`), `/admin/analiz` (`AdminAnalyticsClient`: tüm sorular + `CrossTabPanel` 2 soru çapraz tablosu + `"Diğer"` gruplama), `/admin/yanitlar` (`AdminResponsesClient`: akordiyon yanıt inceleme), `/admin/mezunlar` (`AdminGraduatesClient`: Excel/CSV toplu yükleme, tekil ekleme/e-posta düzenleme, hatırlatma maili), `/admin/rapor` (`AdminReportsClient`).
- **4 Rapor Dışa Aktarımı (`/api/admin/export`):**
  - `src/lib/exports/excel.ts` (`.xlsx`)
  - `src/lib/exports/csv.ts` (SPSS uyumlu UTF-8 BOM `.csv`)
  - `src/lib/exports/docx-report.ts` (`.docx`)
  - `src/lib/exports/pdf-report.ts` (grafikli `.pdf`, `DejaVuSans` / `DejaVuSerif` Türkçe karakter destekli)

### Görseller
- `public/brand/fbu-logo.png`: Navbar/rapor FBÜ logosu.
- `public/art/{thanks,ornament,seal,admin,empty,offline}.webp`: `Art.tsx` ile bağlanmış şeffaf gravür illüstrasyonlar.

---

## 4. Bilinen Geçici Parçalar ve Teknik Notlar

1. **Canlıya çıkmadan kaldırılacak geçici demo kodları** (`production`'da 404 dönse de temizlik için silinmesi önerilir):
   - `src/app/api/auth/demo-login/route.ts` + `src/app/giris/page.tsx` / `src/components/auth/GraduateLoginClient.tsx` içindeki `showDemoLogin`
   - `src/app/api/admin/demo-login/route.ts` + `src/app/admin/giris/page.tsx` / `src/components/admin/AdminLoginClient.tsx` içindeki `showDemoLogin`
2. **E-posta gönderimi (Resend vs Gmail SMTP):**
   - Vercel Marketplace `resend` entegrasyonu özel alan adı (`domain`) doğrulamasını zorunlu tutar. Şimdilik alan adı alınmayacaksa `src/lib/mail.ts` içindeki hazır SMTP desteği ile ücretsiz bir **Gmail + Uygulama Şifresi (`smtp.gmail.com:465`, `SMTP_SECURE=true`)** kullanılması planlanmıştır.
3. **Admin güvenliği:**
   - Neon ilk bağlantıda `.env` varsayılanıyla `admin@fbu.edu.tr` yöneticisini oluşturdu. `vercel --prod` öncesinde mutlaka Vercel env değişkenleri (`ADMIN_OWNER_EMAIL`, `ADMIN_OWNER_NAME`, `ADMIN_OWNER_PASSWORD`) ve Neon `admins` tablosu gerçek yönetici bilgileriyle güncellenmelidir.
4. **Temizlik / Git:**
   - `docs/media/logo3.png`, `public/brand/fbu-logo.png` ile birebir aynıdır (kopya).
   - `README.md` hâlâ ilk planlama metnindedir.
   - Uygulama kodları için henüz `git commit` / `git push` yapılmamıştır (yalnız kullanıcı açıkça istediğinde yapılır).

---

## 5. Öğretmenlerden Beklenen Açık Sorular (`docs/acik-sorular.md`)

1. 6 ayda bir tekrar kuralı: Sabit dönem (`2026-Güz` / `2027-Bahar`) mı, kişiye özel 180 gün mü?
2. ~600 kişilik mezun listesi (Excel/CSV sütunları + kişisel e-posta mı) ve whitelist zorunluluğu.
3. Resmi FBÜ KVKK aydınlatma metni (şu an `v0-placeholder`, Admin ayarlarından yapıştırılabilir).
4. Aylık gelir aralığı dilimleri (asgari ücret katı mı, sabit TL mi?) ve matris 11. madde ("DGS / lisansüstü") onayı.
5. Yetkili öğretmen (`owner` / `viewer`) e-posta adresleri.

---

## 6. Sıradaki Adımlar

1. Kullanıcının arayüz önizlemesini (`/`, `/giris`, `/anket`, `/admin`) onaylaması (örnek grafik görmek isterse geçici `--demo` verisiyle test edilip canlı öncesi temizlenebilir).
2. Gerçek yönetici e-posta/şifre ve e-posta gönderim (`Gmail SMTP` veya domain alınırsa `Resend`) bilgilerinin Vercel'e girilmesi + Neon `admins` tablosunun güncellenmesi.
3. Geçici demo girişlerinin kaldırılması (istenirse) ve `vercel --prod` ile canlı `.vercel.app` yayınına geçilmesi.
4. Öğretmenlerden gelen KVKK metni ve mezun Excel listesinin admin panelinden yüklenmesi.
