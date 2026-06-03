import type { User } from "./types";

const SESSION_KEY = "cc_user";

export function saveSession(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
