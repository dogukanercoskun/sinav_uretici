/* =========================================================
   SINAV ÜRETİCİ — JavaScript Uygulama Mantığı (app.js)
   =========================================================

   İÇERİK:
   1. Genel durum değişkenleri
   2. requestQuestions()       — Soru havuzu üretimi (Gemini API)
   3. renderSelectionPool()    — Soru seçim arayüzü
   4. goToImageReview()        — Görsel onay aşamasına geçiş
   5. loadImage(num, mode)     — Görsel üretimi seçici
      5a. loadGeminiImage()    — Gemini ile gerçek PNG görsel üretimi
      5b. loadSvgImage()       — Gemini SVG diyagramı
   6. generateAllImages()      — Tüm görselleri sırayla üret
   7. prepareFinalExam()       — Sınavı derle
   8. buildPrintedExam()       — HTML sınav kağıdı oluştur
   9. doPrint()                — Yazdırma penceresi
   10. Yardımcı fonksiyonlar
   ========================================================= */

let edata = null;
let targetCounts = {};
let finalData = {}; // Seçilen sorular listesi

function showToast(msg, type = 'info') {
  let existing = document.getElementById('toast-container');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'toast-container';
    existing.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(existing);
  }
  
  let colors = {
    info:    { bg: '#2563eb', icon: 'ℹ️' },
    success: { bg: '#059669', icon: '✅' },
    warn:    { bg: '#d97706', icon: '⚠️' },
    error:   { bg: '#dc2626', icon: '❌' }
  };
  
  let c = colors[type] || colors.info;
  let toast = document.createElement('div');
  toast.style.cssText = `background:${c.bg};color:white;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:flex-start;gap:8px;animation:slideIn .2s ease;`;
  toast.innerHTML = `<span>${c.icon}</span><span style="flex:1;">${msg}</span><span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:.7;margin-left:4px;">✕</span>`;
  existing.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function toggleApiSettings() {
  let panel = document.getElementById('apiSettingsPanel');
  panel.classList.toggle('hidden');
  
  // Kaç anahtar girildi sayısını güncelle
  updateApiKeyStatus();
}

function toggleHowTo() {
  let content = document.getElementById('howToContent');
  let arrow   = document.getElementById('howToArrow');
  let hint    = document.getElementById('howToToggleHint');
  let isOpen  = content.style.display !== 'none';

  if (isOpen) {
    content.style.display = 'none';
    arrow.style.transform = 'rotate(180deg)';
    if (hint) hint.textContent = 'Görmek için tıkla';
    localStorage.setItem('howToOpen', 'false');
  } else {
    content.style.display = 'block';
    arrow.style.transform = 'rotate(0deg)';
    if (hint) hint.textContent = 'Gizlemek için tıkla';
    localStorage.setItem('howToOpen', 'true');
  }
}

function updateApiKeyStatus() {
  let count = 0;
  ['geminiKey','siliconKey','openRouterKey','hfKey'].forEach(id => {
    if (document.getElementById(id)?.value?.trim()) count++;
  });
  
  let statusEl  = document.getElementById('apiKeyStatus');
  let subtextEl = document.getElementById('apiKeySubtext');
  
  if (!statusEl) return;
  
  if (count === 0) {
    statusEl.style.borderColor  = '#ef4444';
    statusEl.style.background   = '#fff5f5';
    if (subtextEl) {
      subtextEl.style.color   = '#ef4444';
      subtextEl.textContent   = '⚠️ Henüz anahtar girilmedi — sınav üretmek için gerekli!';
    }
  } else {
    statusEl.style.borderColor  = '#059669';
    statusEl.style.background   = '#f0fdf4';
    if (subtextEl) {
      subtextEl.style.color   = '#059669';
      subtextEl.textContent   = '✅ ' + count + ' anahtar girildi — hazırsın!';
    }
  }
}

// ── Başlangıçta kayıtlı API anahtarlarını yükle ──
window.onload = () => {
    let savedKey = sessionStorage.getItem('geminiApiKey');
    if (savedKey) document.getElementById('geminiKey').value = savedKey;

    let savedSilKey = sessionStorage.getItem('siliconApiKey');
    if (savedSilKey) document.getElementById('siliconKey').value = savedSilKey;

    let savedOrKey = sessionStorage.getItem('openRouterApiKey');
    if (savedOrKey) document.getElementById('openRouterKey').value = savedOrKey;

    let savedOrModel = sessionStorage.getItem('openRouterModel');
    if (savedOrModel) document.getElementById('openRouterModel').value = savedOrModel;
    
    updateApiKeyStatus();

    // "Nasıl Kullanılır" açık/kapalı durumunu localStorage'dan oku
    let howToOpen = localStorage.getItem('howToOpen');
    if (howToOpen === 'false') {
      let content = document.getElementById('howToContent');
      let arrow   = document.getElementById('howToArrow');
      let hint    = document.getElementById('howToToggleHint');
      if (content) content.style.display = 'none';
      if (arrow)   arrow.style.transform = 'rotate(180deg)';
      if (hint)    hint.textContent = 'Görmek için tıkla';
    }
};

function saveKey() {
    let key = document.getElementById('geminiKey').value.trim();
    if (key) sessionStorage.setItem('geminiApiKey', key);

    let silKey = document.getElementById('siliconKey').value.trim();
    if (silKey) sessionStorage.setItem('siliconApiKey', silKey);

    let orKey = document.getElementById('openRouterKey').value.trim();
    if (orKey) sessionStorage.setItem('openRouterApiKey', orKey);

    let orModel = document.getElementById('openRouterModel').value.trim();
    if (orModel) sessionStorage.setItem('openRouterModel', orModel);

    let hfKey = document.getElementById('hfKey').value.trim();
    if (hfKey) sessionStorage.setItem('hfKey', hfKey);

    let hfModel = document.getElementById('hfModel').value.trim();
    if (hfModel) sessionStorage.setItem('hfModel', hfModel);
    
    updateApiKeyStatus();
}

// ── Log ve İlerleme Yönetimi ──
function log(msg, type) {
    let box = document.getElementById('lbox');
    let d = document.createElement('div');
    d.className = 'log-' + (type || 'info');
    d.textContent = '[' + new Date().toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '] ' + msg;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

function setProgress(pct, label) {
    document.getElementById('pfl').style.width = pct + '%';
    document.getElementById('ppct').textContent = pct + '%';
    document.getElementById('plbl').textContent = label;
}

// ─────────────────────────────────────────────────────────
// 1. AŞAMA: YAPAY ZEKADAN SORU HAVUZU ÜRETME
// ─────────────────────────────────────────────────────────
async function requestQuestions() {
    let apiKey = document.getElementById('geminiKey').value.trim();
    if (!apiKey) { showToast('Gemini API Anahtarı girilmedi. Lütfen ⚙️ Düzenle butonuna tıklayın.', 'error'); return; }
    let topic = document.getElementById('ct').value.trim();
    topic = topic.replace(/[<>\"'`]/g, '').substring(0, 500);
    if (!topic) { showToast('Lütfen konu/kazanım alanını doldurun.', 'warn'); return; }

    let mc    = parseInt(document.getElementById('cm').value)    || 0;
    let tf    = parseInt(document.getElementById('ctf').value)   || 0;
    let op    = parseInt(document.getElementById('cop').value)   || 0;
    let fill  = parseInt(document.getElementById('cfill').value) || 0;
    let match = parseInt(document.getElementById('cmatch').value)|| 0;

    targetCounts = { A: mc, B: tf, C: op, D: fill, E: match };

    let p_mc    = Math.ceil(mc    * 1.5);
    let p_tf    = Math.ceil(tf    * 1.5);
    let p_op    = Math.ceil(op    * 1.5);
    let p_fill  = Math.ceil(fill  * 1.5);
    let p_match = Math.ceil(match * 1.5);

    document.getElementById('settingsCard').classList.add('hidden');
    document.getElementById('loadingCard').classList.remove('hidden');
    document.getElementById('lbox').innerHTML = '';
    setProgress(10, 'Gemini API ile bağlantı kuruluyor...');

    let qTypesText = [];
    if (p_mc    > 0) qTypesText.push(`- Bölüm A: ${p_mc} adet çoktan seçmeli (4 şık)`);
    if (p_tf    > 0) qTypesText.push(`- Bölüm B: ${p_tf} adet Doğru/Yanlış`);
    if (p_op    > 0) qTypesText.push(`- Bölüm C: ${p_op} adet açık uçlu kısa cevap`);
    if (p_fill  > 0) qTypesText.push(`- Bölüm D: ${p_fill} adet boşluk doldurma (text içinde boşluk '....' ile gösterilmeli)`);
    if (p_match > 0) qTypesText.push(`- Bölüm E: 1 adet eşleştirme tablosu. Tabloda tam olarak ${p_match} satır (pair) olsun.`);

    let grade = document.getElementById('cg').value;
    let sub = document.getElementById('csub')?.value || 'Genel';

    let prompt = `Sen deneyimli ve uzman bir ${sub} öğretmenisin. Seçili seviyedeki ${sub} dersi için aşağıdaki ÖĞRENME KAZANIMLARI'na birebir uygun, "Beceri Temelli / Analitik" MEB LGS / YKS / YENİ NESİL Soru Havuzu oluşturacaksın. Sorular asla basit tanım sormamalı, öğrencilerin çıkarım ve analiz yapabilmesini test etmelidir.

KAZANIMLAR: "${topic}"
SINIF/SEVİYE: "${grade}"
DERS: "${sub}"

SINAV YAPISI YÖNERGESİ (BU SAYILARDA ÜRET):
${qTypesText.join('\n')}

ZORLUK SEVİYESİ DENGESİ VE SORU KALİTESİ:
- Her bölümdeki soruları "Kolay", "Orta" ve "Zor" zorluk seviyesinde dengeli olarak karma üret. JSON objesinde mutlaka "difficulty" alanı olsun.
- ÇOKTAN SEÇMELİLER (Bölüm A): Sorular mutlaka günlük hayattan bir olayı, deney düzeneklerini veya tablo grafik durumlarını hikayeleştiren analitik sorular olsun. Şıklar çeldirici ve eşit uzunlukta olsun. Basit "Aşağıdakilerden hangisi..." diye başlayan klasik ezber soruları yerine düşündürücü mantık soruları kurgula.
- "imagePrompt" alanı: ÇOK ÖNEMLİ! Bu alan SVG diyagram üretimi için kullanılacak. SVG'de insan figürü çizmek ÇOK ZORDUR, bu yüzden özel kurallar var:

  ★★★ KRİTİK: İNSAN FİGÜRÜ KURALLARI ★★★
  - Mümkünse insanı ana konu YAPMA. Bunun yerine NESNELERE, EKİPMANLARA, DENEYSELDÜZENEKLERE, DOĞA SAHNELERINE odaklan.
  - Spor sorusu: Sporcuyu çizme YERİNE spor ekipmanını (top, kale, halter, pist) ve fizik kavramlarını (kuvvet okları, yörünge yolu) ön plana çıkar.
  - Eğer insan ZORUNLUYSA: "Basit geometrik ikon-tarzı insan silueti" yaz. Anatomik detay (kas, bacak gerginliği, parmaklar) ASLA yazma.
  - YASAK TASVİRLER: "kaslı figür", "bacak kasları gergin", "kolları yukarı uzanmış" → BUNLAR SVG'DE ÇOK KÖTÜ SONUÇ VERİR.
  - İYİ ALTERNATİF: İnsan yerine bilimsel diyagram (kuvvet vektörleri, hareket yörüngesi, enerji dönüşüm şeması) çiz.

  Her çoktan seçmeli soru için DETAYLI, 3-5 cümlelik bir sahne tasviri yaz. Tasvir şunları İÇERMELİDİR:
  (a) Sahnedeki TÜM nesnelerin listesi ve her birinin MEKÂNSAL KONUMU (ör: "Solda bir beher, sağda bir ispirto ocağı, ortada termometre").
  (b) Nesnelerin RENK, BOYUT ve MATERYAL bilgileri (ör: "Saydam cam balonjoze, içinde açık mavi sıvı, tüpün ağzından yoğun beyaz buhar çıkıyor").
  (c) BİLİMSEL BAĞLAM detayları (ör: "Işık kaynağı sol üstten geliyor, cismin sağ arkasında koyu gölge oluşuyor", "Ok yönleri kuvvetin yukarı doğru olduğunu gösteriyor").
  (d) ARKA PLAN / ZEMİN tanımı (ör: "Temiz beyaz laboratuvar tezgahı üzerinde", "Yeşil çimenli doğa ortamında", "Gökyüzü açık mavi, güneş sağ üstte").
  (e) ÖNERİLEN BAKIŞ AÇISI (ör: "Yandan profil görünüm", "Kuşbakışı", "3/4 izometrik açı").
  ÖRNEK İYİ imagePrompt (İNSANSIZ): "Beyaz laboratuvar tezgahı üzerinde solda şeffaf cam beher içinde yarıya kadar açık mavi sıvı, ortada kırmızı sıvılı dereceli silindir, sağda metal ispirto ocağı ve küçük sarı alev. Arka planda soluk gri duvar. Yandan profil bakış açısı."
  ÖRNEK İYİ imagePrompt (SPOR/FİZİK): "Yeşil çimenli saha üzerinde sarı bir futbol topu, topun arkasında kesikli çizgiyle parabol yörünge yolu gösterilmiş, yörünge üzerinde hız vektörleri (mavi oklar) ve yer çekimi vektörü (kırmızı ok aşağı doğru). Arka planda bulanık kale direği. Fizik diyagramı tarzında."
  KÖTÜ imagePrompt: "Kaslı halterci figürü, bacak kasları gergin" → SVG İNSAN ÇİZEMEZ!
  Cevabı doğrudan açıklayan bir sahne OLMAMALI, sadece sorunun bağlamını tasvir et.

DÖNGÜ, SONUÇ VE FORMAT (PÜR JSON):
Hiçbir kelime yazma, sadece aşağıdaki formatta JSON dön:
{
  "title": "sınav başlığı",
  "sectionA": [ {"id":"A1", "difficulty":"Zor", "stem":"soru kökü hikayesi", "options":{"A":"...","B":"...","C":"...","D":"..."}, "answer":"A", "imagePrompt":"sorunun sahnesini betimleyen kısa Türkçe açıklama" } ],
  "sectionB": [ {"id":"B1", "difficulty":"Orta", "statement":"ifade", "answer":"D"} ],
  "sectionC": [ {"id":"C1", "difficulty":"Zor", "question":"soru cümlesi"} ],
  "sectionD": [ {"id":"D1", "difficulty":"Kolay", "text":"Dünyanın uydusuna .... denir.", "answer":"Ay"} ],
  "sectionE": [ {"id":"E1", "difficulty":"Orta", "left":["A...","B..."], "right":["1...","2..."], "pairs":["A-2", "B-1"]} ]
}`;
    try {
        try {
            let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.5, response_mime_type: 'application/json' }
            })
        });


        if (!response.ok) {
            if (response.status === 429) {
                console.warn('Gemini kotası doldu (429). OpenRouter yedeğine geçiliyor...');
                throw new Error('GEMINI_QUOTA_EXCEEDED');
            }
            throw new Error(`Gemini Hatası (HTTP ${response.status}): ` + await response.text());
        }

        setProgress(70, 'Gemini yanıtı alındı, havuz oluşturuluyor...');
        let data = await response.json();
        let textResponse = data.candidates[0].content.parts[0].text
            .replace(/^```json/g, '').replace(/```$/g, '').trim();
        edata = JSON.parse(textResponse);
        
    } catch (e) {
        let orKey = document.getElementById('openRouterKey').value.trim();
        let orModelStr = document.getElementById('openRouterModel').value.trim() || 'openrouter/free, google/gemma-3-27b-it:free, meta-llama/llama-3.3-70b-instruct:free, qwen/qwen3-coder:free';
        let orModels = orModelStr.split(',').map(m => m.trim());
        
        if (orKey && (e.message === 'GEMINI_QUOTA_EXCEEDED' || e.message.includes('Failed to fetch'))) {
            log('Gemini limitsizleşti veya çöktü. OpenRouter üzerinden üretiliyor...', 'warn');
            setProgress(40, 'Yedek Seçenek: OpenRouter API ile bağlantı kuruluyor...');
            
            let success = false;
            let lastError = '';

            for (let model of orModels) {
                console.log('Deneyenen OpenRouter Modeli:', model);
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s zaman aşımı
                    
                    let orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'Authorization': `Bearer ${orKey}`,
                            'HTTP-Referer': window.location.origin || 'https://sinavuretici.app',
                            'X-Title': 'Sinav Uretici',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: 'user', content: prompt }
                            ],
                            response_format: { type: "json_object" }
                        })
                    });
                    
                    clearTimeout(timeoutId);

                    if (orResponse.ok) {
                        let orData = await orResponse.json();
                        if (orData.choices && orData.choices.length > 0) {
                            let textResponse = orData.choices[0].message.content
                                .replace(/^```json/g, '').replace(/```$/g, '').trim();
                            edata = JSON.parse(textResponse);
                            success = true;
                            break;
                        } else {
                            lastError = "Boş yanıt alındı.";
                        }
                    } else {
                        lastError = await orResponse.text();
                        console.warn(`Model ${model} başarısız oldu: ${orResponse.status}`, lastError);
                    }
                } catch (err) {
                    lastError = err.message;
                    if (err.name === 'AbortError') {
                        console.warn(`Model ${model} Zaman Aşımına Uğradı (Timeout). Diğer modele geçiliyor...`);
                    } else {
                        console.warn(`Model ${model} çöktü:`, err.message);
                    }
                }
            }

            if (!success) {
                let hfKey = document.getElementById('hfKey').value.trim();
                let hfModel = document.getElementById('hfModel').value.trim() || 'Qwen/Qwen2.5-72B-Instruct';
                if (hfKey) {
                    console.warn(`Hugging Face Yedeğine Geçiliyor... Model: ${hfModel}`);
                    setProgress(50, '2. Yedek: Hugging Face API ile bağlantı kuruluyor...');
                    
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 12000); 
                        
                        let hfResponse = await fetch(`https://router.huggingface.co/hf-inference/models/${hfModel}/v1/chat/completions`, {
                            method: 'POST',
                            signal: controller.signal,
                            headers: {
                                'Authorization': `Bearer ${hfKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: hfModel,
                                messages: [{ role: 'user', content: prompt }]
                            })
                        });
                        
                        clearTimeout(timeoutId);

                        if (hfResponse.ok) {
                            let hfData = await hfResponse.json();
                            if (hfData.choices && hfData.choices.length > 0) {
                                let textResponse = hfData.choices[0].message.content
                                    .replace(/^```json/g, '').replace(/```$/g, '').trim();
                                edata = JSON.parse(textResponse);
                                success = true;
                            }
                        } else {
                            console.warn(`Hugging Face başarısız oldu: ${hfResponse.status}`);
                        }
                    } catch (hfErr) {
                        if (hfErr.name === 'AbortError') {
                            console.warn(`Hugging Face modeli Zaman Aşımına Uğradı.`);
                        } else {
                            console.warn(`Hugging Face çöktü:`, hfErr.message);
                        }
                    }
                }
            }

            if (!success) {
                console.warn(`Tüm OpenRouter ve Hugging Face modelleri başarısız oldu. Son yedek: Pollinations AI Text...`);
                setProgress(55, 'Son Yedek: Pollinations AI ile bağlantı kuruluyor (Kotaya Takılmaz)...');
                
                try {
                    let polRes = await fetch('https://text.pollinations.ai/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: prompt }],
                            jsonMode: true,
                            model: 'openai'
                        })
                    });
                    
                    if (!polRes.ok) throw new Error('Pollinations çalışmadı.');
                    
                    let textResponse = (await polRes.text())
                        .replace(/^```json/g, '').replace(/```$/g, '').trim();
                    edata = JSON.parse(textResponse);
                    // Explicitly set success for the final fallback to safely proceed to renderSelectionPool
                    success = true;
                } catch (polErr) {
                    throw new Error(`Tüm yedek sistemler (Gemini, OpenRouter, Hugging Face, Pollinations) çöktü. Hata: ${polErr.message}`);
                }
            }

            if (!success) {
                throw new Error("Soru üretimi hiçbir yedek servisle tamamlanamadı.");
            }

            setProgress(90, 'Havuz başarıyla oluşturuldu...');
            
        } else {
            if (e.message === 'GEMINI_QUOTA_EXCEEDED') {
                log('Gemini limitsizleşti, API Anahtarı yok. Sınırsız (Pollinations) yedek başlatılıyor...', 'warn');
                setProgress(40, 'Yedek: Pollinations (Anahtarsız AI) ile bağlantı kuruluyor...');
                
                try {
                    let polRes = await fetch('https://text.pollinations.ai/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: prompt }],
                            jsonMode: true,
                            model: 'openai'
                        })
                    });
                    
                    if (!polRes.ok) throw new Error('Pollinations çalışmadı.');
                    
                    let textResponse = (await polRes.text())
                        .replace(/^```json/g, '').replace(/```$/g, '').trim();
                    edata = JSON.parse(textResponse);
                    
                    setProgress(90, 'Havuz başarıyla oluşturuldu...');
                } catch (err) {
                    throw new Error('Yapay zeka (Pollinations Sınırsız Yedek) ağ bağlantısı başarısız oldu.');
                }
            } else {
                throw e;
            }
        }
    }

    edata.sectionA = edata.sectionA || [];
    edata.sectionB = edata.sectionB || [];
    edata.sectionC = edata.sectionC || [];
    edata.sectionD = edata.sectionD || [];
    edata.sectionE = edata.sectionE || [];

    log(`Havuz oluşturuldu. A:${edata.sectionA.length}, B:${edata.sectionB.length}, C:${edata.sectionC.length}, D:${edata.sectionD.length}, E:${edata.sectionE.length}`, 'ok');
    setProgress(100, 'Seçim ekranı hazırlanıyor...');

    setTimeout(() => {
        renderSelectionPool();
        document.getElementById('loadingCard').classList.add('hidden');
        document.getElementById('selectionCard').classList.remove('hidden');
    }, 500);

    } catch (e) {
        log(e.message, 'err');
        setProgress(0, 'Hata');
        showToast('Hata: ' + e.message, 'error');
        document.getElementById('loadingCard').classList.add('hidden');
        document.getElementById('settingsCard').classList.remove('hidden');
    }
}

// ─────────────────────────────────────────────────────────
function renderSelectionPool() {
    let pool = document.getElementById('poolArea');
    pool.innerHTML = '';

    function buildSection(title, dataArray, sectionPrefix, targetCount) {
        if (!dataArray || dataArray.length === 0) return;

        let header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `<span>${title} Havuzu (${dataArray.length} Soru Üretildi)</span> <span>Seçilmesi Hedeflenen Adet: ${targetCount}</span>`;
        pool.appendChild(header);

        dataArray.forEach((q, idx) => {
            let isSelected = idx < targetCount;
            let card = document.createElement('div');
            card.className = `q-card ${isSelected ? 'selected' : ''}`;
            card.dataset.section = sectionPrefix;
            card.dataset.idx = idx;

            card.onclick = function (e) {
                // Düzenleme modundayken kart tıklamasını engelle
                if (this.classList.contains('editing')) return;
                // Edit butonuna veya form elemanlarına tıklanmışsa seçimi toggle etme
                if (e.target.closest('.q-edit-btn') || e.target.closest('.q-edit-form')) return;
                let cb = this.querySelector('input[type="checkbox"]');
                cb.checked = !cb.checked;
                this.classList.toggle('selected', cb.checked);
            };

            let contentHTML = buildCardContent(q, sectionPrefix);
            let metaHTML = buildCardMeta(q, sectionPrefix);

            card.innerHTML = `
                <input type="checkbox" class="q-check" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
                <div class="q-content" id="qcontent_${sectionPrefix}_${idx}">
                    ${contentHTML}
                    <div class="q-meta">${metaHTML}</div>
                </div>
                <button class="q-edit-btn" onclick="event.stopPropagation(); toggleEditMode('${sectionPrefix}', ${idx})" title="Bu soruyu düzenle">✏️ Düzenle</button>
            `;
            pool.appendChild(card);
        });
    }

    buildSection('BÖLÜM A - Çoktan Seçmeli', edata.sectionA, 'A', targetCounts.A);
    buildSection('BÖLÜM B - Doğru / Yanlış',  edata.sectionB, 'B', targetCounts.B);
    buildSection('BÖLÜM C - Açık Uçlu',        edata.sectionC, 'C', targetCounts.C);
    buildSection('BÖLÜM D - Boşluk Doldurma',  edata.sectionD, 'D', targetCounts.D);
    buildSection('BÖLÜM E - Eşleştirme',       edata.sectionE, 'E', targetCounts.E);
}

// ─── Kart içeriği oluşturucu (görüntüleme modu) ───
function buildCardContent(q, sectionPrefix) {
    if (sectionPrefix === 'A') {
        return `<strong>${q.stem}</strong><br>
           <span style="color:#64748b; font-size:12px">A) ${q.options.A} | B) ${q.options.B} | C) ${q.options.C} | D) ${q.options.D}</span>`;
    } else if (sectionPrefix === 'B') {
        return `<strong>${q.statement}</strong>`;
    } else if (sectionPrefix === 'C') {
        return `<strong>${q.question}</strong>`;
    } else if (sectionPrefix === 'D') {
        return `<strong>${q.text}</strong>`;
    } else if (sectionPrefix === 'E') {
        let html = `<em>Eşleştirme Seti</em><br>`;
        q.left.forEach((l, i) => { html += `> ${l} --- ${q.right[i] || ''}<br>`; });
        return html;
    }
    return '';
}

// ─── Kart meta bilgisi oluşturucu ───
function buildCardMeta(q, sectionPrefix) {
    let diffClass = `diff-${q.difficulty || 'Orta'}`;
    let metaHTML = `<span class="q-badge ${diffClass}">Zorluk: ${q.difficulty || 'Orta'}</span>`;
    if (sectionPrefix === 'A') {
        metaHTML += `<span class="q-badge">Doğru Cevap: ${q.answer}</span>`;
    } else if (sectionPrefix === 'B') {
        metaHTML += `<span class="q-badge">Cevap: ${q.answer}</span>`;
    } else if (sectionPrefix === 'D') {
        metaHTML += `<span class="q-badge">Cevap: ${q.answer}</span>`;
    } else if (sectionPrefix === 'E') {
        metaHTML += `<span class="q-badge">Doğru Eşleşmeler: ${q.pairs.join(', ')}</span>`;
    }
    return metaHTML;
}

// ─── Düzenleme modunu aç / kapat ───
window.toggleEditMode = function(sectionPrefix, idx) {
    let card = document.querySelector(`.q-card[data-section="${sectionPrefix}"][data-idx="${idx}"]`);
    if (!card) return;

    // Zaten düzenleme modundaysa → iptal et
    if (card.classList.contains('editing')) {
        cancelEdit(card, sectionPrefix, idx);
        return;
    }

    card.classList.add('editing');
    let contentDiv = document.getElementById(`qcontent_${sectionPrefix}_${idx}`);
    let q = edata['section' + sectionPrefix][idx];
    let editBtn = card.querySelector('.q-edit-btn');
    editBtn.textContent = '✕ İptal';
    editBtn.style.background = '#fee2e2';
    editBtn.style.color = '#ef4444';
    editBtn.style.borderColor = '#fca5a5';

    let formHTML = '<div class="q-edit-form">';

    if (sectionPrefix === 'A') {
        formHTML += `
            <div class="q-edit-field">
                <span class="q-edit-label">Soru Kökü</span>
                <textarea class="q-edit-textarea" id="edit_stem_${sectionPrefix}_${idx}" rows="3">${escapeHtml(q.stem)}</textarea>
            </div>
            <div class="q-edit-field">
                <span class="q-edit-label">Şıklar</span>
                <div class="q-edit-options-grid">
                    <div class="q-edit-option-row">
                        <span class="q-edit-option-label">A)</span>
                        <input class="q-edit-input" id="edit_optA_${sectionPrefix}_${idx}" value="${escapeHtml(q.options.A)}">
                    </div>
                    <div class="q-edit-option-row">
                        <span class="q-edit-option-label">B)</span>
                        <input class="q-edit-input" id="edit_optB_${sectionPrefix}_${idx}" value="${escapeHtml(q.options.B)}">
                    </div>
                    <div class="q-edit-option-row">
                        <span class="q-edit-option-label">C)</span>
                        <input class="q-edit-input" id="edit_optC_${sectionPrefix}_${idx}" value="${escapeHtml(q.options.C)}">
                    </div>
                    <div class="q-edit-option-row">
                        <span class="q-edit-option-label">D)</span>
                        <input class="q-edit-input" id="edit_optD_${sectionPrefix}_${idx}" value="${escapeHtml(q.options.D)}">
                    </div>
                </div>
            </div>
            <div class="q-edit-field" style="display:flex; flex-direction:row; gap:16px; align-items:flex-end; flex-wrap:wrap;">
                <div style="flex-shrink:0;">
                    <span class="q-edit-label">Doğru Cevap</span>
                    <select class="q-edit-select" id="edit_answer_${sectionPrefix}_${idx}">
                        <option value="A" ${q.answer === 'A' ? 'selected' : ''}>A</option>
                        <option value="B" ${q.answer === 'B' ? 'selected' : ''}>B</option>
                        <option value="C" ${q.answer === 'C' ? 'selected' : ''}>C</option>
                        <option value="D" ${q.answer === 'D' ? 'selected' : ''}>D</option>
                    </select>
                </div>
                <div style="flex-shrink:0;">
                    <span class="q-edit-label">Zorluk</span>
                    <select class="q-edit-select" id="edit_diff_${sectionPrefix}_${idx}">
                        <option value="Kolay" ${q.difficulty === 'Kolay' ? 'selected' : ''}>Kolay</option>
                        <option value="Orta" ${q.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                        <option value="Zor" ${q.difficulty === 'Zor' ? 'selected' : ''}>Zor</option>
                    </select>
                </div>
            </div>
            <div class="q-edit-field">
                <span class="q-edit-label">Görsel Tasviri (imagePrompt)</span>
                <textarea class="q-edit-textarea" id="edit_imgprompt_${sectionPrefix}_${idx}" rows="2" placeholder="SVG diyagram için sahne tasviri...">${escapeHtml(q.imagePrompt || '')}</textarea>
            </div>`;
    } else if (sectionPrefix === 'B') {
        formHTML += `
            <div class="q-edit-field">
                <span class="q-edit-label">İfade</span>
                <textarea class="q-edit-textarea" id="edit_statement_${sectionPrefix}_${idx}" rows="2">${escapeHtml(q.statement)}</textarea>
            </div>
            <div class="q-edit-field" style="display:flex; flex-direction:row; gap:16px; align-items:flex-end; flex-wrap:wrap;">
                <div>
                    <span class="q-edit-label">Cevap</span>
                    <select class="q-edit-select" id="edit_answer_${sectionPrefix}_${idx}">
                        <option value="D" ${q.answer === 'D' ? 'selected' : ''}>Doğru (D)</option>
                        <option value="Y" ${q.answer === 'Y' ? 'selected' : ''}>Yanlış (Y)</option>
                    </select>
                </div>
                <div>
                    <span class="q-edit-label">Zorluk</span>
                    <select class="q-edit-select" id="edit_diff_${sectionPrefix}_${idx}">
                        <option value="Kolay" ${q.difficulty === 'Kolay' ? 'selected' : ''}>Kolay</option>
                        <option value="Orta" ${q.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                        <option value="Zor" ${q.difficulty === 'Zor' ? 'selected' : ''}>Zor</option>
                    </select>
                </div>
            </div>`;
    } else if (sectionPrefix === 'C') {
        formHTML += `
            <div class="q-edit-field">
                <span class="q-edit-label">Açık Uçlu Soru</span>
                <textarea class="q-edit-textarea" id="edit_question_${sectionPrefix}_${idx}" rows="3">${escapeHtml(q.question)}</textarea>
            </div>
            <div class="q-edit-field">
                <span class="q-edit-label">Zorluk</span>
                <select class="q-edit-select" id="edit_diff_${sectionPrefix}_${idx}">
                    <option value="Kolay" ${q.difficulty === 'Kolay' ? 'selected' : ''}>Kolay</option>
                    <option value="Orta" ${q.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                    <option value="Zor" ${q.difficulty === 'Zor' ? 'selected' : ''}>Zor</option>
                </select>
            </div>`;
    } else if (sectionPrefix === 'D') {
        formHTML += `
            <div class="q-edit-field">
                <span class="q-edit-label">Boşluk Doldurma Metni (.... = boşluk)</span>
                <textarea class="q-edit-textarea" id="edit_text_${sectionPrefix}_${idx}" rows="2">${escapeHtml(q.text)}</textarea>
            </div>
            <div class="q-edit-field" style="display:flex; flex-direction:row; gap:16px; align-items:flex-end; flex-wrap:wrap;">
                <div style="flex:1;">
                    <span class="q-edit-label">Cevap</span>
                    <input class="q-edit-input" id="edit_answer_${sectionPrefix}_${idx}" value="${escapeHtml(q.answer)}">
                </div>
                <div>
                    <span class="q-edit-label">Zorluk</span>
                    <select class="q-edit-select" id="edit_diff_${sectionPrefix}_${idx}">
                        <option value="Kolay" ${q.difficulty === 'Kolay' ? 'selected' : ''}>Kolay</option>
                        <option value="Orta" ${q.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                        <option value="Zor" ${q.difficulty === 'Zor' ? 'selected' : ''}>Zor</option>
                    </select>
                </div>
            </div>`;
    } else if (sectionPrefix === 'E') {
        formHTML += `<div class="q-edit-field"><span class="q-edit-label">Eşleştirme Çiftleri</span></div>`;
        let maxLen = Math.max(q.left.length, q.right.length);
        for (let i = 0; i < maxLen; i++) {
            formHTML += `
            <div style="display:flex; gap:8px; align-items:center;">
                <input class="q-edit-input" id="edit_left_${sectionPrefix}_${idx}_${i}" value="${escapeHtml(q.left[i] || '')}" placeholder="Sol ${i+1}" style="flex:1;">
                <span style="color:#64748b; font-weight:700;">↔</span>
                <input class="q-edit-input" id="edit_right_${sectionPrefix}_${idx}_${i}" value="${escapeHtml(q.right[i] || '')}" placeholder="Sağ ${i+1}" style="flex:1;">
            </div>`;
        }
        formHTML += `
            <div class="q-edit-field">
                <span class="q-edit-label">Doğru Eşleşmeler (virgülle, örn: A-2, B-1)</span>
                <input class="q-edit-input" id="edit_pairs_${sectionPrefix}_${idx}" value="${escapeHtml(q.pairs.join(', '))}">
            </div>
            <div class="q-edit-field">
                <span class="q-edit-label">Zorluk</span>
                <select class="q-edit-select" id="edit_diff_${sectionPrefix}_${idx}">
                    <option value="Kolay" ${q.difficulty === 'Kolay' ? 'selected' : ''}>Kolay</option>
                    <option value="Orta" ${q.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                    <option value="Zor" ${q.difficulty === 'Zor' ? 'selected' : ''}>Zor</option>
                </select>
            </div>`;
    }

    formHTML += `
        <div class="q-edit-actions">
            <button class="q-edit-save" onclick="event.stopPropagation(); saveQuestionEdit('${sectionPrefix}', ${idx})">✅ Kaydet</button>
            <button class="q-edit-cancel" onclick="event.stopPropagation(); cancelEdit(null, '${sectionPrefix}', ${idx})">İptal</button>
        </div>
    </div>`;

    contentDiv.innerHTML = formHTML;
};

// ─── Düzenlenen soruyu kaydet ───
window.saveQuestionEdit = function(sectionPrefix, idx) {
    let q = edata['section' + sectionPrefix][idx];
    let diffEl = document.getElementById(`edit_diff_${sectionPrefix}_${idx}`);
    if (diffEl) q.difficulty = diffEl.value;

    if (sectionPrefix === 'A') {
        q.stem = document.getElementById(`edit_stem_${sectionPrefix}_${idx}`).value.trim();
        q.options.A = document.getElementById(`edit_optA_${sectionPrefix}_${idx}`).value.trim();
        q.options.B = document.getElementById(`edit_optB_${sectionPrefix}_${idx}`).value.trim();
        q.options.C = document.getElementById(`edit_optC_${sectionPrefix}_${idx}`).value.trim();
        q.options.D = document.getElementById(`edit_optD_${sectionPrefix}_${idx}`).value.trim();
        q.answer = document.getElementById(`edit_answer_${sectionPrefix}_${idx}`).value;
        q.imagePrompt = document.getElementById(`edit_imgprompt_${sectionPrefix}_${idx}`).value.trim();
    } else if (sectionPrefix === 'B') {
        q.statement = document.getElementById(`edit_statement_${sectionPrefix}_${idx}`).value.trim();
        q.answer = document.getElementById(`edit_answer_${sectionPrefix}_${idx}`).value;
    } else if (sectionPrefix === 'C') {
        q.question = document.getElementById(`edit_question_${sectionPrefix}_${idx}`).value.trim();
    } else if (sectionPrefix === 'D') {
        q.text = document.getElementById(`edit_text_${sectionPrefix}_${idx}`).value.trim();
        q.answer = document.getElementById(`edit_answer_${sectionPrefix}_${idx}`).value.trim();
    } else if (sectionPrefix === 'E') {
        let newLeft = [], newRight = [];
        let maxLen = Math.max(q.left.length, q.right.length);
        for (let i = 0; i < maxLen; i++) {
            let lEl = document.getElementById(`edit_left_${sectionPrefix}_${idx}_${i}`);
            let rEl = document.getElementById(`edit_right_${sectionPrefix}_${idx}_${i}`);
            if (lEl) newLeft.push(lEl.value.trim());
            if (rEl) newRight.push(rEl.value.trim());
        }
        q.left = newLeft;
        q.right = newRight;
        let pairsStr = document.getElementById(`edit_pairs_${sectionPrefix}_${idx}`).value.trim();
        q.pairs = pairsStr.split(',').map(p => p.trim()).filter(Boolean);
    }

    // Kartı normal görünüme döndür
    let card = document.querySelector(`.q-card[data-section="${sectionPrefix}"][data-idx="${idx}"]`);
    card.classList.remove('editing');
    let editBtn = card.querySelector('.q-edit-btn');
    editBtn.textContent = '✏️ Düzenle';
    editBtn.style.background = '';
    editBtn.style.color = '';
    editBtn.style.borderColor = '';

    let contentDiv = document.getElementById(`qcontent_${sectionPrefix}_${idx}`);
    contentDiv.innerHTML = buildCardContent(q, sectionPrefix) + `<div class="q-meta">${buildCardMeta(q, sectionPrefix)}</div>`;

    showToast('Soru başarıyla güncellendi.', 'success');
};

// ─── Düzenlemeyi iptal et ───
window.cancelEdit = function(cardEl, sectionPrefix, idx) {
    let card = cardEl || document.querySelector(`.q-card[data-section="${sectionPrefix}"][data-idx="${idx}"]`);
    if (!card) return;

    card.classList.remove('editing');
    let editBtn = card.querySelector('.q-edit-btn');
    editBtn.textContent = '✏️ Düzenle';
    editBtn.style.background = '';
    editBtn.style.color = '';
    editBtn.style.borderColor = '';

    let q = edata['section' + sectionPrefix][idx];
    let contentDiv = document.getElementById(`qcontent_${sectionPrefix}_${idx}`);
    contentDiv.innerHTML = buildCardContent(q, sectionPrefix) + `<div class="q-meta">${buildCardMeta(q, sectionPrefix)}</div>`;
};

// ─── HTML escape yardımcısı ───
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────
// 3. AŞAMA: GÖRSEL SEÇİM VE ÖNİZLEME
// ─────────────────────────────────────────────────────────
function goToImageReview() {
    finalData = {
        title: edata?.title || 'Sınav',
        sectionA: [], sectionB: [], sectionC: [], sectionD: [], sectionE: []
    };

    document.querySelectorAll('.q-check:checked').forEach(cb => {
        let card = cb.closest('.q-card');
        let sec = card.dataset.section;
        let idx = parseInt(card.dataset.idx);
        finalData['section' + sec].push(edata['section' + sec][idx]);
    });

    let revArea = document.getElementById('imageReviewArea');
    revArea.innerHTML = '';

    let totalImgable = finalData.sectionA.length + finalData.sectionC.length;

    if (totalImgable === 0) {
        revArea.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b;">Sınava çoktan seçmeli veya açık uçlu soru seçilmemiş. Görsel eklenebilecek seçenek yok. Devam edebilirsiniz.</div>`;
    } else {
        // Çoktan Seçmeli — sectionA
        if (finalData.sectionA.length > 0) {
            revArea.innerHTML += `<div style="font-size:12px; font-weight:700; color:#2563eb; margin:10px 0 6px; padding:0 2px;">📝 Çoktan Seçmeli Sorular</div>`;
            finalData.sectionA.forEach((q, i) => {
                q.finalImgSrc = null;
                revArea.appendChild(buildImageCard(q, i + 1, 'A', q.stem, q.imagePrompt || ''));
            });
        }

        // Açık Uçlu — sectionC
        if (finalData.sectionC.length > 0) {
            revArea.innerHTML += `<div style="font-size:12px; font-weight:700; color:#059669; margin:16px 0 6px; padding:0 2px;">💬 Açık Uçlu Sorular</div>`;
            finalData.sectionC.forEach((q, i) => {
                q.finalImgSrc = null;
                revArea.appendChild(buildImageCard(q, i + 1, 'C', q.question, q.question));
            });
        }
    }

    document.getElementById('selectionCard').classList.add('hidden');
    document.getElementById('imageSelectionCard').classList.remove('hidden');
    window.scrollTo(0, 0);
}

// Görsel kartı oluşturucu — sectionA ve sectionC için ortak
function buildImageCard(q, num, sec, stemText, imageHint) {
    let c = document.createElement('div');
    c.className = 'img-review-card';
    let secColor = sec === 'A' ? '#7c3aed' : '#059669';
    c.innerHTML = `
        <div class="img-r-stem"><b>${sec === 'A' ? 'Soru' : 'Açık Uçlu'} ${num}:</b> ${stemText}</div>
        <div class="img-r-controls" style="flex-wrap:wrap; gap:6px;">
            <input type="text" class="img-r-input" id="imginp_${sec}_${num}" value="${imageHint}" placeholder="Sahne tasviri / ek talimat (opsiyonel)" style="min-width:180px;">
            <button class="btn" style="padding:8px 11px; font-size:12px; background:#7c3aed; color:white; border:none; white-space:nowrap;" onclick="loadImage(${num},'silicon','${sec}')">🎨 Silicon AI</button>
            <button class="btn btn-secondary" style="padding:8px 11px; font-size:12px; background:#e0edff; border-color:#2563eb; color:#1e3a5f; white-space:nowrap;" onclick="loadImage(${num},'svg','${sec}')">📐 SVG Diyagram</button>
            <label class="btn btn-secondary" style="padding:8px 11px; font-size:12px; background:#f0fdf4; border-color:#059669; color:#065f46; white-space:nowrap; cursor:pointer;">
                📁 Dosyadan Yükle
                <input type="file" accept="image/*" style="display:none;" onchange="loadFileImage(event, ${num}, '${sec}')">
            </label>
            <button class="remove-img-btn hidden" id="imgremove_${sec}_${num}" title="Görseli Kaldır" onclick="removeImage(${num},'${sec}')">✕ Kaldır</button>
        </div>
        <div style="font-size:10.5px; color:#94a3b8; margin-top:-2px; margin-bottom:2px;">
            <span style="color:#7c3aed;">🎨 Silicon AI</span>: Flux1-Schnell &nbsp;|&nbsp;
            <span style="color:#2563eb;">📐 SVG</span>: Geometrik &nbsp;|&nbsp;
            <span style="color:#059669;">📁 Dosya</span>: JPG/PNG/SVG
        </div>
        <div class="img-r-preview-area">
            <span class="img-r-loader hidden" id="imgloader_${sec}_${num}">⏳ Görsel Üretiliyor...</span>
            <span style="color:#cbd5e1; font-size:12px;" id="imgempty_${sec}_${num}">Görsel eklenebilir veya boş bırakılabilir.</span>
            <img id="imgpreview_${sec}_${num}" class="img-r-preview-img" alt="Önizleme">
        </div>
    `;
    return c;
}

// Dosyadan görsel yükleme
window.loadFileImage = function(event, num, sec = 'A') {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let dataUrl = e.target.result;
        let imgEl     = document.getElementById('imgpreview_' + sec + '_' + num);
        let emptyMsg  = document.getElementById('imgempty_' + sec + '_' + num);
        let removeBtn = document.getElementById('imgremove_' + sec + '_' + num);

        imgEl.src = dataUrl;
        imgEl.style.display = 'block';
        emptyMsg.classList.add('hidden');
        removeBtn.classList.remove('hidden');
        finalData['section' + sec][num - 1].finalImgSrc = dataUrl;
    };
    reader.readAsDataURL(file);
};


// ─────────────────────────────────────────────────────────
// 4a. YARDIMCI FONKSİYON: FALLBACK ÖZELLİKLİ İNGİLİZCE ÇEVİRİ
// ─────────────────────────────────────────────────────────
async function translateToEnglish(sceneHint, translationPrompt) {
    let geminiApiKey = document.getElementById('geminiKey').value.trim();
    let orKey = document.getElementById('openRouterKey').value.trim();
    let orModelStr = document.getElementById('openRouterModel').value.trim() || 'openrouter/free, google/gemma-3-27b-it:free, meta-llama/llama-3.3-70b-instruct:free, qwen/qwen3-coder:free';
    let orModels = orModelStr.split(',').map(m => m.trim());
    
    let englishPrompt = sceneHint; // Default fallback in case of all failures
    
    // 1. Önce Gemini (Google) API ile dene
    if (geminiApiKey) {
        try {
            let transResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: translationPrompt }] }],
                    generationConfig: { temperature: 0.3 }
                })
            });

            if (transResponse.ok) {
                let transData = await transResponse.json();
                return transData.candidates[0].content.parts[0].text.trim();
            } else {
                console.warn('Gemini çevirisi kotaya takıldı veya hata verdi. OpenRouter deneniyor...');
            }
        } catch (e) {
            console.warn('Gemini ağ hatası:', e.message);
        }
    }

    // 2. Fallback: OpenRouter API ile dene
    if (orKey) {
        for (let model of orModels) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s çeviri zaman aşımı
                
                let orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Authorization': `Bearer ${orKey}`,
                        'HTTP-Referer': window.location.origin || 'https://sinavuretici.app', // Required by OpenRouter generally
                        'X-Title': 'Sinav Uretici',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'user', content: translationPrompt }
                        ]
                    })
                });
                
                clearTimeout(timeoutId);

                if (orResponse.ok) {
                    let orData = await orResponse.json();
                    if (orData.choices && orData.choices.length > 0) {
                        return orData.choices[0].message.content.trim();
                    }
                } else {
                    console.warn(`OpenRouter çevirisi başarısız oldu (${model}):`, await orResponse.text());
                }
            } catch (e) {
                console.warn(`OpenRouter ağ hatası veya zaman aşımı (${model}):`, e.message);
            }
        }
    }
    
    // 2.5 Yedek: Hugging Face API (Çeviri İçin)
    let hfKey = document.getElementById('hfKey').value.trim();
    let hfModel = document.getElementById('hfModel').value.trim() || 'Qwen/Qwen2.5-72B-Instruct';
    if (hfKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            let hfResponse = await fetch(`https://router.huggingface.co/hf-inference/models/${hfModel}/v1/chat/completions`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${hfKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: hfModel,
                    messages: [{ role: 'user', content: translationPrompt }]
                })
            });
            
            clearTimeout(timeoutId);

            if (hfResponse.ok) {
                let hfData = await hfResponse.json();
                if (hfData.choices && hfData.choices.length > 0) {
                    return hfData.choices[0].message.content.trim();
                }
            } else {
                console.warn(`Hugging Face çevirisi başarısız oldu:`, await hfResponse.text());
            }
        } catch (e) {
            console.warn(`Hugging Face ağ hatası veya zaman aşımı:`, e.message);
        }
    }
    
    // 3. Son Çare: Pollinations Text (Anahtarsız, limitsiz)
    try {
        let pRes = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: translationPrompt }],
                model: 'openai'
            })
        });
        if (pRes.ok) {
            return (await pRes.text()).trim();
        }
    } catch (e) {
        console.warn('Pollinations çevirisi de başarısız.', e.message);
    }

    // 4. Her şey başarısız olursa orijinal Türkçe metinle geri dön
    console.warn('Tüm çeviri servisleri başarısız. Orijinal Türkçe metin kullanılacak.');
    // Pollinations URL'inin patlamaması (URI Too Long) için kırpıyoruz
    return englishPrompt.substring(0, 400);
}

// ─────────────────────────────────────────────────────────
// 4b. AI IMAGE GENERATION — Gerçek PNG Görsel Üretimi (Gemini/OR Çeviri + SiliconFlow FLUX.1-schnell)
// ─────────────────────────────────────────────────────────
async function loadSiliconImage(num, sec = 'A') {
    let siliconApiKey = document.getElementById('siliconKey').value.trim();
    if (!siliconApiKey) throw new Error('SiliconFlow API Anahtarı gereklidir.');

    let id    = sec + '_' + num;
    let qData = finalData['section' + sec][num - 1];
    if (!qData) return;

    let topic     = document.getElementById('ct').value.trim();
    let grade     = document.getElementById('cg').value.replace(/[^0-9]/g, '');
    let stem      = qData.stem || qData.question || '';
    let extraHint = document.getElementById('imginp_' + id).value.trim();
    let sceneHint = extraHint || qData.imagePrompt || stem;

    let imgEl     = document.getElementById('imgpreview_' + id);
    let loader    = document.getElementById('imgloader_' + id);
    let emptyMsg  = document.getElementById('imgempty_' + id);
    let removeBtn = document.getElementById('imgremove_' + id);

    loader.classList.remove('hidden');
    loader.innerHTML = '⏳ 1/2: Sahne İngilizceye çevriliyor...';
    emptyMsg.classList.add('hidden');
    imgEl.style.display = 'none';
    removeBtn.classList.add('hidden');

    let translationPrompt = `You are an expert SCIENTIFIC ILLUSTRATOR and prompt engineer for AI image generation.
I need you to write a HIGHLY DETAILED, SCIENTIFICALLY ACCURATE, purely ENGLISH image generation prompt for the FLUX.1-schnell model.
The image is for a ${grade}th grade Turkish science/physics/biology textbook.

SCENE DESCRIBED IN TURKISH:
"${sceneHint}"

CONTEXT — Subject: ${topic}
QUESTION STEM: "${stem}"

YOUR PRIMARY MISSION — UNIVERSAL SCIENTIFIC ACCURACY:
BEFORE writing the prompt, deeply analyze the scientific domain (Physics, Chemistry, Biology, Earth Science) of the scene. Determine the critical elements:
- What are the main subjects (animals, plants, laboratory equipment, celestial bodies, physical forces)?
- What is the LOGICAL and SCIENTIFIC relationship between them? (e.g. prey-predator, circuit connections, cause-and-effect of a force).
- SPATIAL ARRANGEMENT: Where should each element be placed to make the scientific concept instantly clear? Explicitly state left, right, top, bottom, and background positions.

MANDATORY RULES FOR THE PROMPT:
1. SCIENTIFIC CORRECTNESS: Absolutely no scientific impossibilities. (e.g., if there's a shadow, the light source must logically cast it from the opposite direction; if it's a food chain, show correct natural hierarchy; if it's an electric circuit, wires must clearly connect components).
2. SPATIAL CLARITY: Never let the AI guess the arrangement. Use strong directional language: "positioned on the left", "placed directly above", "connected to the right side".
3. PERSPECTIVE: Choose the best angle to teach the concept. Usually, a SIDE VIEW (lateral perspective) is best for lab experiments to show clear cause-and-effect.
4. BACKGROUND: Provide a context-appropriate background (a clean laboratory bench, a natural ecosystem habitat, deep space, etc.) without cluttering the main subjects.
5. STYLE: "highly detailed 3D render, soft educational illustration style, vivid colors, professional scientific textbook illustration".
6. NO TEXT, NO LABELS, NO NUMBERS, NO WORDS in the image.
7. Output ONLY the final English prompt string. No explanation, no markdown.`;

    let englishPrompt = await translateToEnglish(sceneHint, translationPrompt);

    loader.innerHTML = '⏳ 2/2: Görsel oluşturuluyor (SiliconFlow)...';

    // 2. ADIM: SILICONFLOW API İLE GÖRSEL ÜRET (FLUX.1-schnell)
    let finalUrl = "";
    try {
        let genResponse = await fetch('https://api.siliconflow.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${siliconApiKey}`
            },
            body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell",
                prompt: englishPrompt,
                image_size: "1024x1024",
                batch_size: 1,
                num_inference_steps: 4
            })
        });

        if (!genResponse.ok) {
            let errText = await genResponse.text();
            throw new Error(`SiliconFlow API hatası (${genResponse.status}): ` + errText.substring(0, 200));
        }

        let genData = await genResponse.json();
        if (!genData.images || !genData.images[0] || !genData.images[0].url) {
            throw new Error('SiliconFlow görsel URL si döndürmedi.');
        }
        finalUrl = genData.images[0].url;
    } catch (e) {
        throw new Error('Görsel üretimi başarısız oldu: ' + e.message);
    }

    return new Promise((resolve, reject) => {
        imgEl.onload = () => {
            loader.classList.add('hidden');
            imgEl.style.display = 'block';
            removeBtn.classList.remove('hidden');
            finalData['section' + sec][num - 1].finalImgSrc = finalUrl;
            resolve();
        };
        imgEl.onerror = () => reject(new Error('Görsel render edilemedi.'));
        imgEl.src = finalUrl;
    });
}

// ─────────────────────────────────────────────────────────
// 4c. KISMI KALDIRILDI (Pollinations Görsel)
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// 4d. GEMİNİ SVG — Geometrik Diyagram (API key gerekir)
// ─────────────────────────────────────────────────────────
async function loadSvgImage(num, sec = 'A') {
    let apiKey = document.getElementById('geminiKey').value.trim();
    if (!apiKey) throw new Error('SVG modu için Gemini API Anahtarı gereklidir.');

    let qData = finalData['section' + sec][num - 1];
    if (!qData) return;

    let id        = sec + '_' + num;
    let topic     = document.getElementById('ct').value.trim();
    let grade     = document.getElementById('cg').value;
    let stem      = qData.stem || qData.question || '';
    let extraHint = document.getElementById('imginp_' + id).value.trim();
    let sceneHint = extraHint || qData.imagePrompt || '';

    let sub       = document.getElementById('csub')?.value || 'Genel';

    let promptStr = `Sen MEB / Lise / Üniversite müfredatına tam hakim, ulusal çapta basılacak "Premium" eğitim kitapları resimleyen usta bir dijital vektör illüstratörü ve "SVG" geliştirme uzmanısın.

═══════════════════════════════════════════════════════
📋 GİRDİ BİLGİLERİ
═══════════════════════════════════════════════════════
Ders Adı: ${sub}
Konu Bütünlüğü: ${topic}
İlgili Sınıf Seviyesi: ${grade}
Soru Metni: "${stem}"
Görsel Sahne Tasviri: "${sceneHint || 'Yukarıdaki soruyu derince analiz ederek en uygun deney düzeneğini, grafiği, yaşam alanını, diyagramı, haritayı veya soyut modeli kendin tasarla ve kodla.'}"

═══════════════════════════════════════════════════════
🧠 ADIM 1 — ÖN-ANALİZ (ÖNCELİKLE BUNU YAP, SONRA ÇİZ)
═══════════════════════════════════════════════════════
SVG kodunu yazmaya başlamadan ÖNCE zihinsel olarak şunları planla:

1. BİLİMSEL ALAN TESPİTİ: Soru hangi bilim dalına ait? (Fizik, Kimya, Biyoloji, Matematik, Coğrafya, Tarih...)
2. ANA NESNELER: Sahnede hangi nesneler olmalı? Her birini listele.
3. NESNELER ARASI İLİŞKİ: Bu nesneler arasında bilimsel/mantıksal ilişki nedir? (neden-sonuç, hiyerarşi, bağlantı, yön)
4. MEKÂNSAL YERLEŞİM PLANI: ViewBox (1000×600) içinde her nesne nereye yerleşecek?
   - Sol bölge (x: 50-350): ...
   - Orta bölge (x: 350-650): ...
   - Sağ bölge (x: 650-950): ...
   - Üst bölge (y: 20-200): ...
   - Alt bölge / zemin (y: 400-580): ...
5. BAKIŞ AÇISI: En uygun perspektif hangisi? (Yandan profil, kuşbakışı, izometrik 3/4, kesit görünümü)
6. RENK PALETİ: Konuya göre uyumlu renk paleti seç:
   → Fizik/Mekanik: Koyu mavi (#1e3a5f), turuncu (#f97316), gri-metal (#94a3b8), beyaz
   → Kimya/Laboratuvar: Turkuaz (#06b6d4), mor (#7c3aed), cam mavisi (#bfdbfe), alev turuncusu (#fb923c)
   → Biyoloji/Ekosistem: Yeşil tonları (#15803d, #86efac), toprak kahvesi (#92400e), gökyüzü mavisi (#7dd3fc)
   → Matematik/Geometri: Kırmızı (#dc2626), mavi (#2563eb), siyah (#1e293b), açık gri (#e2e8f0)
   → Coğrafya/Uzay: Koyu lacivert (#0f172a), altın sarısı (#fbbf24), toprak yeşili (#365314)

═══════════════════════════════════════════════════════
🚨 ADIM 1.5 — İNSAN FİGÜRÜ KRİTİK KURALLARI
═══════════════════════════════════════════════════════
SVG ile insan çizmek ÇOK ZORDUR. Bu yüzden şu katı kuralları uygula:

🔴 YASAK — ASLA YAPMA:
  → Anatomik insan çizmeye ÇALIŞMA (kas detayları, parmaklar, yüz ifadeleri)
  → Gerçekçi vücut oranları hedefleme — BAŞARISIZ OLACAK
  → Hareketli poz çizmeye çalışma (koşan, zıplayan, tekme atan figür)
  → İnsan gövdesini birden fazla organik path ile oluşturmaya çalışma

🟢 İZİN VERİLEN — İNSAN GEREKİYORSA:
  → SADECE geometrik/ikon tarzı basit siluet kullan:
     • Kafa = <circle r="18-22"> (KÜÇÜK, gövdenin 1/4'ü kadar)
     • Gövde = <rect> veya <path> ile basit trapez (genişlik: 40-60px, yükseklik: 80-100px)
     • Kollar = <line> veya <path> ile basit çizgiler (stroke-width: 6-8)
     • Bacaklar = <line> veya <path> ile basit çizgiler (stroke-width: 7-9)
     • Tüm parçalar TEN RENGİ (#fcd5b4 veya #d4a574) değil, TEK DÜZ RENK (#475569 koyu gri veya siyah siluet) olmalı
  → Figür boyutu: Toplam yükseklik 180-250px arası (viewBox 600px yüksekliğinde)
  → Figür zemin çizgisinin ÜSTÜNDE durmalı (ayaklar tam zemin y koordinatına değmeli)

📐 ORAN TABLOSU (ZORUNLU):
  → Kafa çapı ≤ gövde genişliğinin 1/2'si
  → Kollar gövde yüksekliğinin %70'i kadar uzun
  → Bacaklar gövde yüksekliğiyle eşit veya biraz uzun
  → Eğer nesne tutuyorsa (top, halter vb.): nesne boyutu ≤ figür boyunun 1/3'ü

🔗 NESNE BAĞLANTI KURALI (ÇOK ÖNEMLİ):
  → Figürün tuttuğu nesneler (halter, top, kalem vb.) figüre FİZİKSEL OLARAK BAĞLI olmalı
  → Bağlantı yöntemi: Nesnenin koordinatları kolun/elin bitiş koordinatıyla AYNI olmalı
  → YASAKK: Nesne havada süzülen ayrı bir obje olarak çizilmesi
  → Eğer nesne yerdeyse (top, kutu): Nesnenin alt kenarı = zemin y koordinatı

✅ EN İYİ YAKLAŞIM: İnsan figürü yerine BİLİMSEL DİYAGRAM çiz!
  → Spor/Fizik: Kuvvet vektörleri, yörünge eğrileri, enerji dönüşüm şemaları
  → Sağlık/Biyoloji: Organ diyagramları, hücre kesitleri
  → Günlük hayat: Nesnelerin kendileri (araç, top, araç-gereç) + fizik okları

═══════════════════════════════════════════════════════
⚠️ ADIM 2 — KATMAN KATMAN KOMPOZİSYON PLANI
═══════════════════════════════════════════════════════
SVG'yi şu katman sırasıyla oluştur:

KATMAN 1 — ARKA PLAN (en altta):
  → Deney sahnesi: Düz renk veya hafif gradyanlı duvar + tezgah/masa
  → Doğa sahnesi: Gökyüzü gradyanı + çim/toprak + ağaçlar (basit siluet)
  → Uzay sahnesi: Koyu yıldızlı derinlik (küçük beyaz daireler)
  → Matematik: Temiz kare ızgara veya düz beyaz zemin
  → Arka plan viewBox'un tamamını kaplasın (0,0 → 1000,600)

KATMAN 2 — ZEMİN / PLATFORM:
  → Laboratuvar masası: y=450-480 civarında, gri-kahverengi gradyan ile kalınlık hissi
  → Doğa zemini: y=480-600 civarında, yeşil çim dokusu veya toprak rengi
  → Nesnelerin DURACağı yüzey — nesneler bu yüzeyin ÜSTÜNe yerleştirilmeli
  → ÖNEMLİ: Zemin çizgisi y koordinatını belirle (ör: y=480) ve TÜM nesneler + figürler bu çizginin üstüne oturmalı

KATMAN 3 — ANA NESNELER (sahnenin yıldızları):
  → Her nesne EN AZ 80x80 piksel büyüklüğünde olmalı (görünür olması için)
  → Nesneler arasında EN AZ 30px boşluk bırak (üst üste binmesin)
  → Her nesne birden fazla <path>, <rect>, <ellipse>, <circle> kombinasyonuyla DETAYLI çizilmeli
  → Tek bir dikdörtgen veya daire ile nesne temsil etme — DETAY VER!
  → BAĞLANTI: Birbirine bağlı nesneler (kablo-priz, halter-el, balon-ip) aynı koordinatları paylaşmalı

KATMAN 4 — DETAYLAR VE DOKULAR:
  → Cam yüzeyler: yarı saydam katmanlar (opacity 0.2-0.4), parlama efekti (beyaz elips)
  → Sıvılar: eliptik üst yüzey + silindirik gövde, içinde küçük baloncuklar (3-5 adet küçük daire)
  → Metal: lineer gradyanlarla parlak yansıma efekti
  → Canlılar: Kıvrımlı path'ler, organik formlar, doku detayları

KATMAN 5 — ENERJİ, HAREKET, YÖN GÖSTERGELERİ:
  → Işık ışınları: Sarı/turuncu yarı saydam çizgiler, ışık kaynağından dışa doğru
  → Kuvvet okları: Kalın renkli çizgi + polygon ok başı (en az 8px genişliğinde)
  → Isı/sıcaklık: Kırmızıdan maviye gradyan bantları
  → Hareket: Kesikli çizgiler (stroke-dasharray) veya titreşim dalgaları

KATMAN 6 — GÖLGELER VE PARLAMA (en üstte):
  → Her ana nesnenin altında yarı saydam koyu elips gölge (opacity 0.15-0.25)
  → Cam/metal nesnelerin üzerinde küçük beyaz parlama noktası (radialGradient ile)

═══════════════════════════════════════════════════════
🎨 ADIM 3 — GELİŞMİŞ SVG TEKNİKLERİ (MUTLAKA KULLAN)
═══════════════════════════════════════════════════════
<defs> bloğu içinde şunları MUTLAKA tanımla:

a) GRADYANLAR — her sahne için EN AZ 3 farklı gradyan:
   <linearGradient id="grad_sky" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0%" stop-color="#87CEEB"/><stop offset="100%" stop-color="#E0F2FE"/>
   </linearGradient>

b) GÖLGE FİLTRESİ — nesnelere derinlik katmak için:
   <filter id="shadow"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-opacity="0.2"/></filter>
   Tüm ana nesnelere filter="url(#shadow)" uygula.

c) PARLAMA FİLTRESİ — cam / metal yüzeyler için:
   <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>

d) DOKU DESENLERİ (isteğe bağlı, zenginlik katmak için):
   <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
     <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
   </pattern>

e) CLIP PATH — karmaşık şekillerde kırpma için:
   <clipPath id="beaker_clip"><rect x=".." y=".." width=".." height=".." rx="5"/></clipPath>

═══════════════════════════════════════════════════════
🚫 ADIM 4 — KATI KURALLAR (ASLA İHLAL ETME)
═══════════════════════════════════════════════════════
1. [YASAK] SVG İÇİNDE KESİNLİKLE <text>, HARF VEYA RAKAM KULLANILMAYACAK!
2. [FORMAT] Yalnızca <svg> ile başlayıp </svg> ile biten saf XML kodunu döndür. Markdown, açıklama veya kod bloğu işareti YAZMA.
3. [ÖLÇÜ] viewBox="0 0 1000 600" kullan.
4. [MİNİMUM DETAY] Her SVG EN AZ 40 satır kod olmalı. Tek bir dikdörtgen ve daire ile sahne oluşturma!
5. [BİLİMSEL DOĞRULUK] Fiziksel imkansızlıklar YASAK:
   → Gölge ışık kaynağının KARŞI tarafına düşmeli
   → Nesneler havada süzülmemeli, zemin/masa üzerine oturmalı
   → Sıvılar kabın dışına taşmamalı, seviye kabın yarısını geçmemeli
   → Optik düzeneklerde ışık düz çizgide gitmeli
   → Besin zinciri doğru hiyerarşide olmalı (üretici → tüketici → ayrıştırıcı)
   → Elektrik devresinde kablolar kesintisiz bağlanmalı
6. [MEKÂNSAL UYUM] Nesneler mantıklı dizilimde olmalı, üst üste binmemeli.
7. [ORAN KONTROLÜ] Nesneler birbirine göre GERÇEKÇI boyutta olmalı:
   → Bir futbol topu bir kale direğinin 1/5'i kadar olmalı, daha büyük değil
   → İnsan figürü varsa: kafa ≤ gövdenin yarısı, toplam boy zemin-göğüs mesafesinin 2 katı
   → Nesne ≤ figür boyunun 1/3'ü (eğer figür nesneyi tutuyorsa)
8. [FİZİKSEL BAĞLANTI] Birbirine bağlı nesneler AYNI koordinatları paylaşmalı:
   → Figürün eli + tuttuğu nesne → aynı (x,y) noktasında birleşmeli
   → Kablolar → başlangıç ve bitiş noktaları cihazlara değmeli
   → Nesneler zeminde → alt kenarı zemin y koordinatına eşit olmalı
9. [İNSAN FİGÜRÜ] Anatomik insan çizmeye ÇALIŞMA!
   → İnsan gerekiyorsa SADECE geometrik siluet (daire kafa + dikdörtgen gövde + çizgi kol/bacak)
   → Ten rengi KULLANMA, koyu gri (#475569) veya siyah siluet yap
   → Kas, parmak, yüz detayı YASAK

═══════════════════════════════════════════════════════
✅ KALİTE KONTROL — SVG'NİN KABUL KRİTERLERİ
═══════════════════════════════════════════════════════
Ürettiğin SVG şu özelliklere sahip olmalı:
✓ En az 3 farklı gradyan tanımlı (<defs> içinde)
✓ En az 1 gölge filtresi uygulanmış
✓ Arka plan viewBox'un tamamını kaplıyor
✓ Ana nesneler yeterince BÜYÜK ve GÖRÜNÜR (min 80x80px)
✓ Nesneler arasında mantıklı boşluk ve hizalama var
✓ Hiçbir <text> elementi yok
✓ Bilimsel açıdan %100 doğru
✓ En az 40 satır SVG kodu

Asıl hedef: MEB kitaplarındaki renkli, hacimli, ultra profesyonel ve BİLİMSEL AÇIDAN %100 DOĞRU sanat eserlerinden birini yaratmak.
ŞİMDİ SADECE SVG KODUNU VER — başka hiçbir şey yazma.`;

    let data, textRes;
    try {
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptStr }] }],
                generationConfig: { temperature: 0.25 }
            })
        });

        if (!response.ok) {
            if (response.status === 429) throw new Error('GEMINI_QUOTA_EXCEEDED');
            throw new Error(`API hatası (${response.status}): ` + await response.text());
        }

        data = await response.json();
        textRes = data.candidates[0].content.parts[0].text;
    } catch (e) {
        let orKey = document.getElementById('openRouterKey').value.trim();
        let orModelStr = document.getElementById('openRouterModel').value.trim() || 'openrouter/free, google/gemma-3-27b-it:free, meta-llama/llama-3.3-70b-instruct:free, qwen/qwen3-coder:free';
        let orModels = orModelStr.split(',').map(m => m.trim());
        
        if (orKey && (e.message === 'GEMINI_QUOTA_EXCEEDED' || e.message.includes('Failed to fetch'))) {
            console.warn('Gemini SVG kotası doldu. OpenRouter yedeği deneniyor...');
            let success = false;
            let lastError = '';
            
            for (let model of orModels) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s zaman aşımı
                    
                    let orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'Authorization': `Bearer ${orKey}`,
                            'HTTP-Referer': window.location.origin || 'https://sinavuretici.app',
                            'X-Title': 'Sinav Uretici',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: promptStr }]
                        })
                    });
                    
                    clearTimeout(timeoutId);

                    if (orResponse.ok) {
                        data = await orResponse.json();
                        textRes = data.choices[0].message.content;
                        success = true;
                        break;
                    } else {
                        lastError = await orResponse.text();
                        console.warn(`SVG OpenRouter Modeli ${model} başarısız oldu.`, lastError);
                    }
                } catch (err) {
                    lastError = err.message;
                    if (err.name === 'AbortError') {
                        console.warn(`SVG Modeli ${model} Zaman Aşımına Uğradı.`);
                    } else {
                        console.warn(`SVG Modeli ${model} çöktü:`, err.message);
                    }
                }
            }
            
            if (!success) {
                let hfKey = document.getElementById('hfKey').value.trim();
                let hfModel = document.getElementById('hfModel').value.trim() || 'Qwen/Qwen2.5-72B-Instruct';
                if (hfKey) {
                    console.warn(`SVG Hugging Face Yedeği deneniyor...`);
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 15000);
                        
                        let hfResponse = await fetch(`https://router.huggingface.co/hf-inference/models/${hfModel}/v1/chat/completions`, {
                            method: 'POST',
                            signal: controller.signal,
                            headers: {
                                'Authorization': `Bearer ${hfKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: hfModel,
                                messages: [{ role: 'user', content: promptStr }]
                            })
                        });
                        
                        clearTimeout(timeoutId);

                        if (hfResponse.ok) {
                            data = await hfResponse.json();
                            textRes = data.choices[0].message.content;
                            success = true;
                        } else {
                            let lastHFErr = await hfResponse.text();
                            console.warn(`SVG Hugging Face başarısız oldu.`, lastHFErr);
                        }
                    } catch (hfErr) {
                        if (hfErr.name === 'AbortError') {
                            console.warn(`SVG Hugging Face modeli Zaman Aşımına Uğradı.`);
                        } else {
                            console.warn(`SVG Hugging Face çöktü:`, hfErr.message);
                        }
                    }
                }
            }

            if (!success) {
                console.warn('Tüm OpenRouter ve Hugging Face Modelleri patladı. Son çare: Pollinations SVG Üretimi deneniyor...');
                try {
                    let pRes = await fetch('https://text.pollinations.ai/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: promptStr }],
                            model: 'openai'
                        })
                    });
                    if (pRes.ok) {
                        textRes = await pRes.text();
                        success = true;
                    }
                } catch(err) {
                   console.error('Pollinations SVG Yedekleme Hatası', err);
                }
                
                if(!success) {
                    throw new Error('Yedek (OpenRouter, Hugging Face ve Pollinations) SVG Modelleri başarısız oldu: ' + lastError);
                }
            }
        } else {
            if (e.message === 'GEMINI_QUOTA_EXCEEDED') {
                 console.warn('Gemini SVG kotası doldu. Sınırsız yedek Pollinations deneniyor...');
                 try {
                    let pRes = await fetch('https://text.pollinations.ai/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: promptStr }],
                            model: 'openai'
                        })
                    });
                    if (pRes.ok) {
                        textRes = await pRes.text();
                    } else {
                        throw new Error("Pollinations Hatası");
                    }
                 } catch(err) {
                     throw new Error('KOTA_DOLDU');
                 }
            } else {
                 throw e;
            }
        }
    }
    let svgMatch = textRes.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) throw new Error('Geçerli SVG üretilemedi: ' + textRes.substring(0, 120));

    let finalUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMatch[0]);

    id = sec + '_' + num;
    let imgEl     = document.getElementById('imgpreview_' + id);
    let loader    = document.getElementById('imgloader_' + id);
    let emptyMsg  = document.getElementById('imgempty_' + id);
    let removeBtn = document.getElementById('imgremove_' + id);

    return new Promise((resolve, reject) => {
        imgEl.onload = () => {
            loader.classList.add('hidden');
            imgEl.style.display = 'block';
            removeBtn.classList.remove('hidden');
            finalData['section' + sec][num - 1].finalImgSrc = finalUrl;
            resolve();
        };
        imgEl.onerror = () => reject(new Error('SVG görsel yüklenemedi.'));
        imgEl.src = finalUrl;
    });
}

// ─────────────────────────────────────────────────────────
// 4. ANA GÖRSEL YÜKLEME FONKSİYONU
// mode: 'silicon' | 'svg'
// ─────────────────────────────────────────────────────────
window.loadImage = async function (num, mode = 'svg', sec = 'A') {
    let id        = sec + '_' + num;
    let imgEl     = document.getElementById('imgpreview_' + id);
    let loader    = document.getElementById('imgloader_' + id);
    let emptyMsg  = document.getElementById('imgempty_' + id);
    let removeBtn = document.getElementById('imgremove_' + id);

    loader.classList.remove('hidden');
    loader.innerHTML = mode === 'silicon' ? '⏳ Hazırlanıyor...' : '⏳ SVG diyagram üretiliyor (bekleyiniz)...';
    emptyMsg.classList.add('hidden');
    imgEl.style.display = 'none';
    removeBtn.classList.add('hidden');

    try {
        if (mode === 'silicon') {
            await loadSiliconImage(num, sec);
        } else {
            await loadSvgImage(num, sec);
        }
    } catch (e) {
        loader.classList.add('hidden');
        emptyMsg.classList.remove('hidden');

        let isQuota = e.message === 'KOTA_DOLDU';
        let errMsg  = isQuota
            ? 'Google API Kotası Dolu. Biraz bekleyip tekrar dene.'
            : e.message;

        emptyMsg.innerHTML = `<span style='color:#ef4444;'>⚠️ ${errMsg}</span>`;
        imgEl.style.display = 'none';
        if (finalData['section' + sec]?.[num - 1]) finalData['section' + sec][num - 1].finalImgSrc = null;
        if (isQuota) throw e;
    }
};

window.removeImage = function (num, sec = 'A') {
    let id = sec + '_' + num;
    document.getElementById('imgpreview_' + id).style.display = 'none';
    document.getElementById('imgpreview_' + id).src = '';
    document.getElementById('imgempty_' + id).classList.remove('hidden');
    document.getElementById('imgempty_' + id).textContent = 'Görsel Kaldırıldı.';
    document.getElementById('imgremove_' + id).classList.add('hidden');
    document.getElementById('imgloader_' + id).classList.add('hidden');

    if (finalData['section' + sec]?.[num - 1])
        finalData['section' + sec][num - 1].finalImgSrc = null;
};

// ─────────────────────────────────────────────────────────
// 5. TÜM GÖRSELLERİ SIRAYLA ÜRETİM (SVG formatında otomatik)
// ─────────────────────────────────────────────────────────
window.generateAllImages = async function () {
    if (!finalData) return;

    let btn = document.querySelector('button[onclick="generateAllImages()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ SVG Görseller sırayla üretiliyor...';
    }

    // Hem sectionA hem sectionC için görsel üret
    const sections = [
        { key: 'A', list: finalData.sectionA || [] },
        { key: 'C', list: finalData.sectionC || [] }
    ];

    for (let { key, list } of sections) {
        for (let i = 0; i < list.length; i++) {
            let num = i + 1;
            let inp = document.getElementById('imginp_' + key + '_' + num);

            if (inp && inp.value.trim() !== 'iptal' && !list[i].finalImgSrc) {
                if (btn) btn.innerText = `⏳ ${key}${num} için SVG üretiliyor...`;
                let retries = 2;
                while (retries > 0) {
                    try {
                        await loadSvgImage(num, key);
                        await new Promise(r => setTimeout(r, 1500));
                        break;
                    } catch (e) {
                        if (e.message.includes('KOTA_DOLDU')) {
                            retries--;
                            if (retries > 0) {
                                if (btn) btn.innerText = `⏳ Kota dolu, ${key}${num} bekleniyor (20 sn)...`;
                                await new Promise(r => setTimeout(r, 20000));
                            }
                        } else {
                            let emptyMsg = document.getElementById('imgempty_' + key + '_' + num);
                            if (emptyMsg) emptyMsg.innerHTML = `<span style='color:#f59e0b;'>⚠️ Atlandı: ${e.message}</span>`;
                            break;
                        }
                    }
                }
            }
        }
    }

    if (btn) {
        btn.disabled = false;
        btn.innerText = '⚡ Dolu Olan Tüm Görselleri Tek Tıkla Pratik Üret';
    }
};

// ─────────────────────────────────────────────────────────
// 6. GERİ NAVIGASYON
// ─────────────────────────────────────────────────────────
function backToSelection() {
    document.getElementById('imageSelectionCard').classList.add('hidden');
    document.getElementById('selectionCard').classList.remove('hidden');
}

function backToImageReview() {
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('imageSelectionCard').classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────
// 7. SINAV DERLEME
// ─────────────────────────────────────────────────────────
function prepareFinalExam() {
    document.getElementById('imageSelectionCard').classList.add('hidden');
    buildPrintedExam();
    document.getElementById('resultCard').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function buildPrintedExam() {
    document.getElementById('examPreview').innerHTML = buildExamHTML({ studentVersion: false });
}

// Ortak HTML üretici — studentVersion:true ise cevap anahtarı dahil edilmez
function buildExamHTML({ studentVersion = false } = {}) {
    let sch = document.getElementById('csch').value;
    let yr  = document.getElementById('cyr').value;
    let gr  = document.getElementById('cg').value;
    let sub = document.getElementById('csub')?.value || 'Fen Bilimleri';

    let lenA = finalData.sectionA.length;
    let lenB = finalData.sectionB.length;
    let lenC = finalData.sectionC.length;
    let lenD = finalData.sectionD.length;
    let lenE = finalData.sectionE.length;

    // Puan değerlerini input'lardan oku (öğretmen atar)
    let totA = parseInt(document.getElementById('ptA')?.value) || 40;
    let totB = parseInt(document.getElementById('ptB')?.value) || 15;
    let totC = parseInt(document.getElementById('ptC')?.value) || 15;
    let totD = parseInt(document.getElementById('ptD')?.value) || 15;
    let totE = parseInt(document.getElementById('ptE')?.value) || 15;

    let ptsA = lenA > 0 ? Math.floor(totA / lenA) || 1 : 0;
    let ptsB = lenB > 0 ? Math.floor(totB / lenB) || 1 : 0;
    let ptsC = lenC > 0 ? Math.floor(totC / lenC) || 1 : 0;
    let ptsD = lenD > 0 ? Math.floor(totD / lenD) || 1 : 0;
    let ptsE = lenE > 0 ? Math.floor(totE / lenE) || 1 : 0;

    // Dinamik bölüm harfi atayıcı — sadece dolu bölümler A, B, C... alır
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let letterIdx = 0;
    const nextLetter = () => alphabet[letterIdx++];

    // Sınav süresi direkt kullanıcı girişinden alınır
    let totalQ = lenA + lenB + lenC + lenD + lenE;
    let examTime = document.getElementById('cduration')?.value || '40';

    // Sadece öğretmen nüshasında ibare
    let nushaLabel = studentVersion ? '' :
        '<span style="font-size:10pt; color:#64748b; font-weight:700; margin-left:8px;">(Öğretmen Nüshası)</span>';

    let h = `<div class="ep">
        <div class="eh">
            <h1>${sch}${nushaLabel}</h1>
            <h2>${gr} Sınıf — ${sub} Değerlendirme Sınavı</h2>
            <h3>${yr} Eğitim Öğretim Yılı &nbsp;|&nbsp; Süre: ${examTime} dakika</h3>
            <div class="bp">
                ${lenA > 0 ? `<span>📝 Ç.Seçmeli: ${lenA}×${ptsA}=${lenA * ptsA}p</span>` : ''}
                ${lenB > 0 ? `<span>✅ D/Y: ${lenB}×${ptsB}=${lenB * ptsB}p</span>` : ''}
                ${lenC > 0 ? `<span>💬 Açık Uçlu: ${lenC}×${ptsC}=${lenC * ptsC}p</span>` : ''}
                ${lenD > 0 ? `<span>✍️ Boşluk: ${lenD}×${ptsD}=${lenD * ptsD}p</span>` : ''}
                ${lenE > 0 ? `<span>🔗 Eşleştirme: Max ${totE}p</span>` : ''}
            </div>
            <div class="sf">
                <div class="si"><div class="sl">Adı Soyadı</div><div class="sln"></div></div>
                <div class="si"><div class="sl">Sınıf</div><div class="sln"></div></div>
                <div class="si"><div class="sl">Numara</div><div class="sln"></div></div>
                <div class="si"><div class="sl">Puan</div><div class="sln"></div></div>
            </div>
        </div>`;

    // ── Çoktan Seçmeli ──
    if (lenA > 0) {
        let L = nextLetter();
        h += `<div class="sh"><div class="shi">${L}</div><div class="sht">BÖLÜM ${L} — Çoktan Seçmeli</div><div class="shn">Her soru ${ptsA} puan</div></div>`;
        finalData.sectionA.forEach((q, i) => {
            let num    = i + 1;
            let imgSrc = q.finalImgSrc;
            h += `<div class="qb"><div class="qi"><div class="qn">${num}</div>
                <div class="qt" style="width: 100%;">
                ${imgSrc ? `<div class="qv"><img src="${imgSrc}" onerror="this.parentElement.style.display='none'" alt="Soru ${num} görseli"/><div class="qvc">Şekil ${num}</div></div>` : ''}
                <span class="qs">${q.stem}</span>
                <div class="ops">
                    <div class="op"><span class="ol">A</span>${q.options.A}</div>
                    <div class="op"><span class="ol">B</span>${q.options.B}</div>
                    <div class="op"><span class="ol">C</span>${q.options.C}</div>
                    <div class="op"><span class="ol">D</span>${q.options.D}</div>
                </div></div></div></div>`;
        });
    }

    // ── Doğru / Yanlış ──
    if (lenB > 0) {
        let L = nextLetter();
        h += `<div class="sh"><div class="shi">${L}</div><div class="sht">BÖLÜM ${L} — Doğru / Yanlış</div><div class="shn">İfade başına ${ptsB} puan</div></div>`;
        finalData.sectionB.forEach((s, i) => {
            h += `<div class="tf"><span class="tfn">${i + 1}</span>
                <span style="flex:1;font-size:10pt;">${s.statement}</span>
                <div class="tfa">( &nbsp;&nbsp;&nbsp; )</div></div>`;
        });
    }

    // ── Boşluk Doldurma ──
    if (lenD > 0) {
        let L = nextLetter();
        h += `<div class="sh"><div class="shi">${L}</div><div class="sht">BÖLÜM ${L} — Boşluk Doldurma</div><div class="shn">Boşluk başına ${ptsD} puan</div></div>`;
        finalData.sectionD.forEach((q, i) => {
            h += `<div class="bd"><span class="tfn" style="background:#2563eb">${i + 1}</span>
                <span style="flex:1;font-size:10pt;">${q.text.replace('....', ' __________________ ')}</span></div>`;
        });
    }

    // ── Eşleştirme ──
    if (lenE > 0) {
        let L = nextLetter();
        h += `<div class="sh"><div class="shi">${L}</div><div class="sht">BÖLÜM ${L} — Eşleştirme</div><div class="shn">Max ${totE} puan</div></div>`;
        finalData.sectionE.forEach(q => {
            h += `<div class="es" style="margin-bottom:15px; flex-direction:column; align-items:stretch;">
                   <div style="font-size:9.5pt; color:#64748b; margin-bottom:8px; text-align:center;">Semboller ile rakamları parantez içinde eşleştiriniz.</div>
                   <div style="display:flex; justify-content:space-around;">
                   <div style="display:flex; flex-direction:column; gap:8px;">`;
            q.left.forEach(l  => { h += `<div>( &nbsp;&nbsp;&nbsp; ) &nbsp; ${l}</div>`; });
            h += `</div><div style="display:flex; flex-direction:column; gap:8px;">`;
            q.right.forEach(r => { h += `<div>${r}</div>`; });
            h += `</div></div></div>`;
        });
    }

    // ── Açık Uçlu ──
    if (lenC > 0) {
        let L = nextLetter();
        h += `<div class="sh"><div class="shi">${L}</div><div class="sht">BÖLÜM ${L} — Açık Uçlu</div><div class="shn">Soru başına ${ptsC} puan</div></div>`;
        finalData.sectionC.forEach((q, i) => {
            let imgSrc = q.finalImgSrc;
            h += `<div class="ob"><div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <span class="on">${i + 1}</span>
                <div style="flex:1;">
                ${imgSrc ? `<div class="qv"><img src="${imgSrc}" onerror="this.parentElement.style.display='none'" alt="Açık uçlu ${i+1} görseli"/><div class="qvc">Şekil ${i+1}</div></div>` : ''}
                <span style="font-size:10pt;">${q.question}</span>
                </div></div>
                <div class="al"></div><div class="al"></div><div class="al"></div></div>`;
        });
    }

    // ── CEVAP ANAHTARI — sadece öğretmen nüshasında ──
    if (!studentVersion) {
        h += `<div class="ak"><div class="akt">📋 CEVAP ANAHTARI</div>`;
        if (lenA > 0) h += `<div class="akr"><b>Çoktan Seçmeli:</b> ${finalData.sectionA.map((q, i) => `<span>${i + 1}.${q.answer}</span>`).join(' | ')}</div>`;
        if (lenB > 0) h += `<div class="akr" style="margin-top:5px;"><b>Doğru/Yanlış:</b> ${finalData.sectionB.map((q, i) => `<span>${i + 1}.${q.answer}</span>`).join(' | ')}</div>`;
        if (lenD > 0) h += `<div class="akr" style="margin-top:5px;"><b>Boşluk Doldurma:</b> ${finalData.sectionD.map((q, i) => `<span>${i + 1}.${q.answer}</span>`).join(' | ')}</div>`;
        if (lenE > 0) finalData.sectionE.forEach(q => {
            h += `<div class="akr" style="margin-top:5px;"><b>Eşleştirme:</b> ${q.pairs.join(', ')}</div>`;
        });
        h += `</div>`;
    }

    let teacher = document.getElementById('cteacher')?.value || 'Öğretmen';
    let examDate = document.getElementById('cdate')?.value 
        ? new Date(document.getElementById('cdate').value).toLocaleDateString('tr-TR', {day:'numeric', month:'long', year:'numeric'})
        : new Date().toLocaleDateString('tr-TR', {day:'numeric', month:'long', year:'numeric'});

    h += `<div class="ft">
        <span>🏫 ${sch}</span>
        <span>📅 ${examDate}</span>
        <span>✍️ Hazırlayan: ${teacher}</span>
    </div></div>`;

    return h;
}


// ─────────────────────────────────────────────────────────
// 8a. YAZDIR — Öğretmen Nüshası (Cevap Anahtarı ile)
// ─────────────────────────────────────────────────────────
function doPrint() {
    let w   = window.open('', '_blank');
    let css = document.querySelector('link[rel="stylesheet"]').href;
    let html = buildExamHTML({ studentVersion: false });

    w.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
    <link rel="stylesheet" href="${css}">
    <style>
      @media print { body{margin:0;} @page{margin:10mm 15mm;} }
      body {font-family:system-ui,sans-serif;background:white;padding:8mm 12mm;}
      .noprint{position:fixed;top:0;left:0;right:0;background:#1e3a5f;padding:10px 20px;display:flex;gap:10px;align-items:center;z-index:999;box-shadow:0 4px 6px rgba(0,0,0,0.1);}
      .noprint button{padding:8px 18px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;}
      .pb{background:#059669;color:white;} .cb{background:#dc2626;color:white;}
      .noprint span{color:white;font-size:14px;font-weight:600;flex:1;}
      @media print{ .noprint{display:none!important;} body{padding:0;} }
    </style></head><body class="exam-print">
    <div class="noprint">
      <span>📋 Öğretmen Nüshası — Cevap Anahtarı Dahil</span>
      <button class="pb" onclick="window.print()">🖨️ Yazdır / PDF Kaydet</button>
      <button class="cb" onclick="window.close()">✕ Kapat</button>
    </div>
    <div style="height:50px;"></div>
    ${html}
    <script>document.querySelectorAll('img').forEach(img=>{img.onerror=function(){this.parentElement.style.display='none';};});<\/script>
    </body></html>`);
    w.document.close();
}

// ─────────────────────────────────────────────────────────
// 8b. YAZDIR — Öğrenci Nüshası (Cevap Anahtarı Yok)
// ─────────────────────────────────────────────────────────
function doPrintStudent() {
    let w   = window.open('', '_blank');
    let css = document.querySelector('link[rel="stylesheet"]').href;
    let html = buildExamHTML({ studentVersion: true });

    w.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
    <link rel="stylesheet" href="${css}">
    <style>
      @media print { body{margin:0;} @page{margin:10mm 15mm;} }
      body {font-family:system-ui,sans-serif;background:white;padding:8mm 12mm;}
      .noprint{position:fixed;top:0;left:0;right:0;background:#0891b2;padding:10px 20px;display:flex;gap:10px;align-items:center;z-index:999;box-shadow:0 4px 6px rgba(0,0,0,0.1);}
      .noprint button{padding:8px 18px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;}
      .pb{background:#059669;color:white;} .cb{background:#dc2626;color:white;}
      .noprint span{color:white;font-size:14px;font-weight:600;flex:1;}
      @media print{ .noprint{display:none!important;} body{padding:0;} }
    </style></head><body class="exam-print">
    <div class="noprint">
      <span>📄 Öğrenci Nüshası — Cevap Anahtarı Yok</span>
      <button class="pb" onclick="window.print()">🖨️ Yazdır / PDF Kaydet</button>
      <button class="cb" onclick="window.close()">✕ Kapat</button>
    </div>
    <div style="height:50px;"></div>
    ${html}
    <script>document.querySelectorAll('img').forEach(img=>{img.onerror=function(){this.parentElement.style.display='none';};});<\/script>
    </body></html>`);
    w.document.close();
}

// ─────────────────────────────────────────────────────────
// 9. SIFIRLA
// ─────────────────────────────────────────────────────────
function resetAll() {
    edata = null;
    finalData = null;
    document.getElementById('poolArea').innerHTML = '';
    document.getElementById('imageReviewArea').innerHTML = '';
    document.getElementById('examPreview').innerHTML = '';
    ['resultCard', 'selectionCard', 'imageSelectionCard'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById('settingsCard').classList.remove('hidden');
    setProgress(0, '...Hazırlanıyor...');
    window.scrollTo(0, 0);
}
