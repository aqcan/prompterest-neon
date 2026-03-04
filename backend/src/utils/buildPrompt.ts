const MAX_USER_TEXT = 300;
const MAX_SCENE = 150;
const MAX_TOTAL = 500;

const sanitize = (s: string) =>
  s.trim().replace(/^[,\s]+|[,\s]+$/g, '').replace(/,{2,}/g, ',');

// systemPrompt backend'de birleştirilir
export function buildPromptWithStyle(
  userText: string,
  scene?: string,
  systemPrompt?: string,
): string {
  const text = sanitize(userText).slice(0, MAX_USER_TEXT);
  const sc = scene ? sanitize(scene).slice(0, MAX_SCENE) : undefined;
  return [text, sc, systemPrompt].filter(Boolean).join(', ').slice(0, MAX_TOTAL);
}
