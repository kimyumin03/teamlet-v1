'use server'

// 2단계 인증(MFA) 서버 액션 — 설정 영역 소유.
// 원본 lib/actions/mfa.ts + packages/modules/src/security/mfa.ts 의
// 시그니처/반환형(ApiResponse)을 그대로 유지해 컴포넌트가 수정 없이 컴파일되게 해요.
// ⚠️ v1 schema 엔 user_mfa 테이블이 선언돼 있지 않고, qrcode/otplib 의존성도 미설치라
//    실제 비밀키 영속화는 못 해요(blockers/missingSchemaColumns 보고).
//    TOTP 검증 로직 자체는 node:crypto(HMAC-SHA1)로 의존성 없이 구현해 둬, 테이블만 연결되면 동작.

import { createHmac, randomBytes } from 'node:crypto'
import { getCurrentUser } from '@/lib/current-user'
import { type ApiResponse } from '@teamlet/shared'
import type { MfaStatus } from '@teamlet/modules/company'

const ISSUER = 'Teamlet'

/* ── base32 (RFC4648) — otpauth secret 인코딩 ── */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}
function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, '').toUpperCase().replace(/\s/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** TOTP 코드 생성 (RFC6238, SHA1, 6자리, 30초) — node:crypto 만 사용. */
export function totp(secretBase32: string, forTime = Date.now()): string {
  const key = base32Decode(secretBase32)
  const counter = Math.floor(forTime / 1000 / 30)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, '0')
}

/** ±1 윈도우 허용 검증. */
export function verifyTotp(secretBase32: string, token: string): boolean {
  const now = Date.now()
  for (const drift of [-1, 0, 1]) {
    if (totp(secretBase32, now + drift * 30_000) === token) return true
  }
  return false
}

export async function getMfaStatusAction(): Promise<ApiResponse<MfaStatus>> {
  // user_mfa 테이블 미선언 → 항상 비활성 상태 반환.
  await getCurrentUser()
  return { ok: true, data: { isEnabled: false, enabledAt: null } }
}

export async function generateMfaSecretAction(): Promise<
  ApiResponse<{ secret: string; qrDataUrl: string }>
> {
  const user = await getCurrentUser()
  // secret/otpauthUrl/qrDataUrl 은 의존성 없이 만들 수 있지만, 영속화할 user_mfa 테이블이 없어 활성화는 막아요.
  // 테이블 연결 후엔 { ok: true, data: { secret, qrDataUrl } } 로 전환하면 동작해요.
  const secret = base32Encode(randomBytes(20))
  const label = encodeURIComponent(`${ISSUER}:${user.name}`)
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}`
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`
  void secret
  void qrDataUrl
  return {
    ok: false,
    error: {
      code: 'INTERNAL',
      message: '2FA 활성화는 아직 준비 중이에요 (user_mfa 테이블 미연결).',
    },
  }
}

export async function enableMfaAction(_code: string): Promise<ApiResponse<void>> {
  await getCurrentUser()
  return {
    ok: false,
    error: { code: 'INTERNAL', message: '2FA 활성화는 아직 준비 중이에요 (user_mfa 테이블 미연결).' },
  }
}

export async function disableMfaAction(_code: string): Promise<ApiResponse<void>> {
  await getCurrentUser()
  return {
    ok: false,
    error: { code: 'INTERNAL', message: '2FA 비활성화는 아직 준비 중이에요 (user_mfa 테이블 미연결).' },
  }
}
