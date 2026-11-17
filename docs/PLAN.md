# Mezun Takip Sistemi — Güncel Mimari ve Uygulama Planı (2026-11-15)

## 1. Kapsam ve Kesinleşen Kararlar
- **Kurum:** Fenerbahçe Üniversitesi, Sağlık Hizmetleri Meslek Yüksekokulu, İlk ve Acil Yardım Programı (~600 mezun).
- **Resmi başlık:** İlk ve Acil Yardım Mezun Takip Sistemi (FBÜ resmi logosu: `public/brand/fbu-logo.png`).
- **Dil:** Tam iki dilli (**Türkçe + İngilizce**) — tüm arayüz, giriş, anket soruları/seçenekleri, admin paneli ve 4 rapor çıktısı.
- **Altyapı:** Vercel ve Supabase cloud **yok**. Tüm uygulama ve veritabanı `macmini-server` (Intel x86_64 Docker) üzerinde koşacak:
  - Next.js App Router (standalone) + Tailwind CSS v4 + PostgreSQL 16 + SMTP/Resend.
  - Konteynerler yalnız `127.0.0.1`'e bağlı (`127.0.0.1:3474:3000`); Tailscale önizleme + ileride Cloudflare Tunnel.
- **Tasarım:** `fildisi-kagit` skill'i (`~/.claude/skills/fildisi-kagit`) + mobil öncelikli başparmak ergonomisi (`>= 44px` hedefler, alt sabit çubuk, kusursuz 375 px responsive deneyim).
- **Görseller:** `docs/GEMINI-GORSEL-PROMPTLARI.md` ile 10 gravür × açık/koyu üretildi (2026-11-17), `public/art/` altında.

## 2. Giriş, KVKK ve Veri Politikası
- **Mezun girişi:** Ad-Soyad + Kişisel E-posta + Öğrenci No (zorunlu) + Mezuniyet yılı ve dönemi → E-postaya 6 haneli doğrulama kodu (OTP) → KVKK onay kutusu → Anket.
- **Mezun listesi (S8):** Yalnız öğretmenin yüklediği listedeki e-postalar (admin ayarından liste gelene kadar esnetilebilir; öğrenci e-postası değişirse admin listeden günceller).
- **Veri koruma:** Hiçbir gönderilen yanıt silinmez/üzerine yazılmaz (`responses` tablosu dönem/sıra bazlı eklemeli çalışır; taslaklar ayrı tutulur).
- **KVKK ve Mezun Listesi:** Resmi metin ve 600 kişilik Excel gelene kadar boş/yapılandırılabilir bırakıldı (bkz. `docs/acik-sorular.md`).

## 3. Anket (30 Soru, TR + EN)
- Orijinal 25 PDF sorusu İlk ve Acil Yardım ön lisansına uyarlandı:
  - Telefon ve Yüksek Lisans/Doktora kaldırıldı.
  - DGS ile lisans tamamlama eklendi (`Tamamladım / Devam ediyorum / Planlıyorum / Hayır`).
  - Memnuniyet ölçeği 0–10 (11 seçenek).
  - Güçlü yönler (9 orijinal madde + Diğer, çoklu max 3) ve Zayıf yönler (11 orijinal madde + Diğer, çoklu max 3).
  - Geliştirilecek yönler (çoklu sınırsız).
  - Çalışmayanlar için tüm iş sorularında `"Çalışmıyorum"` seçeneği; önceki işler ve kurs/sertifika zorunlu + `"Yok"` seçeneği.
  - Yapılandırılmış alanlar: Mezuniyet yılı/dönemi, 81 il seçicisi, yıl+ay süre seçici.
  - S29'dan gelen 5 yeni soru eklendi (ilk işi bulma yolu, paramedikliğe devam, yurt dışı deneyimi/isteği, aylık gelir aralığı, açık uçlu öneriler).

## 4. Admin Paneli ve Çıktılar
- **Roller:** `owner` (Program Başkanı — tam yetki) ve `viewer` (diğer öğretmenler — salt okuma).
- **Analitik:** KPI özetleri, istihdam oranı, mezuniyet yılı / çalışma durumu / dönem filtreleri, tüm soru grafikleri, 100% yığılmış Likert grafiği, 0–10 histogram, benzer `"Diğer"` cevaplarını gruplama, **2 soru çapraz karşılaştırma matrisi**.
- **Mezun yönetimi:** Excel/CSV yükleme, e-posta düzeltme, dolduran/doldurmayan listesi, tek tuşla hatırlatma e-postası.
- **4 Rapor formatı (TR/EN):** Excel (`.xlsx`), CSV (SPSS UTF-8 BOM), Word (`.docx`) ve grafikli PDF (`.pdf`).

## 5. Fazlar
- **F0 (Tamam):** `fildisi-kagit` skill'i ve belgeler (`acik-sorular.md`, `GEMINI-GORSEL-PROMPTLARI.md`, `DEPLOY-MACMINI.md`).
- **F1:** Next.js + Tailwind v4 kurulumu, `fildisi-kagit` bileşenleri, dil/tema altyapısı, karşılama sayfası.
- **F2:** PostgreSQL şeması, migrasyonlar, TR/EN 30 soruluk anket JSON'u, seed & OTP/auth/mail katmanı.
- **F3:** Mobil öncelikli öğrenci girişi (OTP + KVKK slotu) ve çok adımlı otomatik taslaklı anket + teşekkür.
- **F4:** Admin paneli (genel bakış, grafikler, çapraz analiz, yanıtlar, mezun listesi + hatırlatma + 4 dışa aktarım).
- **F5:** Docker (`Dockerfile` + `docker-compose.yml`), birim testleri (Vitest) ve tarayıcı/mobil doğrulama.
