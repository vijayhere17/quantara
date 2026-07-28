import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddr(addr?: string, size = 4) {
  if (!addr) return "—";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
