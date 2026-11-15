# Açık Sorular ve Öğretmen Onayı Beklenen Maddeler

> **Amaç:** [ogretmen-sorulari-cevaplar.docx](ogretmen-sorulari-cevaplar.docx) içindeki cevaplardan sonra kesinleşmemiş, teknik açıdan iki seçeneği olan veya harici girdi bekleyen konular burada toplanmıştır. Cevaplar geldikçe kodda tek yerden ayarlanabilecek şekilde kuruldu; **mevcut hiçbir yanıt verisi asla silinmez.**

---

## 1. 6 Ayda Bir Tekrar Doldurma Kuralı (Soru 31 + Soru 32)
**Durum:** Eşiniz "anket hep açık kalacak", "doldurduktan sonra düzenleme olmasın" ve "her 6 ayda bir doldurulabilsin" dedi.

**Netleştirilecek soru:**
- **Seçenek A (Sabit takvim dönemleri — önerilen):** Sistem her yıl iki resmi dönem açar: **Bahar (1 Ocak – 30 Haziran)** ve **Güz (1 Temmuz – 31 Aralık)** (`2026-Güz`, `2027-Bahar`…). Bir mezun her dönemde 1 kez gönderir; sonraki döneme geçince yeni bir yanıt doldurur. Bu yöntem istatistik ve grafiklerde *"2026 Güz vs 2027 Bahar istihdam artışı"* karşılaştırmasını çok temiz yapar.
- **Seçenek B (Kişiye özel 180 gün):** Her mezun kendi son gönderim tarihinden tam 180 gün geçtikten sonra yeni yanıt gönderebilir.
- **Şu an sistemde ne yapıldı:** Veritabanı **tüm gönderimleri dönemsel ve kronolojik olarak saklar** (hiçbir kayıt üzerine yazılmaz veya silinmez). Admin ayarlarından `tekrar bekleme süresi (gün)` ya da `aktif dönem etiketi` tek tuşla seçilebilir.

---

## 2. Mezun Listesi Excel Şablonu (Soru 8 + Soru 9 + Soru 10)
**Durum:** Yalnız öğretmenin yüklediği listedeki mezunların girebilmesi ve öğrenci numarasının zorunlu olması seçildi (~600 mezun). Liste henüz gelmedi.

**Netleştirilecek sorular:**
- Hazırlanacak Excel/CSV dosyasında hangi sütunlar kesin var?
  - Önerilen sütunlar: `ogrenci_no`, `ad_soyad`, `eposta`, `mezuniyet_yili`, `mezuniyet_donemi` (Güz/Bahar).
- Okul kayıtlarındaki e-posta okul uzantılı (`@stu.fbu.edu.tr`) ise mezunların çoğu **kişisel e-posta** ile gireceği için listede kişisel e-postaları mı yer alacak?
- **Şu an sistemde ne yapıldı:**
  - Admin panelinde Excel/CSV mezun listesi yükleme ve tekil mezun ekleme/düzenleme ekranı hazır.
  - Öğrencinin e-postası değişirse admin listeden tek satırla güncelleyebilir.
  - Mezun listesi henüz yüklenmeden test yapılabilmesi için admin ayarlarında **"Liste doğrulaması (Whitelist) zorunlu olsun"** anahtarı konuldu. Liste yüklenince aktif tutulur.

---

## 3. KVKK Aydınlatma Metni (Soru 12)
**Durum:** "FBÜ web sayfasında varsa oradan alabilirsin" denildi; resmi metin henüz eklenmedi.

**Netleştirilecek soru:**
- Fenerbahçe Üniversitesi web sitesindeki resmi öğrenci/mezun KVKK aydınlatma metninin birebir metni veya bağlantısı buraya eklenecek mi, yoksa program adına kısa bir kurum içi bilgilendirme metni mi konulacak?
- **Şu an sistemde ne yapıldı:** Girişte onay kutusu ve KVKK metni alanı hazır bırakıldı (TR/EN yer tutucu uyarısıyla). Resmi metin admin ayarlarından veya veri dosyasından tek adımda yapıştırılabilir.

---

## 4. Aylık Gelir Aralığı Dilimleri (Soru 29)
**Durum:** Yeni soru olarak "Aylık gelir aralığı" eklendi, ancak TL dilimleri ve isteğe bağlı olup olmadığı belirtilmedi.

**Netleştirilecek soru:**
- Aşağıdaki dilimler uygun mu (2026 asgari ücret referansıyla) ve "Belirtmek istemiyorum / Çalışmıyorum" seçeneği kalsın mı?
  - Çalışmıyorum / Gelirim yok
  - Asgari ücret ve altı
  - Asgari ücret – 1,5 katı
  - 1,5 – 2 katı
  - 2 – 3 katı
  - 3 katı ve üzeri
  - Belirtmek istemiyorum
- Sabit TL aralıkları mı (örn. 25.000 altı, 25–40 bin…) yoksa asgari ücret katı mı tercih edilsin? (Enflasyon karşısında 6 aylık dönem kıyaslaması için asgari ücret katı veya güncellenebilir aralık daha dayanıklıdır.)

---

## 5. Değerlendirme Tablosu 11. Madde ("Lisansüstü" İfadesi)
**Durum:** Soru 27'de Yüksek Lisans ve Doktora soruları kaldırılıp **DGS ile lisans tamamlama** eklendi. Ancak orijinal anketin son matrisindeki 11. maddede *"Almış olduğum eğitimin beni lisansüstü çalışmalara yeteri kadar hazırladığını düşünüyorum"* ifadesi var.

**Netleştirilecek soru:**
- Bu ifade *"ileri akademik çalışmalara (DGS / lisans tamamlama / lisansüstü)"* şeklinde güncellensin mi, yoksa birebir kalsın mı? (Şu an her iki anlamı kapsayan net ifade kullanıldı.)

---

## 6. Yetkili Öğretmen E-postaları ve SMTP Gönderimi (Soru 7 + Soru 35 + Soru 39)
**Durum:**
- Ana yetkili (Program Başkanı — tam yetki) ve salt görüntüleyici diğer öğretmenlerin e-posta adresleri paylaşılacak.
- Mezunlara 6 haneli giriş kodu ve hatırlatma e-postası göndermek için SMTP / Resend anahtarı sunucu `.env` dosyasına girilecek.

---

## 7. Mac mini Sunucu Yayın Adresi (Cloudflare Tunnel / Alan Adı)
**Durum:** Uygulama Vercel yerine evdeki `macmini-server` üzerinde Docker ile çalışacak.
- Sunucu şu an yalnızca ev ağı ve Tailscale üzerinden erişilebilir durumda; herkese açık internet için `macmini-server` üzerine **Cloudflare Tunnel (`cloudflared`)** ve bir alan adı (veya alt alan adı) bağlanması gerekiyor.
- Tünel kurulana kadar siz ve eşiniz Tailscale açıkken telefon ve bilgisayardan `https://macmini-server.taild883a6.ts.net:8443` üzerinden tam sürümü test edebilirsiniz.
