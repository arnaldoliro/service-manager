import { TOKEN_KEY, TOKEN_COOKIE } from "./constants";

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresDate = new Date(payload.exp * 1000).toUTCString();
    document.cookie = `${TOKEN_COOKIE}=${token}; expires=${expiresDate}; path=/; SameSite=Lax`;
  } catch {
    document.cookie = `${TOKEN_COOKIE}=${token}; path=/; SameSite=Lax`;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE}=; Max-Age=0; path=/`;
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}
