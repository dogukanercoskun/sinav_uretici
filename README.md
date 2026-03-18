# 🚀 Tam Otomatik Sınav Üretici

![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-green.svg)
![Platform: Tarayıcı](https://img.shields.io/badge/Platform-Tarayıcı%20Tabanlı-blue.svg)
![Yapay Zeka: Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-orange.svg)
![Durum: Aktif](https://img.shields.io/badge/Durum-Aktif%20Geliştirme-brightgreen.svg)

> **Dakikalar içinde, yapay zeka destekli, baskıya hazır sınav kağıtları oluşturun.**  
> Kurulum yok. Sunucu yok. Tarayıcıyı açın, kullanın.

---

## 📖 Proje Hakkında

**Tam Otomatik Sınav Üretici**, öğretmenlerin iş yükünü büyük ölçüde azaltmak için geliştirilmiş, %100 tarayıcı tabanlı (serverless) bir web uygulamasıdır.

İlkokul'dan Üniversite'ye, Matematik'ten Tarih'e kadar **her düzey ve her ders** için; sadece konuyu ve kazanımları yazarak MEB/Yeni Nesil standartlarında analitik ve beceri temelli sınav kağıtları üretebilirsiniz.

Tüm işlemler tarayıcınızda gerçekleşir. API anahtarlarınız hiçbir sunucuya gönderilmez.

---

## ✨ Temel Özellikler

- 🤖 **Yapay Zeka Destekli Soru Üretimi**  
  Google Gemini 2.5 Flash ile MEB/YENİ NESİL standartında, beceri temelli, analitik soru havuzu kurgulama.

- 🔄 **Çoklu API Yedek Sistemi**  
  Gemini kotası dolduğunda sırasıyla OpenRouter (ücretsiz modeller), Hugging Face ve Pollinations AI devreye girer. Kesintisiz üretim garantisi.

- 🎨 **Görsel Üretimi ve Grafik Desteği**  
  - **SiliconFlow / Flux.1-schnell** → Sorunun bağlamına uygun yüksek kaliteli gerçekçi PNG illüstrasyonlar  
  - **Gemini SVG Diyagramları** → Geometri, laboratuvar düzeneği, harita gibi akademik çizimler için algoritmik vektör görseller  
  - **Dosyadan Yükleme** → Kendi hazırladığın JPG/PNG/SVG görselini soruya ekleyebilirsin

- 🛠 **5 Farklı Soru Tipi**
  | Tip | Açıklama |
  |---|---|
  | Çoktan Seçmeli | 4 şıklı, çeldirici ve analitik kurgu |
  | Doğru / Yanlış | İfade bazlı, cevap kutucuklu |
  | Açık Uçlu | Kısa / uzun cevaplı, yazı satırlı |
  | Boşluk Doldurma | Cümle içi boşluklu ifadeler |
  | Eşleştirme | Sütun bazlı eşleştirme tabloları |

- ⚖️ **Zorluk Seviyesi Dengesi**  
  Her bölümde "Kolay", "Orta" ve "Zor" sorular dengeli dağıtılır. Soru seçim aşamasında zorluk etiketi görünür.

- 📋 **Soru Havuzu & Seçim Sistemi**  
  Hedef soru sayısının 1.5 katı üretilir. Beğenmediğin soruları tek tıkla çıkarırsın.

- 🖨️ **İki Farklı Çıktı Nüshası**  
  - **Öğretmen Nüshası** → Cevap anahtarlı  
  - **Öğrenci Nüshası** → Cevap anahtarsız  
  Her ikisi de PDF olarak kaydedilebilir veya doğrudan yazdırılabilir.

- 🔒 **Güvenli Anahtar Yönetimi**  
  API anahtarları hiçbir veritabanına kaydedilmez. Tarayıcının `sessionStorage` belleğinde tutulur, sekme kapanınca otomatik silinir.

---

## ⚙️ Nasıl Kullanılır?

### Seçenek A — Direkt Online Kullan (Önerilen)
Herhangi bir kurulum yapmadan tarayıcıdan aç:
```
https://dogukanercoskun.github.io/sinav_uretici
```

### Seçenek B — Kendi Bilgisayarında Çalıştır
```bash
git clone https://github.com/dogukanercoskun/sinav_uretici.git
cd sinav-uretici
# index.html dosyasını tarayıcında aç
```

---

### 🔑 API Anahtarları

| Anahtar | Zorunlu? | Nereden Alınır? | Ücretsiz Limit |
|---|---|---|---|
| Google Gemini | ✅ Zorunlu | [Google AI Studio](https://aistudio.google.com/app/apikey) | 500 istek/gün |
| SiliconFlow | ⭐ Önerilen | [SiliconFlow](https://cloud.siliconflow.cn/) | Başlangıç kredisi |
| OpenRouter | 🔄 Yedek | [OpenRouter](https://openrouter.ai/keys) | Model bazlı |
| Hugging Face | 🔄 Yedek | [HuggingFace](https://huggingface.co/settings/tokens) | Sınırlı |

> 💡 **İpucu:** Yalnızca Gemini anahtarıyla başlayabilirsin. Görsel üretimi için SiliconFlow anahtarı eklersen kalite önemli ölçüde artar.

---

### 🚀 İlk Sınav — Adım Adım

1. Sayfayı aç → **"API Anahtarları ⚙️ Düzenle"** butonuna tıkla → Gemini anahtarını gir
2. Okul adı, sınıf, ders ve konu/kazanımları doldur
3. Her bölüm için soru sayısı ve puan dağılımını belirle
4. **"Soruları Havuza Üret"** butonuna bas — yapay zeka otomatik üretir
5. Gelen havuzdan beğenmediğin soruları çıkar
6. İstersen sorulara görsel ekle (opsiyonel)
7. **"Sınavı Tamamla"** → Öğretmen veya öğrenci nüshası olarak yazdır / PDF kaydet

---

## 📁 Proje Yapısı
```
sinav-uretici/
├── index.html          # Ana uygulama
├── css/
│   └── style.css       # Tüm stiller
└── js/
    └── app.js          # Uygulama mantığı (API çağrıları, soru üretimi, görsel yönetimi)
```

---

## 🛣️ Yol Haritası

- [x] Temel soru üretimi (Gemini API)
- [x] 5 farklı soru tipi desteği
- [x] Görsel üretimi (SiliconFlow / SVG)
- [x] Soru havuzu ve seçim sistemi
- [x] Öğretmen / öğrenci nüshası çıktısı
- [x] Çoklu API yedek sistemi (OpenRouter, HuggingFace, Pollinations)
- [x] Güvenli API anahtar yönetimi (sessionStorage)
- [x] GitHub Pages üzerinden online erişim
- [ ] LaTeX / MathJax matematik denklemi render desteği
- [ ] Soru havuzunu `.docx` (Word) formatında indirme
- [ ] LGS / YKS soru kalıplarına dayalı gelişmiş kurgulama
- [ ] Soru bankası — önceki sınavlardan soru yeniden kullanımı
- [ ] Çoklu dil desteği (İngilizce arayüz)

---

## 🤝 Katkıda Bulunma

Katkıların memnuniyetle karşılanır:

1. Projeyi **Fork**'layın
2. Yeni bir dal oluşturun: `git checkout -b ozellik/YeniOzellik`
3. Değişikliklerinizi yapın ve işleyin: `git commit -m 'Yeni özellik: ...'`
4. Dalı gönderin: `git push origin ozellik/YeniOzellik`
5. **Pull Request** açın

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında sunulmaktadır. Dilediğiniz gibi kullanabilir, değiştirebilir ve dağıtabilirsiniz.

---

<div align="center">
  <sub>Türk öğretmenlerine kolaylık sağlamak amacıyla ❤️ ile geliştirildi.</sub>
</div>
