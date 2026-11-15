# Kalan İşler ve Claude Code Devir Listesi (2026-11-15)

> **Bağlam:** Projenin tam mimarisi ve bugüne kadar yapılanlar için önce [DEVIR-NOTU.md](DEVIR-NOTU.md) dosyasına bak. Bu dosya yalnızca **eksik, yarım kalan veya canlıya tam açmadan önce yapılması gereken** işleri içerir.

## 0. Akşam turunda tamamlananlar (commit edilmedi, deploy edilmedi)

- **Admin giriş kilidi:** `src/lib/login-throttle.ts` + `login_attempts` tablosu (`001_init.sql`). Aynı e-posta için 15 dakikada 5, aynı IP için 20 başarısız denemede `429`. Yerelde doğrulandı (6. deneme `429`).
- **OTP saatlik sınır:** `request-otp` aynı e-posta için saatte en fazla 8 kod (spam ve e-posta kotası koruması).
- **Üretimde varsayılan admin yok:** `src/lib/db.ts` artık production'da `ADMIN_OWNER_EMAIL` ve `ADMIN_OWNER_PASSWORD` tanımlı değilse yönetici oluşturmaz.
- **`src/app/error.tsx`** eklendi (TR/EN, `offline` illüstrasyonu, "Tekrar dene").
- **README** gerçek duruma göre yeniden yazıldı; `docs/media/logo3.png` kopyası silindi.
- **Temizlik:** Neon'daki test mezunu ve OTP kayıtları silindi (`graduates`, `responses`, `otp_codes`, `login_attempts` boş; `admins` = 1).
- **Uçtan uca doğrulama (yerel, Neon):** OTP isteği, yanlış kod `400`, doğru kod ile giriş, `/anket` ve taslak `200`, oturumsuz `/api/admin/dashboard` ve `/export` `401`.

> [!WARNING]
> **Neon'daki varsayılan yönetici hâlâ duruyor:** `admin@fbu.edu.tr` / `ChangeMe123!`. Canlı adres şu an Vercel Deployment Protection arkasında, ama korumayı kapatmadan önce bu hesap gerçek bilgilerle değiştirilmeli (aşağıdaki bölüm 1).

---

## 1. Acil Güvenlik ve Yönetici Ayarları (Canlı URL İçin Zorunlu)

- **Neon `admins` tablosundaki varsayılan yöneticiyi güncelle:**
  - Yerel test sırasında `ensureDbReady()` ilk açılışta `.env` varsayılanı ile `admin@fbu.edu.tr` hesabını oluşturdu.
  - **Yapılacak:** Kutluhan'dan gerçek yönetici (`owner`) e-posta + güçlü şifre (ve varsa `viewer` öğretmen e-postaları) alınıp:
    1. Vercel ortam değişkenlerine (`ADMIN_OWNER_EMAIL`, `ADMIN_OWNER_NAME`, `ADMIN_OWNER_PASSWORD`) eklenmeli (`production` ve `preview`).
    2. Neon'daki `admins` tablosunda eski varsayılan kayıt güncellenmeli / silinmeli (`scrypt` hash `src/lib/auth.ts` içindeki `hashPassword` ile üretilir).
- **`APP_BASE_URL` ortam değişkenini eşitle:**
  - Canlı `.vercel.app` adresi kesinleşince Vercel env üzerinde `APP_BASE_URL` olarak ayarlanmalı (`src/lib/auth.ts` içindeki `secure` cookie bayrağı ve hatırlatma linkleri buna bakar).

---

## 2. E-posta Gönderimi (OTP + Hatırlatma)

- **Durum:** Vercel Marketplace `resend` entegrasyonu özel alan adı (`domain`) doğrulaması zorunlu tutuyor. Kutluhan şu an alan adı almayacak.
- **Yapılacak (Alan Adısız Çözüm):** `src/lib/mail.ts` zaten Nodemailer SMTP destekliyor.
  - Kutluhan bir **Gmail + Uygulama Şifresi (App Password)** oluşturunca Vercel `production` / `preview` ortam değişkenlerine eklenecek:
    - `MAIL_FROM`
    - `SMTP_HOST=smtp.gmail.com`
    - `SMTP_PORT=465`
    - `SMTP_SECURE=true`
    - `SMTP_USER`
    - `SMTP_PASS`
  - Ardından canlı ortamda `/giris` üzerinden gerçek 6 haneli OTP e-postası gönderimi ve `/admin/mezunlar` hatırlatma e-postası test edilecek.

---

## 3. Geçici Kodların Kaldırılması (Önizleme Bitince)

Aşağıdaki geçici önizleme parçaları `NODE_ENV === 'production'` altında zaten kapalı (404 döner ve gizlenir), ancak kullanıcı incelemeyi bitirdiğinde kod temizliği için tamamen silinmeli:

- `src/app/api/auth/demo-login/route.ts`
- `src/app/giris/page.tsx` ve `src/components/auth/GraduateLoginClient.tsx` içindeki `showDemoLogin` / `handleDemoLogin`
- `src/app/api/admin/demo-login/route.ts`
- `src/app/admin/giris/page.tsx` ve `src/components/admin/AdminLoginClient.tsx` içindeki `showDemoLogin` / `handleDemoLogin`

---

## 4. Canlı Vercel Serverless Doğrulaması

- **Test edilmesi gerekenler (canlı `.vercel.app` üzerinde):**
  1. `GET /api/health` → `{"ok":true,"db":"connected"}`
  2. `GET /`, `GET /giris`, `GET /admin/giris`, `GET /olmayan-sayfa` (404 ve görseller)
  3. Giriş sonrası `/anket` taslak kaydı + anket gönderimi + `/tesekkurler` (`thanks.webp`)
  4. `/admin/rapor` üzerinden **4 dışa aktarımın** (`.xlsx`, `.csv`, `.docx`, `.pdf`) Vercel Serverless üzerinde sorunsuz indiğini doğrulamak — özellikle `pdfkit` + `dejavu-fonts-ttf` ve `public/brand/fbu-logo.png` dosya yollarının (`next.config.ts` → `outputFileTracingIncludes`) production bundle içinde çalıştığını kontrol etmek.
  5. İstenirse `--demo` örnek verisiyle (`/admin`, `/admin/analiz`) grafik/çapraz tablo önizlemesi yapıp **canlı açılış öncesi örnek kayıtları DB'den temizlemek**.

---

## 5. Öğretmenlerden Beklenen İçerik ve Kararlar (`docs/acik-sorular.md`)

- **Mezun listesi:** ~600 kişilik Excel/CSV geldiğinde `/admin/mezunlar` üzerinden içeri aktarılacak; whitelist zorunluluğu ayarı admin panelinden açılacak.
- **Resmi KVKK metni:** Şu an `src/lib/server-data.ts` içinde `v0-placeholder` ve boş metin var; resmi FBÜ metni gelince admin ayarlarından girilecek (TR + EN).
- **6 ayda bir tekrar kuralı:** Sabit takvim dönemi (`2026-Güz` / `2027-Bahar`) mi yoksa kişiye özel 180 gün mü? Admin ayarlarından netleştirilecek.
- **Aylık gelir dilimleri & Matris 11. madde:** Asgari ücret katı vs sabit TL dilimleri ve "DGS / lisansüstü" ifadesi öğretmen onayıyla kesinleşecek (`data/surveys/mezun-bilgi-2026.json`).

---

## 6. Küçük Temizlik ve Dokümantasyon

- ~~`docs/media/logo3.png` kopya~~ silindi, ~~README~~ güncellendi, ~~`error.tsx`~~ eklendi (bölüm 0).
- Hero (`docs/media/hero.svg`) hâlâ "concept" afişi (örnek sorular ve sayılar). İstenirse `readme-tema` skill'iyle gerçek ürün ekranına göre yeniden üretilebilir.
- Demo butonları kullanılırsa Neon'a "Demo Mezun" satırı eklenir; canlı açılıştan önce `graduates` tablosunda `full_name LIKE 'Demo Mezun%'` satırlarını sil.
