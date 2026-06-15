/**
 * 도메인 에러 + Result 패턴 (docs/04 §3-5).
 * never throw raw — 항상 Result<T,E> 또는 명시적 도메인 에러.
 */

export type Ok<T> = { ok: true; data: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "INTERNAL";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.meta = meta;
  }

  toJSON() {
    return { code: this.code, message: this.message, meta: this.meta };
  }
}

export const errors = {
  unauthenticated: (msg = "로그인이 필요해요") =>
    new DomainError("UNAUTHENTICATED", msg),
  forbidden: (msg = "권한이 없어요") => new DomainError("FORBIDDEN", msg),
  notFound: (msg = "찾을 수 없어요") => new DomainError("NOT_FOUND", msg),
  conflict: (msg: string, meta?: Record<string, unknown>) =>
    new DomainError("CONFLICT", msg, meta),
  validation: (msg: string, meta?: Record<string, unknown>) =>
    new DomainError("VALIDATION", msg, meta),
  rateLimited: (msg = "잠시 후 다시 시도해 주세요") =>
    new DomainError("RATE_LIMITED", msg),
  internal: (msg = "일시적인 오류가 발생했어요") =>
    new DomainError("INTERNAL", msg),
} as const;

/** API 응답 표준 (docs/04 §3-5) */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: DomainErrorCode; message: string } };

export function toApiResponse<T>(result: Result<T>): ApiResponse<T> {
  if (result.ok) return { ok: true, data: result.data };
  return {
    ok: false,
    error: { code: result.error.code, message: result.error.message },
  };
}
