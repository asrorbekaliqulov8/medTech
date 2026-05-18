export interface StoredAuth {
  tgId: number;
  role: string;
  lang: 'uz' | 'ru' | 'en';
  username?: string;
}

const KEY = 'staff_auth';

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tgId) return null;
    return parsed as StoredAuth;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth) {
  sessionStorage.setItem(KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  sessionStorage.removeItem(KEY);
}
