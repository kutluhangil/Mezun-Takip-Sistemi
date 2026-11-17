# Gemini Görsel Prompt'ları — Mezun Takip Sistemi

> Sitenin tüm gravür illüstrasyonları için tek kaynak. Tasarım dili: **Fildişi Kâğıt** (fildişi kâğıt zemin, mürekkep çizgi, tek kil turuncusu vurgu). Görseller hem açık hem koyu temada kullanılır, bu yüzden her görselin **iki sürümü** var.
>
> Okul binası fotoğrafı kaldırıldı; ana sayfanın ortasında artık `hero` gravürü duruyor.

## Nasıl kullanılır (her görsel için 4 adım)

1. Gemini'de **yeni bir sohbet** aç, **tek seferde tek görsel** iste.
2. Aşağıdaki **Ortak stil** bloğunu yapıştır, altına görselin **Konu** satırını ekle ve gönder.
3. Beğendiğin sonucu indir ve `assets-src/illustrations/` klasörüne tablodaki **dosya adıyla** kaydet (ör. `hero.png`).
4. Aynı sohbette **Koyu sürüm** bloğunu gönder, çıkanı `-dark` ekiyle kaydet (ör. `hero-dark.png`).

Hepsi bitince proje klasöründe tek komut:

```bash
npm run art
```

Bu komut düz beyaz/siyah zemini silip şeffaf `.webp` yapar, `public/art/` klasörüne koyar ve `src/data/art-manifest.json` dosyasını günceller. Site görseli kendiliğinden kullanmaya başlar; manifestte olmayan görsel hiç çizilmez (kırık görsel hiç çıkmaz). Koyu sürümde çizimin içinde kalan saf siyah boşluklar (halka içi, mühür zemini) da silinir.

> **Durum (2026-11-17):** 10 görselin açık + koyu sürümünün tamamı üretildi ve `public/art/` altında yayında.

> **Neden şeffaf değil de düz zemin istiyoruz?** Gemini gerçek şeffaflık üretmiyor; "transparent" yazınca resme dama deseni basıyor. Düz beyaz (koyuda düz siyah) zemin + belirgin kontur isteyip zemini script'e sildirmek en temiz sonucu veriyor.

---

## Ortak stil (açık sürüm) — her prompt'un başına

```text
Fine-art editorial illustration drawn like a hand-inked copperplate engraving: confident dark ink lines (#141413) with fine hatching and cross-hatching in the shadows, like a 19th-century medical atlas or cartographic etching. Slightly organic, imperfect hand-drawn strokes. A clear, continuous dark outline around the whole subject. Selective flat color fills ONLY in terracotta clay #D97757 and soft peach #EBC9B7, tiny accents of warm grey #87867F. Paper-white areas inside the drawing in warm off-white #F5F2EC (never pure white). Calm, intelligent mood, generous negative space, one single centered subject.
Isolated on a perfectly flat, solid, pure white #FFFFFF background. No checkerboard, no texture, no gradient, no vignette, no ground shadow, no drop shadow.
Absolutely no text, letters, numbers, logos, faces, UI elements, frames or borders.
Square 2048x2048, the subject fills about 70% of the canvas, crisp print-quality edges.
```

## Koyu sürüm — aynı sohbette, açık sürümden sonra

```text
Now draw the exact same illustration as a dark-mode variant: identical composition and subject. Ink lines in warm ivory #FAF9F5 instead of dark ink, hatching in ivory too. Keep terracotta clay #D97757 fills; replace soft peach with muted terracotta #8A5A44; off-white areas become #3B2A22. Isolated on a perfectly flat, solid, pure black #000000 background. No checkerboard, no texture, no gradient, no glow, no shadow. Still no text, letters, numbers or logos.
```

---

## Görsel listesi

| # | Dosya adları | Sitede nerede | Oran |
|---|---|---|---|
| 1 | `hero.png` · `hero-dark.png` | Ana sayfa, başlığın üstündeki büyük gravür | Kare |
| 2 | `login.png` · `login-dark.png` | Mezun girişi (e-posta kodu) | Kare |
| 3 | `privacy.png` · `privacy-dark.png` | KVKK sayfası ve yeniden onay ekranı | Kare |
| 4 | `waiting.png` · `waiting-dark.png` | "Bu dönem anketi tamamladınız" ekranı | Kare |
| 5 | `thanks.png` · `thanks-dark.png` | Gönderim sonrası teşekkür ekranı | Kare |
| 6 | `empty.png` · `empty-dark.png` | Boş liste, 404, anket kapalı | Kare |
| 7 | `admin.png` · `admin-dark.png` | Öğretmen girişi ve boş panel | Kare |
| 8 | `offline.png` · `offline-dark.png` | Hata sayfası | Kare |
| 9 | `seal.png` · `seal-dark.png` | Footer mührü (footer hep koyu: `seal-dark` kullanılır) | Kare |
| 10 | `ornament.png` · `ornament-dark.png` | Bölüm başlıklarının üstündeki küçük süs | Geniş 2:1 |

> 5–9 numaralılar sitede zaten var ama yalnız açık sürümleri mevcut. Koyu temada da güzel görünmeleri için ikisini birlikte yeniden üret. Eski `seal` koyu zeminle üretilmişti; yeni kurala göre `seal.png` açık, `seal-dark.png` koyu olacak.

### 1. hero — ana sahne

```text
Subject: A classical six-armed Star of Life emblem drawn as an engraving, its arms filled with terracotta clay and finely hatched. Through its center rises a Rod of Asclepius with a single serpent. Resting on top of the staff, a modest graduation cap with a small hanging tassel. Behind the emblem, two slender laurel branches curve up from the bottom on both sides. Beneath it all, a fine ECG heartbeat line runs horizontally and fades softly at both ends. Balanced, symmetrical, dignified.
```

### 2. login — e-posta ile kod

```text
Subject: An engraved paper envelope seen from the front, its flap slightly open. A small folded card rises out of it, showing a neat row of six small round dots (three filled with terracotta clay, three empty circles). Three short radiating spark lines above the card suggest a fresh arrival. Fine hatching on the envelope's inner shadow.
```

### 3. privacy — KVKK ve gizlilik

```text
Subject: A heraldic shield drawn as an engraving, half of its surface filled with soft peach and finely hatched, with a small closed padlock in terracotta clay at its center. Behind the shield, the corner of a folded document with faint horizontal ruled lines (no writing). Calm, trustworthy, protective.
```

### 4. waiting — bir sonraki dönemi bekleme

```text
Subject: An engraved brass hourglass standing upright, the upper bulb almost empty and the lower bulb holding a gentle mound of terracotta clay sand, a thin falling stream between them. Beside it, a single torn-off calendar leaf leaning against the hourglass, blank with only a few ruled lines.
```

### 5. thanks — teşekkür

```text
Subject: A sealed paper envelope drawn as an engraving, closed with a round terracotta clay wax seal showing a small eight-pointed spark. Two small laurel sprigs rest at the lower corners of the envelope.
```

### 6. empty — boş durum

```text
Subject: A minimal clipboard with a terracotta clay clip holding a single blank off-white sheet with a few faint ruled lines, an engraved fountain pen resting diagonally across it, one tiny clay spark beside the clip.
```

### 7. admin — öğretmen paneli

```text
Subject: A delicate brass drafting compass standing above three clean engraved bar-chart columns of different heights; the tallest middle column is filled with terracotta clay, the others with soft peach and hatching. A few fine dotted guide lines and small stars around it, like a star chart.
```

### 8. offline — hata / bağlantı yok

```text
Subject: An engraved folded map sheet with soft terracotta-clay regions, lying slightly open, with a brass stethoscope resting calmly across one corner, its tubing curving gently.
```

### 9. seal — footer mührü

```text
Subject: A round academic seal drawn as an engraving, with a double thin circular border and a ring of tiny dots between the two borders. In its center, a stylized six-armed Star of Life in terracotta clay, surrounded by six small connected round nodes like a network. Flat, balanced, print-like.
```

### 10. ornament — bölüm süsü (geniş)

Ortak stilin son satırındaki "Square 2048x2048, the subject fills about 70%" kısmını şununla değiştir: **"Wide 2048x1024 composition, the ornament is a thin horizontal band across the middle, lots of empty space above and below."**

```text
Subject: A small symmetrical cartographer's ornament: a minimalist eight-pointed compass spark in the center with a terracotta clay dot, flanked on each side by a fine horizontal botanical flourish with a few small leaves in soft peach.
```

---

## Kontrol listesi (her görselden sonra)

- Zemin gerçekten düz beyaz mı (koyuda düz siyah)? Dama deseni veya hafif gölge varsa yeniden üret.
- Resimde **hiç yazı, harf veya rakam** yok mu? Varsa yeniden üret (Gemini bazen sahte yazı ekler).
- Çizimin içindeki açık alanlar saf beyaz değil, kırık beyaz mı? (Saf beyaz olursa script onları da delebilir.)
- Konu tuvalin ortasında, kenarlara değmiyor mu?
- `npm run art` çıktısında "zeminin %…'i silindi" oranı %30'un üstünde mi? Çok düşükse zemin düz değildir.
