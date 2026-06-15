/**
 * 한국 비즈니스 특화 검증 (docs/01 §7, docs/04 §2 /shared/utils/korean.ts).
 * 자유 텍스트 X — 형식 검증 + 체크섬.
 */

/** 사업자등록번호 형식 + 체크섬 (XXX-XX-XXXXX, 10자리) */
export function isValidBusinessNumber(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return false;

  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * weights[i]!;
  }
  sum += Math.floor((Number(digits[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(digits[9]);
}

/** 사업자번호 표시 포맷 (XXX-XX-XXXXX) */
export function formatBusinessNumber(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 법인등록번호 형식 (XXXXXX-XXXXXXX, 13자리) — 옵션 필드 */
export function isValidCorporateNumber(raw: string): boolean {
  return raw.replace(/\D/g, "").length === 13;
}

/** 주민등록번호 형식 + 체크섬 (외국인등록번호 동일 알고리즘) */
export function isValidResidentNumber(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 13) return false;

  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(d[i]) * weights[i]!;
  }
  const check = (11 - (sum % 11)) % 10;
  return check === Number(d[12]);
}

/** 한국 휴대전화 형식 (01X-XXXX-XXXX) */
export function isValidKoreanPhone(raw: string): boolean {
  return /^01[016789]\d{7,8}$/.test(raw.replace(/\D/g, ""));
}

/** 회사코드 형식 (XXXX-XXXX, 영대문자+숫자) — docs/03 §13 */
const COMPANY_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function isValidCompanyCode(code: string): boolean {
  return COMPANY_CODE_RE.test(code.trim().toUpperCase());
}

/** 회사코드 생성 (혼동 문자 0/O/1/I 제외) */
export function generateCompanyCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from(
      { length: n },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  return `${pick(4)}-${pick(4)}`;
}
