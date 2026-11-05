/**
 * Gemini Translator İstemci Tarafı (Frontend) Mantığı
 * Kullanıcı etkileşimi, API istekleri, terimce yönetimi, kopyalama ve hata gösterimi.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elemanları
  const sourceText = document.getElementById('sourceText');
  const targetText = document.getElementById('targetText');
  const targetPlaceholder = document.getElementById('targetPlaceholder');
  const translateBtn = document.getElementById('translateBtn');
  const clearSourceBtn = document.getElementById('clearSourceBtn');
  const copyBtn = document.getElementById('copyBtn');
  const swapLangsBtn = document.getElementById('swapLangsBtn');
  const sourceLangSelect = document.getElementById('sourceLangSelect');
  const targetLangSelect = document.getElementById('targetLangSelect');
  const domainSelect = document.getElementById('domainSelect');
  const styleSelect = document.getElementById('styleSelect');
  const sourceCharCount = document.getElementById('sourceCharCount');
  const targetCharCount = document.getElementById('targetCharCount');

  // Terimce (Glossary) Elemanları
  const toggleGlossaryBtn = document.getElementById('toggleGlossaryBtn');
  const closeGlossaryBtn = document.getElementById('closeGlossaryBtn');
  const glossaryDrawer = document.getElementById('glossaryDrawer');
  const glossaryInput = document.getElementById('glossaryInput');
  const glossaryCountBadge = document.getElementById('glossaryCountBadge');

  // Hata Bildirimi Elemanları
  const errorBanner = document.getElementById('errorBanner');
  const errorTitle = document.getElementById('errorTitle');
  const errorDesc = document.getElementById('errorDesc');
  const errorSolution = document.getElementById('errorSolution');
  const dismissErrorBtn = document.getElementById('dismissErrorBtn');

  // API Durum Rozeti
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusText = document.getElementById('apiStatusText');

  // 1. Sunucu ve API Anahtarı Durumunu Kontrol Et
  checkApiStatus();

  async function checkApiStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.apiKeyConfigured) {
        apiStatusBadge.className = 'badge badge-success';
        apiStatusText.textContent = 'Gemini API Hazır';
      } else {
        apiStatusBadge.className = 'badge badge-warning';
        apiStatusText.textContent = '.env Dosyasında API Key Eksik';
      }
    } catch {
      apiStatusBadge.className = 'badge badge-error';
      apiStatusText.textContent = 'Sunucuya Bağlanılamadı';
    }
  }

  // 2. Karakter Sayaçları Güncelleme
  sourceText.addEventListener('input', () => {
    sourceCharCount.textContent = sourceText.value.length;
    hideError();
  });

  function updateTargetText(content) {
    targetText.value = content;
    targetCharCount.textContent = content.length;
    if (content) {
      targetPlaceholder.style.display = 'none';
      copyBtn.disabled = false;
    } else {
      targetPlaceholder.style.display = 'block';
      copyBtn.disabled = true;
    }
  }

  // 3. Metni Temizle
  clearSourceBtn.addEventListener('click', () => {
    sourceText.value = '';
    sourceCharCount.textContent = '0';
    updateTargetText('');
    sourceText.focus();
    hideError();
  });

  // 4. Dilleri Değiştir (Swap Languages)
  swapLangsBtn.addEventListener('click', () => {
    const currentSource = sourceLangSelect.value;
    const currentTarget = targetLangSelect.value;

    // Eğer kaynak 'Otomatik Algıla' ise, varsayılan İngilizce ile takas et
    if (currentSource === 'Otomatik Algıla') {
      sourceLangSelect.value = currentTarget;
      targetLangSelect.value = 'İngilizce';
    } else {
      sourceLangSelect.value = currentTarget;
      targetLangSelect.value = currentSource;
    }

    // Varsa mevcut çevrilmiş metni kaynağa aktar
    if (targetText.value.trim()) {
      sourceText.value = targetText.value;
      sourceCharCount.textContent = sourceText.value.length;
      updateTargetText('');
    }
  });

  // 5. Tek Tıkla Çeviriyi Panoya Kopyalama
  copyBtn.addEventListener('click', async () => {
    const textToCopy = targetText.value;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.classList.add('copied');
      const copyLabel = copyBtn.querySelector('.copy-label');
      const originalText = copyLabel.textContent;
      copyLabel.textContent = 'Kopyalandı!';

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyLabel.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Kopyalama başarısız oldu:', err);
    }
  });

  // 6. Terimce (Glossary) Çekmecesini Aç/Kapat
  toggleGlossaryBtn.addEventListener('click', () => {
    const isCollapsed = glossaryDrawer.classList.contains('collapsed');
    if (isCollapsed) {
      glossaryDrawer.classList.remove('collapsed');
      toggleGlossaryBtn.classList.add('active');
      glossaryInput.focus();
    } else {
      glossaryDrawer.classList.add('collapsed');
      toggleGlossaryBtn.classList.remove('active');
    }
  });

  closeGlossaryBtn.addEventListener('click', () => {
    glossaryDrawer.classList.add('collapsed');
    toggleGlossaryBtn.classList.remove('active');
  });

  glossaryInput.addEventListener('input', () => {
    const count = glossaryInput.value
      .split('\n')
      .filter(line => line.trim() && (line.includes('=') || line.includes(':') || line.includes('->'))).length;

    if (count > 0) {
      glossaryCountBadge.style.display = 'inline-block';
      glossaryCountBadge.textContent = count;
    } else {
      glossaryCountBadge.style.display = 'none';
    }
  });

  // 7. Çeviri İsteğini Gönder (Ana Fonksiyon)
  async function performTranslation() {
    const text = sourceText.value.trim();
    if (!text) {
      showError({
        title: 'Lütfen Metin Girin',
        description: 'Çeviri yapmak için sol kutuya bir metin yazmanız veya yapıştırmanız gerekiyor.',
        solution: 'Metninizi yazdıktan sonra tekrar "Çevir" düğmesine tıklayın.'
      });
      sourceText.focus();
      return;
    }

    hideError();
    setLoading(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang: sourceLangSelect.value,
          targetLang: targetLangSelect.value,
          domain: domainSelect.value,
          style: styleSelect.value,
          glossary: glossaryInput.value
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showError(data.error || {
          title: 'Çeviri Başarısız',
          description: 'Sunucu isteği işleyemedi.',
          solution: 'Lütfen konsol loglarını veya API anahtarınızı kontrol edin.'
        });
      } else {
        updateTargetText(data.translation);
        // Başarılı çeviride API durum rozetini de yeşile çek
        apiStatusBadge.className = 'badge badge-success';
        apiStatusText.textContent = 'Gemini API Hazır';
      }
    } catch (networkError) {
      showError({
        title: 'Sunucuya Ulaşılamadı',
        description: 'Node.js yerel sunucunuz çalışmıyor veya ağ bağlantısı koptu.',
        solution: 'Terminalde "npm start" komutunun çalıştığından ve internet bağlantınızın olduğundan emin olun.'
      });
    } finally {
      setLoading(false);
    }
  }

  translateBtn.addEventListener('click', performTranslation);

  // Kısayol: Ctrl+Enter veya Cmd+Enter ile çeviri tetikleme
  sourceText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      performTranslation();
    }
  });

  // 8. Yardımcı Arayüz Fonksiyonları (Loading, Hata Göster/Gizle)
  function setLoading(isLoading) {
    const btnText = translateBtn.querySelector('.btn-text');
    const spinner = translateBtn.querySelector('.spinner');

    if (isLoading) {
      translateBtn.disabled = true;
      btnText.textContent = 'Çevriliyor...';
      spinner.style.display = 'inline-block';
      targetPlaceholder.textContent = 'Gemini metninizi çeviriyor, lütfen bekleyin...';
      targetPlaceholder.style.display = 'block';
    } else {
      translateBtn.disabled = false;
      btnText.textContent = 'Çevir';
      spinner.style.display = 'none';
      if (!targetText.value) {
        targetPlaceholder.textContent = 'Çeviri burada görünecek...';
      }
    }
  }

  function showError(err) {
    errorTitle.textContent = err.title || 'Hata Oluştu';
    errorDesc.textContent = err.description || 'İşlem sırasında beklenmeyen bir hata meydana geldi.';
    errorSolution.textContent = err.solution || 'Lütfen tekrar deneyin.';
    errorBanner.style.display = 'flex';
  }

  function hideError() {
    errorBanner.style.display = 'none';
  }

  dismissErrorBtn.addEventListener('click', hideError);
});

