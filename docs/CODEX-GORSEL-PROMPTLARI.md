# Codex Görsel Üretim ve Entegrasyon Talimatı

> **Amaç:** Bu dosya, **Mezun Takip Sistemi** projesindeki eksik gravür illüstrasyonların Codex tarafından üretilip `public/art/*.webp` olarak projeye bağlanması için tek kaynak talimatıdır.
> **Not:** Ana sayfadaki sağ hero görseli için `public/brand/fbu-campus.png` zaten yerleştirildi (`LandingClient.tsx`); bu nedenle `hero.webp` üretilmeyecektir. Kalan **6 görsel** üretilecektir.

---

## 1. Tasarım Dili (`fildisi-kagit`)

Uygulama **yalnızca Açık Tema (Fildişi Kâğıt)** kullanır (koyu tema kaldırılmıştır). Yalnızca en alttaki `SiteFooter` (`src/components/ui/AppShell.tsx`) koyu `#141413` zemindedir; bu yüzden `seal` görseli koyu zemin uyumlu (fildişi mürekkep) üretilir.

- **Zemin / Yüzey:** `#f9f9f7` (kâğıt), `#ffffff` (kart)
- **Ana Mürekkep:** `#141413`
- **Vurgu (Kil Turuncusu):** `#d97757`
- **Yumuşak Şeftali Dolgu:** `#ebc9b7`
- **Sıcak Gri İkincil Çizgi:** `#87867f`
- **Stil:** 19. yüzyıl tıbbi/kartografik bakır baskı gravürünü andıran, elde çizilmiş gibi kendinden emin mürekkep çizgileri, gölgelerde ince tarama (hatching/cross-hatching), bol negatif alan, **sıfır metin/harf/rakam/logo**.

---

## 2. Ortak Prompt Kalıbı

### Açık Zeminli Görseller (`thanks`, `ornament`, `admin`, `empty`, `offline`)

Her görsel prompt'unun başına aşağıdaki ortak stil bloğunu ekle:

```text
Fine-art editorial illustration drawn like a hand-inked engraving: confident black ink (#141413) linework with subtle hatching and cross-hatching in the shadows (like a 19th-century medical or cartographic etching), slightly organic imperfect strokes, selective flat accent fills ONLY in terracotta clay (#D97757) and soft peach (#EBC9B7), tiny secondary line accents in warm grey (#87867F). Calm, intelligent, generous negative space, single centered subject, NO text, NO letters, NO numbers, NO logos, NO faces, NO UI chrome, NO frame, NO border, NO drop shadow, NO ground shadow, NO background scene. Pure flat solid white (#FFFFFF) background. Crisp edges, print quality.
```

### Koyu Footer Mührü (`seal`)

`SiteFooter` (`bg-[#141413]`) üzerinde kullanılacağı için `seal` aşağıdaki koyu zemin stil bloğuyla üretilir:

```text
Fine-art editorial illustration drawn like a hand-inked engraving on a dark background: confident warm ivory (#FAF9F5) ink linework with subtle hatching and cross-hatching, slightly organic imperfect strokes, selective flat accent fills ONLY in terracotta clay (#D97757) and muted warm terracotta (#8A5A44). Calm, intelligent, generous negative space, single centered subject, NO text, NO letters, NO numbers, NO logos, NO faces, NO UI chrome, NO drop shadow, NO ground shadow, NO background scene. Pure flat solid black (#000000) background. Crisp edges, print quality.
```

---

## 3. Üretilecek 6 Görsel ve Konu Prompt'ları

| # | Dosya Adı | Oran / Çıktı Boyutu | Konu Prompt'u (Ortak stilden sonra ekle) | Kullanıldığı Yer |
|---|---|---|---|---|
| 1 | `thanks` | `1:1` (`720×720` `.webp`) | `Square 1:1 composition, subject fills about 70% of the canvas. Subject: An engraved folded paper envelope sealed with a round terracotta clay (#D97757) wax-like stamp showing a minimalist eight-pointed spark, with two small delicate olive or laurel sprigs resting calmly beside the envelope.` | `src/components/survey/ThanksClient.tsx` (`size={200}`) |
| 2 | `ornament` | `2:1` yatay (`720×360` `.webp`) | `Wide 2:1 horizontal composition with generous empty space on left and right. Subject: A small symmetrical cartographer's section ornament shaped like a minimalist eight-pointed spark in black ink (#141413) with a terracotta clay (#D97757) center dot, flanked horizontally by two fine symmetrical botanical flourishes.` | `src/components/landing/LandingClient.tsx` (`.ornament` bölüm ayırıcı) |
| 3 | `seal` | `1:1` (`360×360` veya `720×720` `.webp`) — **Koyu Zemin Kalıbı Kullan** | `Square 1:1 composition, subject fills about 75% of the canvas. Subject: A round engraved academic-style seal with a double thin circular border in warm ivory (#FAF9F5); inside, a stylized Star of Life medical emblem woven with six small connected alumni network nodes, selective terracotta clay (#D97757) node accents, no text, flat print style.` | `src/components/ui/AppShell.tsx` (`SiteFooter`, `#141413` zemin, `size={64}`) |
| 4 | `admin` | `1:1` (`720×720` `.webp`) | `Square 1:1 composition, subject fills about 70% of the canvas. Subject: A delicate engraved brass-and-ink compass divider standing calmly above three clean engraved statistical bar columns, the middle bar accented in terracotta clay (#D97757) and soft peach (#EBC9B7), subtle fine constellation guide lines behind.` | `src/components/admin/AdminAnalyticsClient.tsx` (başlık yanı) |
| 5 | `empty` | `1:1` (`720×720` `.webp`) | `Square 1:1 composition, subject fills about 70% of the canvas. Subject: A minimal wooden-clip clipboard holding a single blank ivory paper sheet, an engraved fountain pen resting diagonally across it, one tiny terracotta clay (#D97757) spark beside the clip.` | `AdminResponsesClient.tsx` ve `AdminGraduatesClient.tsx` (kayıt/sonuç yok durumu) |
| 6 | `offline` | `1:1` (`720×720` `.webp`) | `Square 1:1 composition, subject fills about 70% of the canvas. Subject: An engraved neatly folded paper map sheet beside a small classic stethoscope chestpiece resting calmly on the surface, one small terracotta clay (#D97757) spark near the bell.` | `src/app/not-found.tsx` (özel 404 sayfası) |

---

## 4. Codex'in Uygulama Adımları

1. **Ham PNG üretimi:**
   - Üretilen ham PNG dosyalarını `assets-src/illustrations/<ad>.png` altına kaydet (`assets-src/` `.gitignore` içindedir).
   - Görsellerin gerçekten beyaz (`#FFFFFF`) veya `seal` için siyah (`#000000`) düz zeminde, metinsiz ve tasarım paletine uygun olduğunu kontrol et.

2. **Şeffaf Zemin + WebP Dönüşümü (`public/art/`):**
   - Her görselin dış arka planını (açık olanlarda `#FFFFFF` yakınını, `seal` için `#000000` yakınını) yumuşak kenar geçişiyle **şeffaf alfaya** çevir.
   - Boyutlandır ve `cwebp` (sistemde `/opt/homebrew/bin/cwebp` kurulu) ile `public/art/<ad>.webp` olarak kaydet:
     - `thanks.webp`, `admin.webp`, `empty.webp`, `offline.webp`: max `720×720`
     - `ornament.webp`: `720×360`
     - `seal.webp`: `360×360` (veya `720×720`)

3. **`src/components/ui/Art.tsx` Güncellemesi:**
   - `READY_ART` içinde üretilen tüm görselleri aktif et:
     ```ts
     const READY_ART: Partial<Record<ArtName, boolean>> = {
       thanks: true,
       ornament: true,
       seal: true,
       admin: true,
       empty: true,
       offline: true,
     }
     ```
   - **Önemli stil düzeltmeleri (`Art.tsx` içinde dikkat et):**
     - `seal` koyu `#141413` `SiteFooter` içinde durduğu için `mix-blend-multiply` **uygulama** (yoksa görünmez olur!). Şeffaf alfa ile doğrudan render et (gerekirse `mix-blend-screen` kullan).
     - `ornament` `2:1` yatay olduğu için kare `width={size} height={size}` yerine `width={56} height={28}` (veya `2:1` oran) kullan ve yatay uçların kesilmemesi için dairesel `.art-ink` radial maskesini `ornament` üzerinde uygulama.

4. **Henüz Bağlanmamış `Art` Slotlarını Yerleştir:**
   - `src/components/admin/AdminResponsesClient.tsx` (`filtered.length === 0` kutusu): `<Art name="empty" size={140} />` ekle.
   - `src/components/admin/AdminGraduatesClient.tsx` (`filtered.length === 0` durumu): `<Art name="empty" size={140} />` ekle.
   - `src/components/admin/AdminAnalyticsClient.tsx` (üst başlık yanı, masaüstünde): `<Art name="admin" size={96} />` ekle.
   - `src/app/not-found.tsx` oluştur: `PublicShell` içinde `<Art name="offline" size={180} />` + TR/EN uyumlu sade 404 mesajı ve ana sayfaya dönüş butonu koy.

5. **Doğrulama:**
   - `npx tsc --noEmit` ve `npm test` çalıştır.
   - Next.js dev sunucusunda `/`, `/tesekkurler` (veya `/olmayan-sayfa` 404) ve footer üzerindeki görsellerin arka planla temiz bütünleştiğini, `seal`'in `#141413` footer'da net göründüğünü kontrol et.
