import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 조건부 className 병합 (Tailwind 충돌 해소) — 원본 @teamlet/ui 그대로. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
