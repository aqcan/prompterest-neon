import { useState, useRef, useEffect } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0A0A0F;
    --surface: #13131A;
    --surface2: #1C1C26;
    --surface3: #22222F;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --accent: #7C6AF7;
    --accent2: #F76A8A;
    --accent3: #4AE89A;
    --text: #F0F0F5;
    --text2: #8888A0;
    --text3: #45455A;
    --panel-tab: 40px;
    --panel-open: 230px;
  }
  body { background: #050508; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'DM Sans', sans-serif; }
  .phone { width: 390px; height: 844px; background: var(--bg); border-radius: 48px; overflow: hidden; position: relative; box-shadow: 0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08); display: flex; flex-direction: column; }
  .statusbar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; font-size: 12px; font-weight: 600; color: var(--text); flex-shrink: 0; }
  .statusbar-time { font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.5px; }
  .statusbar-icons { display: flex; gap: 5px; align-items: center; font-size: 13px; }

  /* SCREENS */
  .screen { position: absolute; inset: 0; top: 44px; display: flex; flex-direction: column; transition: opacity 0.25s, transform 0.25s; }
  .screen.gone { opacity: 0; pointer-events: none; transform: translateY(12px); }

  /* ── STEP 0 ── */
  .s0 { background: var(--bg); justify-content: center; align-items: center; padding: 32px 28px; gap: 32px; }
  .s0-head { text-align: center; }
  .s0-head h2 { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: var(--text); line-height: 1.2; margin-bottom: 10px; }
  .s0-head p { font-size: 15px; color: var(--text2); line-height: 1.6; }
  .s0-cards { display: flex; flex-direction: column; gap: 12px; width: 100%; }
  .s0-card { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 20px 22px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
  .s0-card::after { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.2s; border-radius: 22px; }
  .s0-card.c1::after { background: linear-gradient(135deg, rgba(124,106,247,0.1), transparent); }
  .s0-card.c2::after { background: linear-gradient(135deg, rgba(247,106,138,0.1), transparent); }
  .s0-card.c3::after { background: linear-gradient(135deg, rgba(74,232,154,0.1), transparent); }
  .s0-card:hover::after, .s0-card:active::after { opacity: 1; }
  .s0-card:hover { border-color: rgba(255,255,255,0.14); transform: translateY(-1px); }
  .s0-icon { width: 50px; height: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
  .c1 .s0-icon { background: rgba(124,106,247,0.15); }
  .c2 .s0-icon { background: rgba(74,232,154,0.15); }
  .c3 .s0-icon { background: rgba(247,106,138,0.15); }
  .s0-txt h3 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .s0-txt p { font-size: 12px; color: var(--text2); line-height: 1.4; }
  .s0-arrow { margin-left: auto; color: var(--text3); font-size: 20px; flex-shrink: 0; }

  /* ── STEP 1 WRAPPER ── */
  .s1 { background: var(--bg); }
  .s1-header { height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .s1-header h3 { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; color: var(--text); }
  .hbtn { height: 34px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text2); font-size: 15px; transition: all 0.2s; padding: 0 10px; gap: 6px; font-size: 13px; font-weight: 600; }
  .hbtn:hover { background: var(--surface2); color: var(--text); }
  .token-chip { display: flex; align-items: center; gap: 5px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 5px 11px; font-size: 13px; font-weight: 700; color: var(--text); }

  /* WORKSPACE */
  .workspace { flex: 1; position: relative; overflow: hidden; display: flex; }

  /* SIDE PANEL TAB (collapsed) */
  .panel-tab {
    position: absolute; top: 0; bottom: 0;
    width: var(--panel-tab);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; z-index: 20; gap: 8px;
    transition: background 0.2s;
  }
  .panel-tab:hover { background: rgba(255,255,255,0.03); }
  .panel-tab.left-tab { left: 0; border-right: 1px solid var(--border); }
  .panel-tab.right-tab { right: 0; border-left: 1px solid var(--border); }
  .tab-icon { width: 30px; height: 30px; border-radius: 10px; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.2s; }
  .panel-tab:hover .tab-icon { background: var(--surface3); }
  .tab-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3); writing-mode: vertical-rl; transform: rotate(180deg); transition: color 0.2s; }
  .panel-tab:hover .tab-label { color: var(--text2); }

  /* SLIDE PANEL (expanded) */
  .slide-panel {
    position: absolute; top: 0; bottom: 0;
    width: var(--panel-open);
    background: var(--surface);
    z-index: 30;
    display: flex; flex-direction: column;
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
    overflow: hidden;
  }
  .slide-panel.lp { left: 0; border-right: 1px solid var(--border2); border-radius: 0 24px 24px 0; transform: translateX(-100%); }
  .slide-panel.rp { right: 0; border-left: 1px solid var(--border2); border-radius: 24px 0 0 24px; transform: translateX(100%); }
  .slide-panel.lp.open { transform: translateX(0); }
  .slide-panel.rp.open { transform: translateX(0); }

  .panel-head { padding: 16px 14px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .panel-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .panel-head-row h4 { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); }
  .panel-close { width: 26px; height: 26px; border-radius: 8px; background: var(--surface2); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text2); font-size: 14px; transition: all 0.2s; }
  .panel-close:hover { background: var(--surface3); color: var(--text); }
  .search-box { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 7px 10px; }
  .search-box input { background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: 'DM Sans', sans-serif; flex: 1; }
  .search-box input::placeholder { color: var(--text3); }
  .search-icon { color: var(--text3); font-size: 13px; }

  .panel-body { flex: 1; overflow-y: auto; padding: 12px 14px 20px; display: flex; flex-direction: column; gap: 16px; }
  .sec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text3); margin-bottom: 8px; }

  /* Style grid in left panel */
  .style-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .style-chip { background: var(--surface2); border: 1.5px solid transparent; border-radius: 12px; padding: 10px 8px; text-align: center; cursor: pointer; transition: all 0.18s; }
  .style-chip .chip-em { font-size: 22px; display: block; margin-bottom: 4px; }
  .style-chip .chip-name { font-size: 11px; font-weight: 600; color: var(--text2); }
  .style-chip:hover { border-color: rgba(124,106,247,0.35); }
  .style-chip.sel { border-color: var(--accent); background: rgba(124,106,247,0.12); }
  .style-chip.sel .chip-name { color: var(--text); }

  /* Model list */
  .model-item { background: var(--surface2); border: 1.5px solid transparent; border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.18s; margin-bottom: 7px; }
  .model-item:hover { border-color: rgba(124,106,247,0.3); }
  .model-item.sel { border-color: var(--accent); background: rgba(124,106,247,0.1); }
  .model-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .model-txt { flex: 1; }
  .model-txt h5 { font-size: 12px; font-weight: 600; color: var(--text); }
  .model-txt p { font-size: 10px; color: var(--text3); margin-top: 1px; }
  .model-cost { font-size: 11px; font-weight: 700; color: #F5C842; }
  .info-btn { width: 22px; height: 22px; border-radius: 7px; background: var(--surface3); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text3); font-size: 11px; font-weight: 700; font-style: italic; transition: all 0.2s; flex-shrink: 0; border: 1px solid var(--border); }
  .info-btn:hover { background: rgba(124,106,247,0.2); color: var(--accent); border-color: rgba(124,106,247,0.4); }

  /* Model info tooltip */
  .model-info-box { background: var(--surface3); border: 1px solid var(--border2); border-radius: 12px; padding: 12px 14px; margin-top: -4px; margin-bottom: 6px; }
  .model-info-box h6 { font-size: 11px; font-weight: 700; color: var(--accent); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .model-info-box p { font-size: 11px; color: var(--text2); line-height: 1.5; }
  .model-info-box .mib-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 7px; }
  .mib-tag { background: rgba(124,106,247,0.12); border-radius: 6px; padding: 2px 7px; font-size: 10px; font-weight: 600; color: var(--accent); }

  /* Template list */
  .tpl-item { background: var(--surface2); border: 1.5px solid transparent; border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.18s; margin-bottom: 7px; }
  .tpl-item:hover { border-color: rgba(247,106,138,0.35); }
  .tpl-item.sel { border-color: var(--accent2); background: rgba(247,106,138,0.1); }
  .tpl-icon { font-size: 22px; flex-shrink: 0; }
  .tpl-txt { flex: 1; }
  .tpl-txt h5 { font-size: 12px; font-weight: 600; color: var(--text); }
  .tpl-txt p { font-size: 10px; color: var(--text3); margin-top: 1px; }
  .tpl-cost { font-size: 11px; font-weight: 700; color: #F5C842; flex-shrink: 0; }

  /* CENTER */
  .center { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 12px calc(var(--panel-tab) + 8px); overflow: hidden; }
  .photo-box { flex: 1; background: var(--surface); border-radius: 20px; border: 1.5px dashed var(--border2); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; overflow: hidden; position: relative; cursor: pointer; transition: border-color 0.2s; min-height: 160px; max-height: 300px; }
  .photo-box:hover { border-color: rgba(124,106,247,0.4); }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; border-radius: 18px; }
  .photo-ph { text-align: center; color: var(--text3); padding: 0 20px; }
  .photo-ph .ph-em { font-size: 30px; margin-bottom: 6px; }
  .photo-ph p { font-size: 12px; line-height: 1.5; }
  .photo-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 600; color: var(--text); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 4px; }

  .pills-row { display: flex; gap: 6px; flex-wrap: wrap; min-height: 26px; }
  .pill { background: var(--surface2); border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: var(--text2); display: flex; align-items: center; gap: 5px; border: 1px solid var(--border); }
  .pill.pa { border-color: rgba(124,106,247,0.45); color: var(--accent); background: rgba(124,106,247,0.1); }
  .pill.pb { border-color: rgba(247,106,138,0.45); color: var(--accent2); background: rgba(247,106,138,0.1); }
  .pill-x { cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
  .pill-x:hover { opacity: 1; }

  .prompt-wrap { background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; transition: border-color 0.2s; flex-shrink: 0; }
  .prompt-wrap:focus-within { border-color: rgba(124,106,247,0.45); }
  .prompt-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3); }
  .prompt-in { background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: 'DM Sans', sans-serif; resize: none; min-height: 38px; line-height: 1.5; width: 100%; }
  .prompt-in::placeholder { color: var(--text3); }

  .gen-btn { background: linear-gradient(135deg, #7C6AF7, #9B6AF7); border: none; border-radius: 16px; padding: 14px; color: white; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 6px 20px rgba(124,106,247,0.35); flex-shrink: 0; transition: all 0.2s; }
  .gen-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(124,106,247,0.45); }
  .gen-cost { font-size: 12px; opacity: 0.8; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 2px 8px; }

  /* OVERLAY */
  .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 25; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
  .overlay.on { opacity: 1; pointer-events: all; }

  /* ── STEP 2 CONFIRM ── */
  .s2 { background: var(--bg); }
  .s2-head { height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .s2-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; color: var(--text); }
  .s2-body { flex: 1; padding: 20px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
  .confirm-img { background: var(--surface); border-radius: 18px; height: 160px; overflow: hidden; }
  .confirm-img img { width: 100%; height: 100%; object-fit: cover; }
  .confirm-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 44px; }
  .s2-section { display: flex; flex-direction: column; gap: 8px; }
  .s2-sec-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text3); }
  .confirm-row { background: var(--surface); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); }
  .cr-icon { font-size: 18px; }
  .cr-txt { flex: 1; }
  .cr-txt h4 { font-size: 13px; font-weight: 600; color: var(--text); }
  .cr-txt p { font-size: 11px; color: var(--text2); margin-top: 2px; font-style: italic; }
  .cr-badge { background: rgba(124,106,247,0.15); border-radius: 7px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: var(--accent); }
  .cr-badge.pink { background: rgba(247,106,138,0.15); color: var(--accent2); }
  .cost-row { background: var(--surface); border-radius: 12px; padding: 14px 16px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .cost-lbl { font-size: 13px; color: var(--text2); }
  .cost-num { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 5px; }
  .cost-num span { color: #F5C842; }
  .s2-footer { padding: 14px 18px 28px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .confirm-btn { background: linear-gradient(135deg, #7C6AF7, #9B6AF7); border: none; border-radius: 16px; padding: 16px; color: white; font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 20px rgba(124,106,247,0.35); transition: all 0.2s; }
  .confirm-btn:hover { transform: translateY(-1px); }
  .cancel-btn { background: none; border: 1px solid var(--border); border-radius: 16px; padding: 13px; color: var(--text2); font-family: 'DM Sans', sans-serif; font-size: 14px; cursor: pointer; transition: all 0.2s; }
  .cancel-btn:hover { border-color: var(--border2); color: var(--text); }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 3px; }
`;

// ─── DATA ───────────────────────────────────────────────
const MODES = [
  { id: "photo", cls: "c1", icon: "📷", title: "Fotoğrafımı kullan", desc: "Stil uygula, düzenle, dönüştür", hasPhoto: true },
  { id: "video", cls: "c2", icon: "🎬", title: "Fotoğrafımdan video yap", desc: "Canlandır, hareket ekle, konuştur", hasPhoto: true },
  { id: "scratch", cls: "c3", icon: "✍️", title: "Sıfırdan başla", desc: "Prompt yaz, görsel veya video üret", hasPhoto: false },
];

const STYLES_IMAGE = [
  { id: "glass", em: "🪟", name: "Glass" },
  { id: "anime", em: "✨", name: "Anime" },
  { id: "ghibli", em: "🌿", name: "Ghibli" },
  { id: "pixel", em: "👾", name: "Pixel Art" },
  { id: "oil", em: "🎨", name: "Oil Paint" },
  { id: "neon", em: "💜", name: "Neon" },
  { id: "clay", em: "🧸", name: "Clay" },
  { id: "cinematic", em: "🎬", name: "Cinematic" },
  { id: "watercolor", em: "💧", name: "Watercolor" },
  { id: "3d", em: "🔮", name: "3D Render" },
  { id: "comic", em: "💥", name: "Comic" },
  { id: "sketch", em: "✏️", name: "Sketch" },
];

const STYLES_VIDEO = [
  { id: "slow", em: "🌊", name: "Slow Motion" },
  { id: "zoom", em: "🔭", name: "Zoom In" },
  { id: "pan", em: "↔️", name: "Pan" },
  { id: "float", em: "🎈", name: "Float" },
  { id: "talking", em: "🗣️", name: "Konuştur" },
  { id: "shake", em: "📳", name: "Shake" },
  { id: "rotate", em: "🔄", name: "Rotate" },
  { id: "breathe", em: "💫", name: "Breathe" },
];

const MODELS_IMAGE = [
  { id: "flux-schnell", name: "FLUX Schnell", provider: "Black Forest Labs", desc: "Ultra hızlı üretim, draft kalitesi. Fikir test etmek için ideal.", tags: ["Hızlı", "Ucuz", "Draft"], dot: "#4AE89A", cost: 1 },
  { id: "flux-pro", name: "FLUX 1.1 Pro", provider: "Black Forest Labs", desc: "Yüksek detay, güçlü prompt uyumu. Çoğu kullanım için en iyi denge.", tags: ["Dengeli", "Yüksek Kalite"], dot: "#7C6AF7", cost: 3 },
  { id: "gpt-image", name: "GPT-Image-1", provider: "OpenAI", desc: "Metin ve görsel entegrasyonunda çok güçlü. Poster, tipografi.", tags: ["Metin", "Yaratıcı"], dot: "#10A37F", cost: 5 },
  { id: "seedream", name: "Seedream 4.5", provider: "ByteDance", desc: "Fotorealistik üretimde sınıfının en iyisi. Portre ve ürün görseli.", tags: ["Fotorealistik", "Portre"], dot: "#F76A8A", cost: 4 },
];

const MODELS_VIDEO = [
  { id: "kling", name: "Kling 2.6 Pro", provider: "Kuaishou", desc: "Sinematik hareket kalitesi. Yüksek tutarlılık ve gerçekçi fizik.", tags: ["Sinematik", "Realistik"], dot: "#7C6AF7", cost: 10 },
  { id: "wan26", name: "WAN 2.6", provider: "Alibaba", desc: "Ses senkronize video. Hızlı ve uygun fiyatlı video üretimi.", tags: ["Ses Sync", "Hızlı"], dot: "#4AE89A", cost: 6 },
  { id: "hailuo", name: "Hailuo 2.3", provider: "Minimax", desc: "Profesyonel video kalitesi, güçlü karakter hareketi.", tags: ["Profesyonel"], dot: "#F5C842", cost: 8 },
];

const TEMPLATES_IMAGE = [
  { id: "faceswap", icon: "😮", name: "Face Swap", desc: "Yüz değiştir", cost: 4 },
  { id: "headshot", icon: "👤", name: "AI Headshot", desc: "Profesyonel portre", cost: 6 },
  { id: "age", icon: "🕰️", name: "Age Filter", desc: "Yaşlandır / gençleştir", cost: 3 },
  { id: "background", icon: "🌆", name: "Background", desc: "Arka planı değiştir", cost: 2 },
  { id: "enhance", icon: "⬆️", name: "Upscale", desc: "Kaliteyi artır", cost: 2 },
];

const TEMPLATES_VIDEO = [
  { id: "talking", icon: "🗣️", name: "Talking Photo", desc: "Fotoğrafı konuştur", cost: 8 },
  { id: "animate", icon: "✨", name: "Canlandır", desc: "Serbest animasyon", cost: 6 },
  { id: "hug", icon: "🤗", name: "Hug / Kiss", desc: "İki kişiyi canlandır", cost: 7 },
  { id: "dance", icon: "💃", name: "Dans Ettir", desc: "Müziğe göre hareket", cost: 8 },
  { id: "upscale", icon: "⬆️", name: "Video Upscale", desc: "Video kalitesini artır", cost: 4 },
];

const TEMPLATES_SCRATCH = [
  { id: "animal", icon: "🐉", name: "Animal Mix", desc: "3 hayvandan yeni tür", cost: 5 },
  { id: "meme", icon: "😂", name: "Meme Yap", desc: "Hazır şablondan meme", cost: 2 },
  { id: "landscape", icon: "🏔️", name: "Manzara", desc: "Epik doğa sahnesi", cost: 3 },
  { id: "product", icon: "📦", name: "Ürün Görseli", desc: "E-ticaret fotoğrafı", cost: 4 },
];

const SAMPLE_IMG = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80";

// ─── COMPONENT ──────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [selStyle, setSelStyle] = useState(null);
  const [selTemplate, setSelTemplate] = useState(null);
  const [selModel, setSelModel] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [styleSearch, setStyleSearch] = useState("");
  const [tplSearch, setTplSearch] = useState("");
  const [infoModel, setInfoModel] = useState(null);

  const isVideo = mode?.id === "video";
  const isPhoto = mode?.id === "photo";
  const isScratch = mode?.id === "scratch";

  const allStyles = isVideo ? STYLES_VIDEO : STYLES_IMAGE;
  const allTemplates = isVideo ? TEMPLATES_VIDEO : isScratch ? TEMPLATES_SCRATCH : TEMPLATES_IMAGE;
  const allModels = isVideo ? MODELS_VIDEO : MODELS_IMAGE;

  const filteredStyles = allStyles.filter(s => s.name.toLowerCase().includes(styleSearch.toLowerCase()));
  const filteredTpls = allTemplates.filter(t => t.name.toLowerCase().includes(tplSearch.toLowerCase()));

  const selStyleData = allStyles.find(s => s.id === selStyle);
  const selTplData = allTemplates.find(t => t.id === selTemplate);
  const selModelData = allModels.find(m => m.id === selModel) || allModels[1];
  const totalCost = (selModelData?.cost || 3) + (selTplData?.cost || 0);

  const handleMode = (m) => {
    setMode(m);
    setSelStyle(null); setSelTemplate(null); setSelModel(null);
    setPrompt(""); setStyleSearch(""); setTplSearch("");
    setLeftOpen(false); setRightOpen(false); setInfoModel(null);
    if (m.hasPhoto) setPhotoUrl(SAMPLE_IMG);
    else setPhotoUrl(null);
    setStep(1);
  };

  const toggleLeft = () => { setLeftOpen(p => !p); if (rightOpen) setRightOpen(false); };
  const toggleRight = () => { setRightOpen(p => !p); if (leftOpen) setLeftOpen(false); };
  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const leftLabel = isVideo ? "Hareket" : "Stil";
  const leftIcon = isVideo ? "🎥" : "🎨";

  return (
    <>
      <style>{styles}</style>
      <div className="phone">
        {/* Status bar */}
        <div className="statusbar">
          <span className="statusbar-time">9:41</span>
          <div className="statusbar-icons"><span>●●●</span><span>WiFi</span><span>🔋</span></div>
        </div>

        {/* ── STEP 0 ── */}
        <div className={`screen s0 ${step !== 0 ? "gone" : ""}`}>
          <div className="s0-head">
            <h2>Ne oluşturmak<br />istiyorsun?</h2>
            <p>Başlangıç noktanı seç,<br />gerisini biz halledelim.</p>
          </div>
          <div className="s0-cards">
            {MODES.map(m => (
              <div key={m.id} className={`s0-card ${m.cls}`} onClick={() => handleMode(m)}>
                <div className="s0-icon">{m.icon}</div>
                <div className="s0-txt"><h3>{m.title}</h3><p>{m.desc}</p></div>
                <span className="s0-arrow">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 1 ── */}
        <div className={`screen s1 ${step !== 1 ? "gone" : ""}`}>
          <div className="s1-header">
            <div className="hbtn" onClick={() => setStep(0)}>‹ Geri</div>
            <h3>{mode?.title}</h3>
            <div className="token-chip">🪙 248</div>
          </div>

          <div className="workspace">
            {/* Overlay */}
            <div className={`overlay ${leftOpen || rightOpen ? "on" : ""}`} onClick={closeAll} />

            {/* Left panel TAB (collapsed) */}
            {!leftOpen && (
              <div className="panel-tab left-tab" onClick={toggleLeft}>
                <div className="tab-icon">{leftIcon}</div>
                <span className="tab-label">{leftLabel}</span>
              </div>
            )}

            {/* Right panel TAB (collapsed) */}
            {!rightOpen && (
              <div className="panel-tab right-tab" onClick={toggleRight}>
                <div className="tab-icon">🔥</div>
                <span className="tab-label">Şablon</span>
              </div>
            )}

            {/* LEFT SLIDE PANEL */}
            <div className={`slide-panel lp ${leftOpen ? "open" : ""}`}>
              <div className="panel-head">
                <div className="panel-head-row">
                  <h4>{leftIcon} {leftLabel} Seç</h4>
                  <div className="panel-close" onClick={toggleLeft}>✕</div>
                </div>
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    placeholder={`${leftLabel} ara...`}
                    value={styleSearch}
                    onChange={e => setStyleSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="panel-body">
                <div>
                  <div className="sec-label">{isVideo ? "Kamera & Hareket" : "Görsel Stiller"}</div>
                  <div className="style-grid">
                    {filteredStyles.map(s => (
                      <div
                        key={s.id}
                        className={`style-chip ${selStyle === s.id ? "sel" : ""}`}
                        onClick={() => { setSelStyle(selStyle === s.id ? null : s.id); setLeftOpen(false); }}
                      >
                        <span className="chip-em">{s.em}</span>
                        <span className="chip-name">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="sec-label">Yapay Zeka Modeli</div>
                  {allModels.map(m => (
                    <div key={m.id}>
                      <div
                        className={`model-item ${selModel === m.id || (!selModel && allModels[1].id === m.id) ? "sel" : ""}`}
                        onClick={() => setSelModel(m.id)}
                      >
                        <div className="model-dot" style={{background: m.dot}} />
                        <div className="model-txt">
                          <h5>{m.name}</h5>
                          <p>{m.provider}</p>
                        </div>
                        <span className="model-cost">🪙{m.cost}</span>
                        <div
                          className="info-btn"
                          onClick={e => { e.stopPropagation(); setInfoModel(infoModel === m.id ? null : m.id); }}
                        >i</div>
                      </div>
                      {infoModel === m.id && (
                        <div className="model-info-box">
                          <h6>ℹ️ {m.name}</h6>
                          <p>{m.desc}</p>
                          <div className="mib-tags">
                            {m.tags.map(t => <span key={t} className="mib-tag">{t}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT SLIDE PANEL */}
            <div className={`slide-panel rp ${rightOpen ? "open" : ""}`}>
              <div className="panel-head">
                <div className="panel-head-row">
                  <h4>🔥 Şablonlar</h4>
                  <div className="panel-close" onClick={toggleRight}>✕</div>
                </div>
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    placeholder="Şablon ara..."
                    value={tplSearch}
                    onChange={e => setTplSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="panel-body">
                <div>
                  <div className="sec-label">
                    {isVideo ? "Video Şablonları" : isScratch ? "Üretim Şablonları" : "Görsel Şablonlar"}
                  </div>
                  {filteredTpls.map(t => (
                    <div
                      key={t.id}
                      className={`tpl-item ${selTemplate === t.id ? "sel" : ""}`}
                      onClick={() => { setSelTemplate(selTemplate === t.id ? null : t.id); setRightOpen(false); }}
                    >
                      <span className="tpl-icon">{t.icon}</span>
                      <div className="tpl-txt"><h5>{t.name}</h5><p>{t.desc}</p></div>
                      <span className="tpl-cost">+{t.cost}🪙</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER */}
            <div className="center">
              {/* Photo box */}
              <div className="photo-box">
                {photoUrl
                  ? <><img src={photoUrl} alt="" /><div className="photo-badge">✓ Seçildi</div></>
                  : <div className="photo-ph">
                      <div className="ph-em">{isScratch ? "✨" : "📸"}</div>
                      <p>{isScratch ? "Hayal ettiğini yaz" : "Fotoğraf seçmek için dokun"}</p>
                    </div>
                }
              </div>

              {/* Active pills */}
              <div className="pills-row">
                {selStyleData && (
                  <div className="pill pa">
                    {selStyleData.em} {selStyleData.name}
                    <span className="pill-x" onClick={() => setSelStyle(null)}>×</span>
                  </div>
                )}
                {selTplData && (
                  <div className="pill pb">
                    {selTplData.icon} {selTplData.name}
                    <span className="pill-x" onClick={() => setSelTemplate(null)}>×</span>
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className="prompt-wrap">
                <div className="prompt-lbl">
                  Prompt {selStyle || selTemplate ? "— opsiyonel" : ""}
                </div>
                <textarea
                  className="prompt-in"
                  rows={2}
                  placeholder={
                    selStyle === "glass" ? "Ekstra detay... (örn. gece, şehir ışıkları)" :
                    selTemplate === "talking" ? "Ne söylesin? (opsiyonel)" :
                    isVideo ? "Hareketi tanımla... (örn. yavaşça sola bak)" :
                    "Hayal ettiğini yaz..."
                  }
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>

              {/* Generate */}
              <button className="gen-btn" onClick={() => setStep(2)}>
                <span>✦ Oluştur</span>
                <span className="gen-cost">🪙 {totalCost}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── STEP 2 CONFIRM ── */}
        <div className={`screen s2 ${step !== 2 ? "gone" : ""}`}>
          <div className="s2-head">
            <div className="hbtn" onClick={() => setStep(1)}>‹ Geri</div>
            <h3>Onayla & Üret</h3>
            <div style={{width: 60}} />
          </div>

          <div className="s2-body">
            <div className="confirm-img">
              {photoUrl
                ? <img src={photoUrl} alt="" />
                : <div className="confirm-img-ph">✨</div>
              }
            </div>

            <div className="s2-section">
              <div className="s2-sec-lbl">Seçimlerinin özeti</div>

              <div className="confirm-row">
                <span className="cr-icon">{mode?.icon}</span>
                <div className="cr-txt"><h4>{mode?.title}</h4></div>
                <span className="cr-badge">{isVideo ? "Video" : "Görsel"}</span>
              </div>

              {selStyleData && (
                <div className="confirm-row">
                  <span className="cr-icon">{selStyleData.em}</span>
                  <div className="cr-txt"><h4>{leftLabel}: {selStyleData.name}</h4><p>Otomatik prompt uygulanacak</p></div>
                  <span className="cr-badge">Seçili</span>
                </div>
              )}

              {selTplData && (
                <div className="confirm-row">
                  <span className="cr-icon">{selTplData.icon}</span>
                  <div className="cr-txt"><h4>{selTplData.name}</h4><p>{selTplData.desc}</p></div>
                  <span className="cr-badge pink">+{selTplData.cost}🪙</span>
                </div>
              )}

              {prompt.trim() && (
                <div className="confirm-row">
                  <span className="cr-icon">💬</span>
                  <div className="cr-txt"><h4>Prompt</h4><p>"{prompt.slice(0,45)}{prompt.length>45?"...":""}"</p></div>
                </div>
              )}

              <div className="confirm-row">
                <div className="model-dot" style={{background: selModelData?.dot, width:14, height:14, borderRadius:'50%', flexShrink:0}} />
                <div className="cr-txt">
                  <h4>{selModelData?.name}</h4>
                  <p>{selModelData?.provider}</p>
                </div>
                <span className="cr-badge">{selModelData?.cost}🪙</span>
              </div>
            </div>

            <div className="cost-row">
              <span className="cost-lbl">Toplam maliyet</span>
              <div className="cost-num"><span>🪙</span>{totalCost} token</div>
            </div>
          </div>

          <div className="s2-footer">
            <button className="confirm-btn" onClick={() => setStep(0)}>
              ✦ Şimdi Üret — 🪙{totalCost}
            </button>
            <button className="cancel-btn" onClick={() => setStep(1)}>Geri Dön, Değiştir</button>
          </div>
        </div>
      </div>
    </>
  );
}
