import type { RefactorResult, RefactorSegment } from '../types';

// ── Backend API ───────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? '';

export interface AuthUser { id: string; email: string; username: string; }

export interface ApiVersion {
  id: string; promptId: string; content: string;
  imageUrl: string | null; versionName: string; createdAt: string;
}

export interface ApiPrompt {
  id: string; userId: string; title: string; content: string;
  imageUrl: string | null; tags: string[]; isPublic: boolean;
  styleId?: string | null; modelId?: string | null;
  currentVersionId: string | null; currentVersion: ApiVersion | null;
  createdAt: string; updatedAt: string;
  authorUsername?: string | null; authorAvatar?: string | null;
}

export interface ApiSaved {
  id: string; userId: string; promptId: string; createdAt: string;
  prompt: ApiPrompt;
}

export function getToken(): string | null { return localStorage.getItem('auth_token'); }
function setToken(t: string) { localStorage.setItem('auth_token', t); }
export function clearToken() { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }
export function getStoredUser(): AuthUser | null {
  const r = localStorage.getItem('auth_user'); return r ? JSON.parse(r) : null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data as T;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  setToken(res.token);
  localStorage.setItem('auth_user', JSON.stringify(res.user));
  return res.user;
}

export async function apiRegister(email: string, password: string, username?: string): Promise<AuthUser> {
  const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, username: username || email.split('@')[0] }),
  });
  setToken(res.token);
  localStorage.setItem('auth_user', JSON.stringify(res.user));
  return res.user;
}

export function apiLogout() { clearToken(); }

export async function fetchPrompts(): Promise<ApiPrompt[]> { return apiFetch<ApiPrompt[]>('/api/prompts'); }
export async function fetchPromptById(id: string): Promise<ApiPrompt> { return apiFetch<ApiPrompt>(`/api/prompts/${id}`); }
export async function fetchVersionsForPrompt(promptId: string): Promise<ApiVersion[]> { return apiFetch<ApiVersion[]>(`/api/prompts/${promptId}/versions`); }
export async function createPromptWithVersion(title: string, content: string, imageUrl?: string, tags?: string[]): Promise<ApiPrompt> {
  return apiFetch<ApiPrompt>('/api/prompts', { method: 'POST', body: JSON.stringify({ title, content, imageUrl, tags: tags ?? [] }) });
}
export async function createVersion(promptId: string, content: string, versionName: string, imageUrl?: string): Promise<ApiVersion> {
  return apiFetch<ApiVersion>(`/api/prompts/${promptId}/versions`, { method: 'POST', body: JSON.stringify({ content, versionName, imageUrl }) });
}
export async function fetchSavedPrompts(): Promise<ApiSaved[]> { return apiFetch<ApiSaved[]>('/api/prompts/saved/list'); }
export async function toggleSavePrompt(promptId: string): Promise<{ saved: boolean }> {
  return apiFetch<{ saved: boolean }>(`/api/prompts/${promptId}/save`, { method: 'POST' });
}


// ── AI (proxied through the backend; provider keys never reach the browser) ──

type RawSegment = { original: string; alternatives: string[] };

function toRefactorSegments(
  raw: RawSegment[],
  prompt: string
): RefactorSegment[] {
  const result: RefactorSegment[] = [];
  for (const s of raw) {
    const startIndex = prompt.indexOf(s.original);
    if (startIndex === -1) continue;
    result.push({
      id: crypto.randomUUID() as string,
      original: s.original,
      startIndex,
      endIndex: startIndex + s.original.length,
      reason: '',
      alternatives: s.alternatives.map((text) => ({ id: crypto.randomUUID() as string, text })),
    });
  }
  return result;
}

export async function refactorPrompt(prompt: string): Promise<RefactorResult> {
  const { segments } = await apiFetch<{ segments: RawSegment[] }>('/api/ai/refactor', {
    method: 'POST', body: JSON.stringify({ prompt }),
  });
  return { originalPrompt: prompt, segments: toRefactorSegments(segments, prompt) };
}

export async function generateImage(prompt: string): Promise<{ imageUrl: string }> {
  return apiFetch<{ imageUrl: string }>('/api/ai/image', {
    method: 'POST', body: JSON.stringify({ prompt }),
  });
}
