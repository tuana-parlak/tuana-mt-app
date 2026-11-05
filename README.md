# 🌐 Gemini Makine Çevirisi (Node.js & Gemini API)

Google Gemini API ile güçlendirilmiş, modern, iki sütunlu (DeepL benzeri), alan ve üslup ayarlı, terimce (glossary) destekli makine çevirisi uygulaması.

---

## 🎨 Tasarım Özellikleri
- **Renk Teması:** Bordo, sıcak kahverengi ve krem tonları.
- **İki Sütunlu Düzen:** Kaynak ve hedef metin yan yana, geniş ve rahat çalışma alanı.
- **Duyarlı (Responsive):** Bilgisayar, tablet ve akıllı telefonlarla tam uyumlu.
- **Hızlı Kopyalama:** Tek tıkla panoya kopyalama ve görsel geri bildirim.
- **Klavye Kısayolu:** `Ctrl + Enter` (veya Mac'te `Cmd + Enter`) ile anında çeviri.

---

## 🚀 Yeni Başlayanlar İçin Adım Adım Kurulum ve Çalıştırma

### 1. Adım: API Anahtarını Hazırlama (.env)
Proje klasöründe yer alan `.env` dosyasını Not Defteri veya VS Code ile açın:
```env
GEMINI_API_KEY=AIzaSy...SizinKeyiniz...
PORT=3000
```
> **API Key'iniz yoksa:** [Google AI Studio](https://aistudio.google.com/app/apikey) adresinden ücretsiz bir Gemini API anahtarı alabilirsiniz.

### 2. Adım: Bağımlılıkları Yükleme (Gerekirse)
Terminali (PowerShell veya Komut Satırı) proje klasöründe açıp şu komutu çalıştırın:
```bash
npm install
```
*(Paketler projeye zaten yüklenmiştir, eksik bir modül olursa bu komut tamamlar.)*

### 3. Adım: Sunucuyu Başlatma
Terminalde şu komutu yazıp Enter'a basın:
```bash
npm start
```
*(Veya kodlarda değişiklik yaparken otomatik yenilenmesini isterseniz: `npm run dev`)*

### 4. Adım: Tarayıcıda Açma
Herhangi bir internet tarayıcısını (Chrome, Edge vb.) açın ve adres çubuğuna şunu yazın:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Nasıl Kullanılır?

1. **Dilleri Seçin:** Kaynak dili (veya "Otomatik Algıla") ve Hedef dili belirleyin. Dillerin yerini değiştirmek için ortadaki iki yönlü ok butonuna basabilirsiniz.
2. **Alan (Domain) Seçin:**
   - **Genel:** Günlük ve standart metinler.
   - **Hukuk:** Mevzuat, sözleşmeler ve hukuki terimler.
   - **Tıp:** Klinik, anatomik ve sağlık terminolojisi.
   - **Teknik:** Yazılım, donanım, kılavuzlar ve mühendislik.
   - **Edebi:** Şiir, hikaye ve sanatsal üslup.
3. **Üslup (Tone) Seçin:**
   - **Resmi:** Kurumsal, saygılı ve profesyonel dil.
   - **Gündelik:** Doğal, samimi ve konuşma dili.
4. **Terimce (Glossary) Ekle (İsteğe Bağlı):**
   - *"Terimce Ekle"* butonuna tıklayın.
   - Her satıra `kaynak terim = hedef terim` formatında kural yazın.
   - *Örnek:*
     ```text
     machine learning = makine öğrenimi
     pipeline = veri boru hattı
     ```
   - Model bu kurallara kesinlikle sadık kalacaktır.
5. **Çevir:** Metni yazıp "Çevir" butonuna tıklayın veya klavyeden `Ctrl + Enter` tuşlayın.
6. **Kopyala:** Çeviri tamamlandığında "Kopyala" düğmesine basarak çeviriyi doğrudan panoya alın.

---

## ⚠️ Hata Yönetimi
Uygulama olası sorunlarda kullanıcıya ne yapması gerektiğini Türkçe gösterir:
- **API Anahtarı Eksik / Hatalı:** `.env` dosyasını nasıl düzenleyeceğinizi bildirir.
- **Kota Aşımı (Rate Limit / 429):** Bir süre beklemeniz gerektiğini açıklar.
- **İnternet / Ağ Kesintisi:** Ağ bağlantınızı kontrol etmenizi önerir.

