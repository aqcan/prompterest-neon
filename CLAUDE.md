# Prompterest-Neon — Claude Code Talimatları

## Build Pipeline (DEĞİŞTİRME)

3 ayrı build çıkışı var, her biri farklı amaç için. Birini diğeriyle karıştırma:

| Script | Config | outDir | Ne için |
|---|---|---|---|
| `build` | vite.config.ts | dist/ | sadece dev/test |
| `build:web` | vite.config.web.ts | web/ | VPS Docker deployment |
| `build:mobile` | vite.config.mobile.ts | dist/ | Capacitor Android/iOS |

- **Web build** → `base: '/prompterest'` olmalı, VITE_API_URL Dockerfile ARG ile gelir
- **Mobile build** → `base: '/'` olmalı (Capacitor file:// için zorunlu), VITE_API_URL=https://www.sinanakcan.com
- `vite.config.mobile.ts` ve `.env.mobile` bu amaçla oluşturuldu — silme, değiştirme

## Mobile Mimarisi

- Hedef: tek codebase → web + Android + iOS
- Framework: React + Capacitor 6
- Mobile app backend olarak VPS'teki aynı backend'i kullanır: `https://www.sinanakcan.com/api/...`
- Backend CORS `origin: '*'` — mobile için yeterli, değiştirme
- Android: `npm run cap:build:android` → build + sync → Android Studio
- iOS: henüz initialize edilmemiş, macOS/Xcode gerektirir

## Genel Kurallar

- Web deployment için `build:web` kullan, `build:mobile` DEĞİL
- Mobile için `build:mobile` kullan, `build:web` DEĞİL
- `vite.config.ts` içindeki `base: '/prompterest'` web içindir — mobile config'e taşıma

## İletişim Tarzı

Kullanıcı (Sinan) bu projenin beginner'ı sayılır. Her açıklamada şu kurallara uy:

- **Rubber duck debugging tarzı:** Teknik kavramları sıfır bağlam varsayarak açıkla. "nginx proxy" diyorsan ne yaptığını da söyle. "CORS" diyorsan neden önemli olduğunu da söyle.
- **Adım adım:** Neden → Ne → Nasıl sırasıyla yürü. Sonuca atlamadan önce bağlamı kur.
- **Varsayım yapma:** Bir şeyin neden öyle olduğunu bildiğini varsayma, kısa da olsa açıkla.
- Jargon kullanıyorsan parantez içinde Türkçe/sade karşılığını ver.

## Görev Belirsizse: Önce Soru Sor

Bir görev birden fazla şekilde yorumlanabiliyorsa veya önemli bir tercih kararı içeriyorsa, koda geçmeden önce kısa ve net sorular sor. Kural:

- Sormadan önce kendine sor: "Bu yorumu yanlış anlasam ne kadar iş ziyan olur?" — cevap büyükse, sor.
- Sorular kısa ve seçenekli olsun (evet/hayır veya A/B/C formatı), açık uçlu değil.
- Basit, tek adımlı görevlerde soru sorma — direkt yap.

## writing-plans Skill Eki: Premortem

`superpowers:writing-plans` skill'i çalıştırıldığında, planın sonuna her zaman şu bölümü ekle:

```markdown
## Premortem: Bu Plan Neden Başarısız Olabilir?

> Plan başarısız oldu — geriye dönüp bakıyoruz. En olası sebepler:

| # | Risk | Olasılık | Önlem |
|---|------|----------|-------|
| 1 | ...  | Yüksek/Orta/Düşük | ... |
...
```

- 5–8 madde yeterli, hepsini doldurmak için zorla uzatma.
- Gerçekçi riskler yaz: teknik borç, eksik bağımlılık, yanlış varsayım, test edilemeyen köşe case'i gibi.
- Her riskin yanına somut bir önlem yaz, "dikkatli ol" gibi boş ifadeler değil.
