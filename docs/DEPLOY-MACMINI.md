# Mac mini Ev Sunucusu (`macmini-server`) Dağıtım Rehberi

Bu proje Vercel veya harici bulut veritabanı **kullanmaz**. Uygulama (Next.js standalone) ve veritabanı (PostgreSQL 16) tamamen `macmini-server` üzerindeki Docker'da koşacak şekilde tasarlandı.

> **Donanım notu:** Mac geliştirme makinesi **ARM (`arm64`)**, `macmini-server` ise **Intel (`amd64 / x86_64`)** mimarisindedir. Image'lar mutlaka sunucuda (`docker --context macmini` / `dsrv`) ya da `--platform linux/amd64` ile derlenmelidir.

---

## 1. Sunucu Kurallarına Uyum

- Tüm konteyner portları yalnızca **`127.0.0.1`** arayüzüne bağlanır (`127.0.0.1:3474:3000`). PostgreSQL dışa port açmaz, yalnızca Docker iç ağında (`mezun_net`) çalışır.
- Yönetim/önizleme Tailscale üzerinden `tailscale serve` ile verilir (`tailscale funnel` asla kullanılmaz).
- Herkese açık internet yayını için yalnızca `cloudflared` (Cloudflare Tunnel) `http://127.0.0.1:3474` hedefine yönlendirilir.

---

## 2. Ortam Değişkenleri (`.env`)

Sunucuda proje klasöründe (örn. `/opt/mezun-takip/.env`) aşağıdaki değişkenleri doldurun:

```env
POSTGRES_PASSWORD=<guclu-rastgele-sifre>
SESSION_SECRET=<en-az-32-karakter-guclu-rastgele-anahtar>
APP_BASE_URL=https://mezun.alanadiniz.com

# İlk program başkanı (owner) yönetici hesabı (seed için)
ADMIN_OWNER_EMAIL=baskan@fbu.edu.tr
ADMIN_OWNER_NAME=Program Başkanı
ADMIN_OWNER_PASSWORD=<guclu-admin-sifresi>

# E-posta gönderimi (SMTP veya Resend API)
MAIL_FROM="FBÜ İlk ve Acil Yardım <noreply@alanadiniz.com>"
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Cloudflare Tunnel (herkese açık yayın açılacaksa)
CLOUDFLARE_TUNNEL_TOKEN=
```

---

## 3. Sunucuya İlk Kurulum ve Çalıştırma

### Seçenek A: Mac'ten `macmini` Docker context'i ile (`dsrv`)

> **Bu komutlar Mac terminalinde çalışır (`kutluhangil@Kutluhans-Mac-Mini`):**

```bash
# 1) Kodları sunucudaki /opt/mezun-takip altına gönder (ilk kez)
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  /Volumes/ProjectClaude/Mezun-Takip-Sistemi/ \
  kutluhan@macmini-server:/opt/mezun-takip/
```

> **Bu komutlar sunucuda çalışır (`ssh kutluhan@macmini-server`):**

```bash
cd /opt/mezun-takip
cp .env.example .env
# .env dosyasını nano/vi ile düzenleyip şifreleri ve ADMIN_OWNER_* değerlerini gir

docker compose up -d --build
docker compose exec app node scripts/migrate-and-seed.mjs
```

### Tailscale ile Özel Önizleme (Eşiniz ve Sizin Testiniz İçin)

> **Sunucuda çalışır (`kutluhan@macmini-server`):**

```bash
sudo tailscale serve --bg --https=8443 http://127.0.0.1:3474
```

Açılan adres (yalnız Tailnet içinden): `https://macmini-server.taild883a6.ts.net:8443`

---

## 4. Mezunlara Açma (Cloudflare Tunnel)

Öğretmenlerden mezun listesi ve KVKK onayı gelip mezunlara açılacağı zaman:
1. Cloudflare Zero Trust panelinde bir Tunnel oluşturup Public Hostname'i `http://app:3000` (veya host üzerinde `http://127.0.0.1:3474`) hedefine bağlayın.
2. Token'ı `.env` içindeki `CLOUDFLARE_TUNNEL_TOKEN` satırına yazın.
3. Sunucuda tünel profilini başlatın:

```bash
docker compose --profile tunnel up -d
```

---

## 5. Yedekleme (Veri Kaybına Karşı)

Hiçbir yanıt silinmez; düzenli yedek için sunucuda:

```bash
docker compose exec -T postgres pg_dump -U mezun mezun_takip > "backup-$(date +%F).sql"
```
