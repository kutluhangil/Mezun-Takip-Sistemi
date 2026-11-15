# Görseller: Gemini Gravür Prompt'ları

> **Durum (2026-11-15):** Gemini görsel üretme kotası şu an dolu olduğundan prompt'lar hazırlandı; site `components/ui/Art.tsx` içinde aynı çizgi diliyle hazırlanmış **vektör mürekkep + kil SVG yedekleriyle** sorunsuz çalışıyor. Kota açıldığında görseller üretilip `public/art/*.webp` olarak yerleştirildiğinde kod otomatik olarak gerçek gravürleri gösterir (hiçbir bileşen kırılmaz).

---

## Ortak Stil (Her Prompt'un Başına Ekle)

```text
Fine-art editorial illustration drawn like a hand-inked engraving: confident black ink linework
with subtle hatching and cross-hatching in the shadows (like a 19th-century medical or cartographic
etching), slightly organic imperfect strokes, selective flat color only in terracotta clay #D97757
and soft peach #EBC9B7, tiny accents of warm grey #87867F. Calm, intelligent, generous negative space,
single centered subject, no text, no letters, no numbers, no logos, no faces, no UI chrome, no frame,
no border, no drop shadow, no ground shadow, no background scene.
TRANSPARENT BACKGROUND (or pure flat white #FFFFFF background).
Square 2048x2048, subject fills about 70% of the canvas, crisp edges, print quality.
```

## Koyu Tema Sürümü (Sona Ekle)

```text
Dark-mode variant of the exact same drawing: ink lines in warm ivory #FAF9F5 instead of black,
same terracotta clay #D97757 fills, soft peach replaced by #8A5A44. Transparent background (or pure
flat black #000000 background).
```

---

## Üretilecek Görsel Listesi

| # | Dosya (`public/art/`) | Nerede görünür | Prompt (ortak stilden sonra) |
|---|---|---|---|
| 1 | `hero.webp` / `hero-dark.webp` | Karşılama sayfası ana sahne | `A classical six-armed Star of Life emblem drawn as an engraving, its center staff crowned with a modest graduation cap and tassel; from the cap a calm constellation of small connected nodes rises upward like an alumni network, a few nodes filled with terracotta clay; a fine ECG heartbeat line runs horizontally beneath and fades softly at both ends.` |
| 2 | `thanks.webp` / `thanks-dark.webp` | Anket gönderim teşekkür ekranı | `An engraved paper envelope sealed with a round terracotta clay wax-like stamp showing an eight-pointed spark, two small olive or laurel sprigs resting beside the envelope.` |
| 3 | `empty.webp` / `empty-dark.webp` | Boş arama / henüz yanıt yok durumu | `A minimal wooden-clip clipboard holding a single blank ivory sheet, an engraved fountain pen resting diagonally across it, one tiny clay spark beside the clip.` |
| 4 | `admin.webp` / `admin-dark.webp` | Yönetici analiz sayfası başlığı | `A delicate brass-and-ink compass divider standing above three clean engraved statistical bar columns, one middle bar accented in terracotta clay, subtle constellation guide lines.` |
| 5 | `offline.webp` / `offline-dark.webp` | Bağlantı / yetki / bulunamadı ekranı | `An engraved folded map sheet beside a small brass stethoscope earpiece resting calmly on the surface, one small terracotta spark near the bell.` |
| 6 | `ornament.webp` / `ornament-dark.webp` | Bölüm ayırıcıları (`.ornament`) | `A small symmetrical cartographer's ornament shaped like a minimalist eight-pointed spark flanked by two fine botanical flourishes, terracotta center dot. Wide 2048x1024 composition with generous empty space.` |
| 7 | `seal.webp` / `seal-dark.webp` | Footer alt mührü (`seal-dark.webp` sabit kullanılır) | `A round engraved academic-style seal with a double thin circular border: inside, a stylized Star of Life woven with six small connected network nodes, terracotta clay accents, no text, flat print style.` |

---

## Kota Açıldığında Yerleştirme Adımları

1. Görselleri `assets-src/illustrations/` klasörüne `hero.png`, `hero-dark.png`, ... olarak kaydet.
2. Saf beyaz/siyah zeminden gerçek alfaya ve 720 px sıkıştırılmış `.webp` formatına çevir (`public/art/<ad>.webp` ve `public/art/<ad>-dark.webp`).
3. `src/components/ui/Art.tsx` içindeki `READY_ART` kümesine dosya adını ekle; bileşen otomatik olarak `.webp` gravüre geçer.
