# Design: New Prompt Taşıma + Bookmarks Paneli

**Tarih:** 2026-03-03

## Özet

İki bağımsız UI değişikliği:
1. "New Prompt" butonunu ProfileScreen'den kaldır, CreateHubModal'a taşı.
2. ProfileScreen'e "Bookmarked" paneli ekle; tıklanınca feed'de o prompta git.

---

## Değişiklik 1: New Prompt → CreateHubModal

### Mevcut Durum
- `ProfileScreen.tsx` satır 206–221: "New Prompt" butonu `openNewPrompt()` çağırıyor.
- `App.tsx` `newPromptOpen` state'ini izlemiyor → `NewPromptScreen` hiç render edilmiyor (buton işlevsiz).

### Hedef
- `ProfileScreen`'den New Prompt bloğu kaldırılır.
- `CreateHubModal.tsx` `LandingView`'a 3. kart eklenir: üst sırada mevcut 2 kart (`grid-cols-2`), altında tam genişlik "New Prompt" kartı.
- Karta tıklanınca: `setCreateHubOpen(false)` + `openNewPrompt()`.
- `App.tsx`'e `{newPromptOpen && <NewPromptScreen />}` eklenir.

### Etkilenen Dosyalar
- `frontend/src/screens/ProfileScreen.tsx`
- `frontend/src/screens/CreateHubModal.tsx`
- `frontend/src/App.tsx`

---

## Değişiklik 2: Bookmarked Panel → ProfileScreen

### Hedef
- Giriş yapmış kullanıcı için "New Prompt" bloğunun yerine "Bookmarked (N)" butonu eklenir.
- Tıklanınca `AnimatePresence` ile aşağıdan kayan bir sheet açılır.
- Sheet içeriği:
  - Başlık + kapatma (×) butonu
  - `savedPrompts` listesi: küçük resim + prompt başlığı
  - Boşsa: "Henüz bookmark yok" mesajı
- Bir prompta tıklanınca: sheet kapanır + `navigateToPrompt(promptId)` çağrılır.

### Veri Kaynağı
`useStore`'daki `savedPrompts: ApiSaved[]` — her item `prompt: ApiPrompt` içeriyor (imageUrl, title, id mevcut).

### Etkilenen Dosyalar
- `frontend/src/screens/ProfileScreen.tsx`

---

## Premortem: Bu Plan Neden Başarısız Olabilir?

| # | Risk | Olasılık | Önlem |
|---|------|----------|-------|
| 1 | `NewPromptScreen` bozuk import var (`generateImage` api.ts'te değil) | Yüksek | Import'u `imageGeneration.ts`'e çevir ya da şimdilik bırak (kullanıcı "şimdilik dursun" dedi) |
| 2 | `savedPrompts` login öncesi boş kalır | Düşük | `loadSavedPrompts` zaten login sonrası çağrılıyor, mevcut mantık yeterli |
| 3 | `navigateToPrompt` prompts listesinde yoksa fetch yapıyor | Düşük | Zaten store'da ele alınmış, ek değişiklik gerekmez |
| 4 | Sheet animasyonu diğer modal'larla z-index çakışması | Orta | Sheet için `z-[60]` kullan, diğer modal'lar `z-50` |
