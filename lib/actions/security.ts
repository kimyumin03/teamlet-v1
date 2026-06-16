'use server'

// 회사 보안 정책 서버 액션 — 설정 영역 소유. drizzle + Neon 직결.
// 원본 lib/actions/security.ts + packages/modules/src/security/policy.ts 의
// 시그니처/반환형(ApiResponse)·upsert 의미를 동일하게 재현.
// 권한: 원본 settings.company_security.read / .manage → v1 hasPermission 게이트.
// ⚠️ v1 company_security_policies schema 엔 mfaEnabled/ipRestrictionEnabled 만 선언 →
//    mfaMethod/mfaExemptIps/allowedIps/applyToSuperAdmin/updatedAt 는 저장 skip (missingSchemaColumns 보고).
//    폼은 원본 그대로 두되, 미선언 값은 화면 입력만 받고 DB 엔 두 토글만 반영.

import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companySecurityPolicies } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { toApiResponse, ok, err, errors, type Result, type ApiResponse } from '@teamlet/shared'
import type { SecurityPolicyItem, UpdateSecurityPolicyInput } from '@teamlet/modules/company'

const SECURITY_READ = 'settings.company_security.read'
const SECURITY_MANAGE = 'settings.company_security.manage'

export async function getSecurityPolicy(employeeId?: string): Promise<Result<SecurityPolicyItem>> {
  const user = await getCurrentUser()
  const actor = employeeId ?? user.employeeId
  if (!(await hasPermission(actor, SECURITY_READ))) {
    return err(errors.forbidden('보안 정책을 볼 권한이 없어요'))
  }
  try {
    const rows = await getDb()
      .select({
        mfaEnabled: companySecurityPolicies.mfaEnabled,
        ipRestrictionEnabled: companySecurityPolicies.ipRestrictionEnabled,
      })
      .from(companySecurityPolicies)
      .where(eq(companySecurityPolicies.companyId, user.companyId))
      .limit(1)
    const p = rows[0]
    // 미선언 컬럼(mfaMethod/IP 목록/applyToSuperAdmin)은 기본값으로 채워 원본 형태 유지.
    return ok({
      mfaEnabled: p?.mfaEnabled ?? false,
      mfaMethod: 'OTP',
      mfaExemptIps: [],
      ipRestrictionEnabled: p?.ipRestrictionEnabled ?? false,
      allowedIps: [],
      applyToSuperAdmin: false,
    })
  } catch (e) {
    console.error('[db] getSecurityPolicy 실패', e)
    return ok({
      mfaEnabled: false,
      mfaMethod: 'OTP',
      mfaExemptIps: [],
      ipRestrictionEnabled: false,
      allowedIps: [],
      applyToSuperAdmin: false,
    })
  }
}

export async function updateSecurityPolicyAction(
  input: UpdateSecurityPolicyInput,
): Promise<ApiResponse<void>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, SECURITY_MANAGE))) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '보안 정책을 수정할 권한이 없어요' } }
  }
  try {
    const existing = await getDb()
      .select({ id: companySecurityPolicies.id })
      .from(companySecurityPolicies)
      .where(eq(companySecurityPolicies.companyId, user.companyId))
      .limit(1)
    // 선언된 두 토글만 upsert. 나머지(mfaMethod/IP/applyToSuperAdmin)는 schema 미선언이라 skip.
    const set: Record<string, unknown> = {}
    if (input.mfaEnabled !== undefined) set.mfaEnabled = input.mfaEnabled
    if (input.ipRestrictionEnabled !== undefined) set.ipRestrictionEnabled = input.ipRestrictionEnabled
    if (existing.length) {
      if (Object.keys(set).length) {
        await getDb()
          .update(companySecurityPolicies)
          .set(set)
          .where(eq(companySecurityPolicies.companyId, user.companyId))
      }
    } else {
      await getDb().insert(companySecurityPolicies).values({
        id: crypto.randomUUID(),
        companyId: user.companyId,
        mfaEnabled: input.mfaEnabled ?? false,
        ipRestrictionEnabled: input.ipRestrictionEnabled ?? false,
      })
    }
    return toApiResponse(ok(undefined))
  } catch (e) {
    console.error('[db] updateSecurityPolicy 실패', e)
    return { ok: false, error: { code: 'INTERNAL', message: '저장에 실패했어요' } }
  }
}
