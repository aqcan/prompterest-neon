# New Prompt Taşıma + Bookmarks Paneli Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ProfileScreen'deki "New Prompt" butonunu CreateHubModal'a taşı; ProfileScreen'e "Bookmarked" paneli ekle (tıklanınca feed'e navigate et).

**Architecture:** 3 dosya değişikliği. App.tsx'e NewPromptScreen render'ı eklenir. CreateHubModal LandingView'a 3. kart eklenir. ProfileScreen'de New Prompt bloğu kaldırılıp yerine Bookmarked sheet eklenir.

**Tech Stack:** React, Zustand (useStore), framer-motion (AnimatePresence/motion), Tailwind CSS

---

### Task 1: App.tsx — NewPromptScreen'i render et

**Files:**
- Modify: `frontend/src/App.tsx`

NewPromptScreen şu an hiç render edilmiyor. Bu adımda bağlanıyor.

**Step 1: Import ekle**

`frontend/src/App.tsx` dosyasında mevcut importların arasına:

```tsx
import { NewPromptScreen } from './screens/NewPromptScreen';
```

**Step 2: newPromptOpen state'ini oku**

`App()` fonksiyonu içinde, diğer store hook'larının yanına:

```tsx
const newPromptOpen = useStore((s) => s.newPromptOpen);
```

**Step 3: NewPromptScreen'i AnimatePresence içinde render et**

`{editorPromptId && <PromptEditorScreen />}` bloğunun hemen altına:

```tsx
{/* New Prompt Screen overlay */}
<AnimatePresence>
  {newPromptOpen && <NewPromptScreen />}
</AnimatePresence>
```

**Step 4: Manuel test**

- `npm run dev` çalıştır (frontend klasöründe)
- Tarayıcıda profil sayfasına git
- DevTools Console'da `useStore.getState().openNewPrompt()` yaz, Enter
- NewPromptScreen'in açıldığını doğrula
- `useStore.getState().closeNewPrompt()` ile kapandığını doğrula

**Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: render NewPromptScreen overlay in App"
```

---

### Task 2: CreateHubModal — LandingView'a New Prompt kartı ekle

**Files:**
- Modify: `frontend/src/screens/CreateHubModal.tsx`

**Step 1: LandingView props'una handler ekle**

`LandingView` fonksiyonunun imzasını güncelle:

```tsx
function LandingView({ onModeSelect, onNewPrompt }: {
  onModeSelect: (mode: 'text' | 'photo') => void;
  onNewPrompt: () => void;
}) {
```

**Step 2: LandingView içinde New Prompt kartını ekle**

Mevcut `grid-cols-2` div'inden sonra, `</div>` kapanışından önce değil — grid div'den sonra, `return` içindeki `space-y-4` div'inin içine ekle:

```tsx
function LandingView({ onModeSelect, onNewPrompt }: {
  onModeSelect: (mode: 'text' | 'photo') => void;
  onNewPrompt: () => void;
}) {
  return (
    <div className="pt-2 space-y-4">
      <h2 className="font-display text-lg font-semibold text-white text-center">Oluştur</h2>
      <div className="grid grid-cols-2 gap-3">
        {/* mevcut 2 kart aynen kalır */}
        <button
          onClick={() => onModeSelect('text')}
          className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3b18a" strokeWidth="1.8">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-medium text-white">Metin → Görsel</p>
            <p className="text-white/40 text-xs font-body mt-0.5">Prompt yaz, görsel üret</p>
          </div>
        </button>

        <button
          onClick={() => onModeSelect('photo')}
          className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-medium text-white">Fotoğraf → Görsel</p>
            <p className="text-white/40 text-xs font-body mt-0.5">Fotoğrafını dönüştür</p>
          </div>
        </button>
      </div>

      {/* New Prompt — tam genişlik 3. kart */}
      <button
        onClick={onNewPrompt}
        className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 rounded-xl bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3b18a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className="text-left">
          <p className="font-display text-sm font-medium text-white">New Prompt</p>
          <p className="text-white/40 text-xs font-body mt-0.5">Metin prompt'u yaz ve kaydet</p>
        </div>
      </button>
    </div>
  );
}
```

**Step 3: CreateHubModal'dan onNewPrompt handler'ı oluştur ve LandingView'a geç**

`CreateHubModal` içinde store'dan `openNewPrompt` al:

```tsx
const openNewPrompt = useStore((s) => s.openNewPrompt);
```

`handleDismiss` fonksiyonunun hemen altına handler ekle:

```tsx
const handleNewPrompt = useCallback(() => {
  setCreateHubOpen(false);
  openNewPrompt();
}, [setCreateHubOpen, openNewPrompt]);
```

Landing view render satırını güncelle:

```tsx
{view === 'landing' && <LandingView onModeSelect={handleModeSelect} onNewPrompt={handleNewPrompt} />}
```

**Step 4: Manuel test**

- "+" butonuna bas → modal açılır
- "New Prompt" kartına bas → modal kapanır, NewPromptScreen açılır
- NewPromptScreen'de geri oka bas → kapanır

**Step 5: Commit**

```bash
git add frontend/src/screens/CreateHubModal.tsx
git commit -m "feat: add New Prompt card to CreateHubModal landing view"
```

---

### Task 3: ProfileScreen — New Prompt bloğunu kaldır

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.tsx`

**Step 1: New Prompt bloğunu sil**

`ProfileScreen.tsx`'te şu bloğu (satır 206–221 civarı) tamamen kaldır:

```tsx
{/* New Prompt */}
<motion.div variants={fadeUp}>
  <button
    onClick={() => {
      hapticMedium();
      openNewPrompt();
    }}
    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-accent-violet/15 border border-accent-violet/20 font-display text-sm font-semibold text-accent-violet active:scale-[0.98] transition-transform"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    New Prompt
  </button>
</motion.div>
```

**Step 2: Kullanılmayan import'u temizle**

`openNewPrompt` artık bu dosyada kullanılmıyor. Satır 14'teki şu satırı kaldır:

```tsx
const openNewPrompt = useStore((s) => s.openNewPrompt);
```

**Step 3: Manuel test**

- Profil sayfasına git → "New Prompt" butonu görünmüyor
- Diğer butonlar (Premium, Sign Out) hâlâ çalışıyor

**Step 4: Commit**

```bash
git add frontend/src/screens/ProfileScreen.tsx
git commit -m "feat: remove New Prompt button from ProfileScreen"
```

---

### Task 4: ProfileScreen — Bookmarked sheet ekle

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.tsx`

**Step 1: State ve store eklemeleri**

`ProfileScreen` fonksiyonu içinde mevcut state'lerin yanına:

```tsx
const navigateToPrompt = useStore((s) => s.navigateToPrompt);
const [showBookmarks, setShowBookmarks] = useState(false);
```

`savedLoading` de lazım olacak:

```tsx
const savedLoading = useStore((s) => s.savedLoading);
```

**Step 2: Bookmarked butonunu ekle**

New Prompt'un kaldırıldığı yere (Premium'dan önce) şu bloğu ekle:

```tsx
{/* Bookmarked */}
<motion.div variants={fadeUp}>
  <button
    onClick={() => {
      hapticMedium();
      setShowBookmarks(true);
    }}
    className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] active:scale-[0.98] transition-transform"
  >
    <div className="flex items-center gap-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      <span className="font-display text-sm font-semibold text-white">Bookmarked</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="font-body text-xs text-white/30">{savedPrompts.length}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  </button>
</motion.div>
```

**Step 3: Bookmarks sheet'ini ekle**

`ProfileScreen` return'ünün sonuna, mevcut `<AnimatePresence>` (PremiumUpgradeScreen için) bloğundan önce, Bookmarks sheet'ini ekle. Tüm return'ü `<>...</>` fragment içine al (zaten var), içine:

```tsx
{/* Bookmarks Sheet */}
<AnimatePresence>
  {showBookmarks && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={() => setShowBookmarks(false)}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 inset-x-0 z-[61] bg-surface-1 rounded-t-3xl max-h-[75vh] flex flex-col"
      >
        {/* Handle */}
        <div className="pt-3 pb-1 flex-shrink-0">
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
          <h3 className="font-display text-base font-semibold text-white">Bookmarked</h3>
          <button
            onClick={() => setShowBookmarks(false)}
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-3 px-4 space-y-2 pb-10">
          {savedLoading && (
            <div className="flex items-center justify-center py-10">
              <svg className="w-6 h-6 animate-spin text-white/30" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {!savedLoading && savedPrompts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              <p className="font-body text-sm text-white/25">Henüz bookmark yok</p>
            </div>
          )}

          {!savedLoading && savedPrompts.map((saved) => (
            <button
              key={saved.id}
              onClick={() => {
                hapticLight();
                setShowBookmarks(false);
                navigateToPrompt(saved.promptId);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.05] active:scale-[0.98] transition-transform text-left"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-xl bg-surface-3 flex-shrink-0 overflow-hidden">
                {saved.prompt.imageUrl ? (
                  <img
                    src={saved.prompt.imageUrl}
                    alt={saved.prompt.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-medium text-white truncate">
                  {saved.prompt.title || 'Başlıksız'}
                </p>
                {saved.prompt.authorUsername && (
                  <p className="font-body text-xs text-white/30 mt-0.5 truncate">
                    @{saved.prompt.authorUsername}
                  </p>
                )}
              </div>

              {/* Chevron */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Step 4: hapticLight import kontrolü**

`ProfileScreen.tsx` başında `hapticLight` import edilmiş mi kontrol et. Dosyanın 5. satırı:

```tsx
import { hapticLight, hapticMedium } from '../utils/haptics';
```

Eğer sadece `hapticMedium` varsa, `hapticLight` ekle.

**Step 5: Manuel test**

- Giriş yap → Profil → "Bookmarked" butonu görünüyor
- Butona bas → sheet aşağıdan kayarak açılır
- Backdrop'a tıkla → sheet kapanır
- Bir bookmark'a tıkla → sheet kapanır, Explore tab'ına geçer, o prompt feed'de görünür
- Hiç bookmark yokken → "Henüz bookmark yok" mesajı

**Step 6: Commit**

```bash
git add frontend/src/screens/ProfileScreen.tsx
git commit -m "feat: add Bookmarked sheet to ProfileScreen with feed navigation"
```

---

## Premortem: Bu Plan Neden Başarısız Olabilir?

| # | Risk | Olasılık | Önlem |
|---|------|----------|-------|
| 1 | `NewPromptScreen` bozuk import (`generateImage` api.ts'te değil) | Yüksek | TypeScript hata verirse `generateImage` import satırını `imageGeneration.ts`'e çevir |
| 2 | `savedPrompts` login öncesi boş, buton 0 gösterir | Düşük | Tasarım gereği — giriş yapmadan zaten bu bölüm görünmüyor |
| 3 | Sheet z-index PremiumUpgradeScreen ile çakışır | Orta | Bookmarks `z-[60]`, Premium `z-50` kullanır → çakışmaz |
| 4 | `navigateToPrompt` promp fetch yapınca loading state yok | Düşük | Feed zaten kendi loading'ini yönetiyor, şimdilik yeterli |
| 5 | `hapticLight` ProfileScreen'de import edilmemiş olabilir | Orta | Step 4'te kontrol adımı mevcut |
