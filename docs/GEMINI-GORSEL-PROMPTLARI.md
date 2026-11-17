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
| 9 | `footer.png` · `footer-dark.png` | Footer'ın üstünü boydan boya saran gravür bandı (eski mührün yerine) | Çok geniş 21:9 |
| 10 | `ornament.png` · `ornament-dark.png` | Bölüm başlıklarının üstündeki küçük süs | Geniş 2:1 |
| 11 | `logo.png` · `logo-dark.png` | Sitenin kendi logosu: üst menü, footer, sekme ikonu (FBÜ logosunun yerine) | Kare |

> **Durum (2026-11-18):** 11 görselin tamamı (2. turdaki `footer` ve `logo` dahil) yayında. Eski `seal` (footer mührü) kaldırıldı, kaynakları `assets-src/arsiv/` içinde.

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

### 9. footer — footer gravür bandı (geniş)

Ortak stilin son satırındaki "Square 2048x2048, the subject fills about 70%" kısmını şununla değiştir: **"Ultra-wide 21:9 panoramic frieze, 3072x1316. The scene is a single continuous horizontal band in the lower two thirds; both left and right ends dissolve gradually into empty background, with no hard edge or frame."**

```text
Subject: A calm panoramic engraved frieze telling the journey of first-aid and emergency-care graduates, read from left to right along one continuous ground line. On the far left, a few open books and a graduation cap resting on a small stack of papers. Then a modest classical campus building with slender columns and a few trees. In the center, a classic box ambulance seen from the side with a terracotta clay six-armed Star of Life on its door, parked on a gently curving road. Further right, the road winds toward soft rolling hills and a distant low city skyline with a slender old stone tower. A single fine ECG heartbeat line runs along the whole ground line, rising into one clear heartbeat peak beneath the ambulance and settling flat again at both ends. Small figures are shown only from far away or from behind, with no faces. Lots of quiet sky above. Terracotta clay accents only on the Star of Life, a few rooftops and the cap tassel; soft peach in the hills.
```

Koyu sürüm bloğu aynen geçerli (düz siyah zemin, fildişi çizgiler).

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

### 11. logo — sitenin logosu (şeffaf zeminli)

Bu görsel için **Ortak stil bloğunu kullanma**; aşağıdaki prompt kendi başına tam. Gemini gerçek şeffaflık vermediği için düz beyaz zemin istiyoruz; `npm run art` zemini silip **şeffaf** `logo.webp` üretir. Logo 32 piksele kadar küçüleceği için tarama yok, düz ve kalın çizgiler var.

```text
Design a unique, minimal emblem logo for a university first-aid and emergency-care alumni tracking portal. A perfect circle drawn with one confident dark ink outline (#141413). Inside it, a bold six-armed Star of Life filled with flat terracotta clay #D97757, its arms with softly rounded ends. Running vertically through the center of the star, a simple Rod of Asclepius with a single serpent, drawn as one clean warm off-white line (#FAF9F5). Above the top arm, a tiny graduation cap silhouette in dark ink, perfectly centered. Flat vector style inspired by engraved seals but with NO hatching, NO texture, NO gradients, NO shadows: only flat fills and clean strokes, so it stays crisp and readable at 32x32 pixels. Strictly symmetrical, centered, generous inner padding.
Isolated on a perfectly flat, solid, pure white #FFFFFF background. No checkerboard, no texture, no frame, no drop shadow.
Absolutely no text, letters, numbers or initials.
Square 1024x1024, the emblem fills about 80% of the canvas.
```

Koyu sürüm (aynı sohbette):

```text
Now the exact same logo for dark backgrounds: identical shapes and composition. The circle outline and the graduation cap become warm ivory #FAF9F5, the Star of Life stays terracotta clay #D97757, and the serpent line stays #FAF9F5. Flat fills only. Isolated on a perfectly flat, solid, pure black #000000 background. No text, no shadow, no glow, no checkerboard.
```

Kaydet: `assets-src/illustrations/logo.png` ve `logo-dark.png`, sonra `npm run art`. Logo gelince üst menüde, footer'da ve tarayıcı sekmesi ikonunda geçici mürekkep işaretinin yerini kendiliğinden alır (sekme ikonu `src/app/icon.png` ve `apple-icon.png` logodan üretilir).

