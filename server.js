/**
 * Gemini Makine Çevirisi Sunucusu (Node.js & Express)
 * Gemini API kullanarak özelleştirilebilir, terimce (glossary) destekli çeviri servisi sunar.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON gövdelerini ve statik web dosyalarını işleme
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Kullanıcı dostu Türkçe hata mesajı üretici fonksiyon.
 * API anahtarı, kota aşımı, ağ sorunları vb. durumları tespit edip net çözüm önerir.
 */
function handleApiError(error) {
  const message = error?.message || '';
  const status = error?.status || error?.statusCode;

  // 1. API Anahtarı eksik veya geçersiz
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'BURAYA_GEMINI_API_KEYINIZI_YAPISTIRIN' || process.env.GEMINI_API_KEY.trim() === '') {
    return {
      title: 'API Anahtarı Bulunamadı',
      description: '.env dosyasında GEMINI_API_KEY tanımlı değil veya boş bırakılmış.',
      solution: '.env dosyasını açıp Google AI Studio\'dan aldığınız geçerli API anahtarını yapıştırın ve sunucuyu yeniden başlatın.'
    };
  }

  if (message.includes('API_KEY_INVALID') || message.includes('API key not valid') || status === 400 && message.toLowerCase().includes('key')) {
    return {
      title: 'Geçersiz API Anahtarı',
      description: 'Girdiğiniz Gemini API anahtarı sistem tarafından doğrulanamadı.',
      solution: '.env dosyasındaki anahtarın eksiksiz ve boşluksuz olduğundan emin olun (Google AI Studio -> Get API Key).'
    };
  }

  // 2. Kota / Hız Sınırı (Rate Limit & Quota)
  if (status === 429 || message.includes('RESOURCE_EXHAUSTED') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate limit')) {
    return {
      title: 'İstek Limiti veya Kota Doldu',
      description: 'Gemini API için belirlenen istek sıklığı (rate limit) veya ücretsiz kullanım kotası aşıldı.',
      solution: 'Lütfen birkaç saniye/dakika bekleyip tekrar deneyin veya Google AI Studio panelinizden kota limitlerinizi kontrol edin.'
    };
  }

  // 3. Ağ / İnternet Bağlantısı Hatası
  if (message.includes('ENOTFOUND') || message.includes('ETIMEDOUT') || message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
    return {
      title: 'İnternet Bağlantı Hatası',
      description: 'Google Gemini sunucularına ulaşılamadı.',
      solution: 'İnternet bağlantınızı kontrol edin. Şirket/okul ağı veya VPN kullanıyorsanız Google API erişiminin engellenmediğinden emin olun.'
    };
  }

  // 4. Model Bulunamadı veya Desteklenmiyor
  if (status === 404 || message.includes('NOT_FOUND') || message.includes('no longer available')) {
    return {
      title: 'Model Erişimi Hatası',
      description: 'Seçilen Gemini modeli hesabınız için kullanılamıyor veya kullanımdan kaldırılmış.',
      solution: 'Sunucu yapılandırmasındaki Gemini model adını kontrol edin (Örn: gemini-3.5-flash-lite veya gemini-3.5-flash).'
    };
  }

  // Genel Hata
  return {
    title: 'Çeviri Sırasında Bir Hata Oluştu',
    description: message || 'Bilinmeyen bir sunucu hatası meydana geldi.',
    solution: 'Lütfen girdilerinizi kontrol edip tekrar deneyin. Sorun devam ederse sunucu konsol çıktılarını inceleyin.'
  };
}

/**
 * Çeviri için Gemini sistem talimatını ve istemini (prompt) oluşturan fonksiyon
 */
function buildTranslationPrompt({ text, sourceLang, targetLang, domain, style, glossary }) {
  // Alan (Domain) açıklaması
  const domainDescriptions = {
    general: 'Genel / Günlük kullanım',
    legal: 'Hukuk (Mevzuat, sözleşmeler, resmi hukuk dili ve hukuki terimler hassasiyetle korunmalıdır)',
    medical: 'Tıp ve Sağlık (Tıbbi terminoloji, klinik ve anatomik terimler tam doğru çevrilmelidir)',
    technical: 'Teknik ve Bilişim (Mühendislik, yazılım, kılavuzlar ve teknik jargon dikkate alınmalıdır)',
    literary: 'Edebi ve Sanatsal (Anlatım zenginliği, metaforlar, üslup ve duygu derinliği korunmalıdır)'
  };

  // Üslup (Tone/Style) açıklaması
  const styleDescriptions = {
    formal: 'Resmi, kurumsal, mesafeli ve profesyonel bir dil',
    casual: 'Samimi, gündelik, doğal ve akıcı bir konuşma dili'
  };

  const selectedDomain = domainDescriptions[domain] || domainDescriptions.general;
  const selectedStyle = styleDescriptions[style] || styleDescriptions.formal;

  // Terimce (Glossary) satırlarını ayrıştır
  const parsedGlossary = [];
  if (glossary && typeof glossary === 'string') {
    const lines = glossary.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      // "kaynak = hedef" veya "kaynak: hedef" veya "kaynak -> hedef" desteği
      let parts = line.split('=');
      if (parts.length < 2) parts = line.split('->');
      if (parts.length < 2) parts = line.split(':');

      if (parts.length >= 2) {
        const src = parts[0].trim();
        const trg = parts.slice(1).join('=').trim();
        if (src && trg) {
          parsedGlossary.push(`- "${src}" => "${trg}"`);
        }
      }
    }
  }

  // Gemini modeline gönderilecek net ve tavizsiz prompt
  let prompt = `Sen profesyonel, uzman bir çevirmensin.\n`;
  prompt += `GÖREV: Aşağıda verilen metni ${sourceLang} dilinden ${targetLang} diline çevir.\n\n`;
  prompt += `UYULMASI ZORUNLU KURALLAR:\n`;
  prompt += `1. Çeviri Alanı (Domain): ${selectedDomain}\n`;
  prompt += `2. Çeviri Üslubu (Tone): ${selectedStyle}\n`;

  if (parsedGlossary.length > 0) {
    prompt += `3. ZORUNLU TERİMCE (GLOSSARY) KURALI:\n`;
    prompt += `   Aşağıdaki terim eşleşmelerini çeviride KESİNLİKLE ve AYNEN kullanmalısın. Başka eşanlamlılarını kullanma:\n`;
    prompt += `   ${parsedGlossary.join('\n   ')}\n`;
  }

  prompt += `\nÇIKIŞ FORMATI VE KISITLAMALAR (ÇOK ÖNEMLİ):\n`;
  prompt += `- SADECE VE SADECE çevrilmiş metni döndür.\n`;
  prompt += `- Asla başına veya sonuna "İşte çeviri:", "Çeviri:", tırnak işaretleri (\"), markdown kod blokları (\`\`\`) veya açıklama/not EKLEME.\n`;
  prompt += `- Orijinal metnin satır başlarını ve paragraf yapısını koru.\n\n`;
  prompt += `ÇEVRİLECEK METİN:\n${text}`;

  return prompt;
}

// POST /api/translate
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang, targetLang, domain, style, glossary } = req.body;

  // Temel girdi kontrolü
  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        title: 'Metin Boş',
        description: 'Lütfen çevirmek istediğiniz metni girin.',
        solution: 'Kaynak metin kutusuna bir cümle veya paragraf yazıp tekrar deneyin.'
      }
    });
  }

  // API Anahtarı çevre değişkeni kontrolü
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'BURAYA_GEMINI_API_KEYINIZI_YAPISTIRIN' || apiKey.trim() === '') {
    const err = handleApiError(new Error('API_KEY_INVALID'));
    return res.status(500).json({ success: false, error: err });
  }

  try {
    // Google GenAI SDK başlatma (v0.1+ / v1 uyumlu)
    const ai = new GoogleGenAI({ apiKey });

    const prompt = buildTranslationPrompt({
      text: text.trim(),
      sourceLang: sourceLang || 'Otomatik Algıla',
      targetLang: targetLang || 'Türkçe',
      domain: domain || 'general',
      style: style || 'formal',
      glossary: glossary || ''
    });

    // Gemini 3.5 Flash-Lite: Hem son derece hızlı (~600ms) hem de güncel ve desteklenen modeldir.
    // İhtiyaca göre fallback olarak gemini-3.5-flash ve gemini-3.8-flash denenir.
    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ];

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt
        });
        if (response && response.text) {
          break; // Başarılı olundu
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} başarısız oldu, bir sonrakine geçiliyor...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Çeviri yanıtı alınamadı.');
    }

    let translation = response.text || '';

    // Modelin olası tırnak veya boşluk artıklarını temizle
    translation = translation.trim();
    if (translation.startsWith('```') && translation.endsWith('```')) {
      translation = translation.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    return res.json({
      success: true,
      translation
    });

  } catch (error) {
    console.error('Gemini Çeviri Hatası:', error);
    const friendlyError = handleApiError(error);
    return res.status(500).json({
      success: false,
      error: friendlyError
    });
  }
});

// Sağlık kontrolü ve durum bilgisi
app.get('/api/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'BURAYA_GEMINI_API_KEYINIZI_YAPISTIRIN' && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    apiKeyConfigured: hasKey
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Gemini Çeviri Uygulaması Başarıyla Başlatıldı!`);
  console.log(`🌐 Tarayıcınızda açın: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

