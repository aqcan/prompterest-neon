// LLM yanıtından {original, alternatives} segmentlerini çıkaran yardımcılar.
// Model çıktısı <think> blokları, markdown çitleri veya düz metin içerebilir.

export interface JsonCharState { depth: number; inStr: boolean; esc: boolean; }

export function processJsonChar(ch: string, state: JsonCharState): boolean {
  if (state.esc) { state.esc = false; return false; }
  if (ch === '\\') { state.esc = true; return false; }
  if (ch === '"') { state.inStr = !state.inStr; return false; }
  if (state.inStr) return false;
  if (ch === '{') { state.depth++; return false; }
  if (ch === '}') { state.depth--; return state.depth === 0; }
  return false;
}

export function findJsonBounds(text: string): [number, number] | null {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;
  const state: JsonCharState = { depth: 0, inStr: false, esc: false };
  for (let i = startIdx; i < text.length; i++) {
    if (processJsonChar(text[i], state)) return [startIdx, i];
  }
  return null;
}

export function parseSegmentsFormat1(
  parsed: Record<string, unknown>
): Array<{ original: string; alternatives: string[] }> | null {
  if (!Array.isArray(parsed.segments)) return null;
  return (parsed.segments as Array<{ original: string; alternatives: string[] }>)
    .slice(0, 3)
    .map((s) => ({
      original: s.original,
      alternatives: Array.isArray(s.alternatives) ? s.alternatives.slice(0, 3) : [],
    }));
}

export function parseSegmentsFormat2(
  parsed: Record<string, unknown>
): Array<{ original: string; alternatives: string[] }> | null {
  const segments: Array<{ original: string; alternatives: string[] }> = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      segments.push({ original: key, alternatives: (value as string[]).slice(0, 3) });
    }
    if (segments.length >= 3) break;
  }
  return segments.length > 0 ? segments : null;
}

export function parseRawSegments(raw: string): Array<{ original: string; alternatives: string[] }> {
  let text = raw;
  text = text.replaceAll(/<think>[\s\S]*?(<\/think>|$)/gi, '');
  text = text.replaceAll(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '');
  text = text.replaceAll(/```json\s*/gi, '').replaceAll(/```\s*/gi, '').trim();

  const bounds = findJsonBounds(text);
  if (!bounds) throw new Error('No JSON found in LLM response.');

  const parsed = JSON.parse(text.slice(bounds[0], bounds[1] + 1)) as Record<string, unknown>;

  const result = parseSegmentsFormat1(parsed) ?? parseSegmentsFormat2(parsed);
  if (!result) throw new Error('Could not extract segments from LLM response.');
  return result;
}
