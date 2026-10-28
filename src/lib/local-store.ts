"use client";

const FAVORITES = "imps.favorites.v1";
const COMPARE = "imps.compare.v1";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("imps:store", { detail: { key } }));
}

export function getFavorites(): string[] {
  return read(FAVORITES);
}

export function isFavorite(id: string): boolean {
  return read(FAVORITES).includes(id);
}

export function toggleFavorite(id: string): boolean {
  const current = read(FAVORITES);
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  write(FAVORITES, next);
  return next.includes(id);
}

export function getCompare(): string[] {
  return read(COMPARE);
}

export function toggleCompare(id: string): { added: boolean; full: boolean } {
  const current = read(COMPARE);
  if (current.includes(id)) {
    write(COMPARE, current.filter((x) => x !== id));
    return { added: false, full: false };
  }
  if (current.length >= 4) return { added: false, full: true };
  write(COMPARE, [...current, id]);
  return { added: true, full: false };
}

export function clearCompare(): void {
  write(COMPARE, []);
}

export function onChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("imps:store", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("imps:store", handler);
    window.removeEventListener("storage", handler);
  };
}
