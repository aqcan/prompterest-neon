import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getToken,
  getStoredUser,
  clearToken,
  apiLogin,
  apiRegister,
  apiLogout,
  fetchPrompts,
  fetchPromptById,
  fetchVersionsForPrompt,
  fetchSavedPrompts,
  toggleSavePrompt,
  createPromptWithVersion,
  createVersion,
} from './api';

// ── Backend API functions ────────────────────────────────────

describe('getToken / getStoredUser / clearToken', () => {
  beforeEach(() => localStorage.clear());

  it('getToken returns null when not set', () => {
    expect(getToken()).toBeNull();
  });

  it('getToken returns stored token', () => {
    localStorage.setItem('auth_token', 'mytoken');
    expect(getToken()).toBe('mytoken');
  });

  it('getStoredUser returns null when not set', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('getStoredUser returns parsed user', () => {
    const user = { id: '1', email: 'a@b.com', username: 'u' };
    localStorage.setItem('auth_user', JSON.stringify(user));
    expect(getStoredUser()).toEqual(user);
  });

  it('clearToken removes both keys', () => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', '{}');
    clearToken();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});

describe('apiLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores token and returns user on success', async () => {
    const mockUser = { id: 'u1', email: 'a@b.com', username: 'u' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-tok', user: mockUser }),
    }));
    const user = await apiLogin('a@b.com', 'pass');
    expect(user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe('jwt-tok');
  });

  it('throws on error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    }));
    await expect(apiLogin('a@b.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('apiRegister', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores token and returns user on success', async () => {
    const mockUser = { id: 'u1', email: 'new@b.com', username: 'newuser' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-tok', user: mockUser }),
    }));
    const user = await apiRegister('new@b.com', 'pass', 'newuser');
    expect(user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe('jwt-tok');
  });

  it('uses email prefix as username when username not provided', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com', username: 'test' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'tok', user: mockUser }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await apiRegister('test@example.com', 'pass');
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string) as { username: string };
    expect(body.username).toBe('test');
  });
});

describe('apiLogout', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('clears token from localStorage', () => {
    localStorage.setItem('auth_token', 'tok');
    apiLogout();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('fetchPrompts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls /api/prompts and returns data', async () => {
    const mockData = [{ id: 'p1', title: 'Test' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));
    const result = await fetchPrompts();
    expect(result).toEqual(mockData);
  });
});

describe('fetchPromptById', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls /api/prompts/:id and returns prompt', async () => {
    const mockData = { id: 'p1', title: 'Test' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));
    const result = await fetchPromptById('p1');
    expect(result).toEqual(mockData);
  });
});

describe('fetchVersionsForPrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns versions array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    const result = await fetchVersionsForPrompt('p1');
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('fetchSavedPrompts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns saved prompts array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    const result = await fetchSavedPrompts();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('toggleSavePrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns saved: true when saving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ saved: true }),
    }));
    const result = await toggleSavePrompt('p1');
    expect(result.saved).toBe(true);
  });

  it('returns saved: false when unsaving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ saved: false }),
    }));
    const result = await toggleSavePrompt('p1');
    expect(result.saved).toBe(false);
  });
});

describe('createPromptWithVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/prompts and returns created prompt', async () => {
    const mockPrompt = { id: 'p1', title: 'T', content: 'C' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPrompt),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await createPromptWithVersion('T', 'C');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/prompts');
    expect((opts as RequestInit).method).toBe('POST');
    expect(result).toEqual(mockPrompt);
  });
});

describe('createVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/prompts/:id/versions', async () => {
    const mockVersion = { id: 'v2', content: 'updated' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVersion),
    }));
    const result = await createVersion('p1', 'updated', 'v2');
    expect(result).toEqual(mockVersion);
  });
});
