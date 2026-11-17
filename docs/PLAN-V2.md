# Plan v2 — İnceleme düzeltmeleri + Fildişi Kâğıt yeniden tasarımı (2026-11-17)

Kaynak: [INCELEME-RAPORU-2026-11-17.md](INCELEME-RAPORU-2026-11-17.md). Tasarım dili: `fildisi-kagit` skill'i (Neural-Vault Website, `localhost:4747`).
Geliştirme yerel Postgres'e karşı yapılır (`docker run mezun-pg … -p 127.0.0.1:5433:5432`); canlı Neon'a dokunulmaz.
Commit/push yok (Kutluhan "commit at" diyene kadar).

**Durum (2026-11-17):** Faz 1–9 tamam, Gemini gravürleri (10 × açık/koyu) yerleştirildi. `npm run check` temiz, `next build` temiz, uçtan uca API testi 36/36.

## Faz 1 — Güvenlik çekirdeği
- [x] G1 Çift gönderim: kısmi benzersiz index (period modu) + uygunluk kontrolü transaction içinde, mezun satırı `FOR UPDATE`, ihlalde `409`
- [x] G2 CSV + Excel formül kaçışı (`= + - @ \t \r`)
- [x] G3 Güvenlik başlıkları (CSP, XFO, nosniff, Referrer, Permissions), `poweredByHeader: false`, `robots.txt`, admin `noindex`
- [x] G4 Uzak DB'de `rejectUnauthorized: true`
- [x] G10 `/api/health` hata mesajı gizleme, sahte hash ile sabit süreli admin girişi

## Faz 2 — Kötüye kullanım koruması
- [x] G5 Kilit `e-posta + IP` çiftine, IP kilidi ayrı
- [x] G6 Atomik OTP deneme sayacı + tek kullanımlık tüketim
- [x] G7 OTP isteğinde IP başına saatlik sınır (`otp_codes.ip`)
- [x] G8 Cevap gövdesi doğrulama: yalnız tanımlı soru id'leri, seçenek değerleri, uzunluk ve gövde boyutu sınırı
- [x] Ortak `rate-limit` / `request` yardımcıları
- [x] `nodemailer@^10` yükseltmesi, transporter yeniden kullanımı

## Faz 3 — Oturum, yönetici hesapları, denetim
- [x] G9 `admins.session_version` + `graduates.session_version`; çıkış/şifre değişiminde artış
- [x] "Şifremi değiştir" (her admin), yeni admin şifresi ≥ 12, mevcut e-postayı sessizce ezmeme
- [x] `audit_logs` tablosu + kritik eylemlerin kaydı (giriş, ayar, admin, içe aktarma, export, hatırlatma, anonimleştirme) + ayarlarda son kayıtlar listesi

## Faz 4 — Performans ve ölçek
- [x] P1 Migration'ı runtime'dan çıkar: `schema_migrations` tablosu, sürümlü migration dosyaları, `npm run db:migrate`; runtime yalnız "migration uygulandı mı" bayrağına bakar (bir kez)
- [x] P2 Hatırlatma: partili (25'erli) gönderim, aynı gün hatırlatılanı atla, `maxDuration`
- [x] P3 Toplu INSERT (`jsonb_each` / `unnest`) taslak, gönderim, içe aktarma
- [x] P4 Admin özet sayfası sadece özet alır (cevaplar istemciye gitmez)
- [x] P5 Logo önbelleği, temizlik cron'u (`/api/cron/cleanup` + `vercel.json`). Font alt kümesi gerekmedi: Fontsource `unicode-range` ile yalnız kullanılan alt kümeyi indiriyor

## Faz 5 — KVKK ve veri
- [x] KVKK taslak metnini (`data/kvkk-aydinlatma-taslak.json`) varsayılan yap; sürüm değişince mezundan yeniden onay
- [x] Mezun anonimleştirme eylemi (owner) — yanıtlar istatistik için kalır
- [x] `consents.ip_hint` maskeleme
- [x] Export'ta "anonim" seçeneği
- [x] Mezun listesi Excel şablonu indirme + içe aktarma önizlemesi (kaydetmeden önce yeni/güncel/atla sayısı)
- [x] Whitelist kapalıyken uyarı bandı (admin)
- [ ] Yedek planı → isteğe bağlı listeye taşındı (KALAN-ISLER-DEVIR §4); Neon dalı/pg_dump kararı Kutluhan'da

## Faz 6 — Kod kalitesi ve test
- [x] Demo giriş kodlarını sil (2 route + 2 istemci)
- [x] Kopya hash fonksiyonlarını birleştir, `getEligibility` yardımcısı, draft sorgusu tek yerde
- [x] ESLint (`eslint-config-next`), `lint` script'i
- [x] Testler: CSV kaçışı, cevap gövdesi doğrulama, uygunluk, rate-limit saf fonksiyonları
- [x] GitHub Actions CI (`tsc + lint + vitest + audit`)
- [x] Proje `AGENTS.md` kuralları

## Faz 7 — Fildişi Kâğıt yeniden tasarımı (mobil öncelikli)
- [x] Token'lar + koyu tema (`data-theme`, Açık/Koyu/Sistem seçici, FOUC önleyici satır içi script)
- [x] `TopBar` (marka + kapsül menü + dil + tema), `MobileNav` (60px başparmak menüsü), koyu `Footer`
- [x] Ana sayfa: ortalı kahraman (gravür + serif başlık + birincil buton), `Section` + `.ornament` ile "Nasıl çalışır", "Neden önemli", SSS — **kampüs görseli kaldırılır**
- [x] Giriş (OTP): kart yerine sakin kâğıt formu, mono OTP kutuları, `.shake`
- [x] Anket: mobilde tam genişlik seçenek satırları (≥48px), sabit alt İleri/Geri çubuğu, ilerleme şeridi, otomatik kayıt göstergesi
- [x] Teşekkürler + 404 + hata sayfaları
- [x] Admin: kapsül menü, özet kartları, tablolar mobilde kart listesi
- [x] `Art` bileşeni açık/koyu çift görsel desteği (20/20 gravür geldi, geçici SVG yedekleri kaldırıldı)
- [x] Ekran görüntüsü kontrolü (390px + 1440px, açık + koyu)

## Faz 8 — Gemini görsel prompt dosyası
- [x] `docs/GEMINI-GORSEL-PROMPTLARI.md`: ortak stil, her görsel için açık + koyu prompt, dosya adı, boyut, nereye konacağı; okul görseli yerine kahraman gravürü

## Faz 9 — Doğrulama ve devir
- [x] `tsc`, `lint`, `vitest`, `next build`
- [x] Yerel uçtan uca: OTP → anket → gönderim → admin → 4 export
- [x] Canlı için yapılacaklar listesi (migration komutu, yeni env'ler, cron) `KALAN-ISLER-DEVIR.md`'ye
