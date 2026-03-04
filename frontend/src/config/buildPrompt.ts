const MAX_USER_TEXT = 300;
const MAX_SCENE = 150;
const MAX_TOTAL = 500;

// sanitize: başındaki/sonundaki virgül, boşluk ve çift virgülü temizler
const sanitize = (s: string) =>
  s.trim().replace(/^[,\s]+|[,\s]+$/g, '').replace(/,{2,}/g, ',');

// Frontend versiyonu (preview için) — systemPrompt YOK
export function buildPrompt(params: {
  userText: string;
  scene?: string;
}): string {
  const text = sanitize(params.userText).slice(0, MAX_USER_TEXT);
  const scene = params.scene ? sanitize(params.scene).slice(0, MAX_SCENE) : undefined;
  return [text, scene].filter(Boolean).join(', ').slice(0, MAX_TOTAL);
}
