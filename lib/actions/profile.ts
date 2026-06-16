'use server'

// 내 프로필 서버 액션 — 설정 영역 소유. drizzle + Neon 직결.
// 원본 lib/actions/profile.ts + packages/modules/src/auth/profile.ts 의
// updateProfileAction/changePasswordAction 시그니처(useActionState 계약)·검증(zod)을 재현.
// ⚠️ v1 users schema 엔 phone/passwordHash/updatedAt 미선언 →
//    - 이름/연락처 수정은 원본이 employees.phone 도 동기화하던 것에 맞춰 employees 행에 직접 반영.
//    - 비밀번호 변경은 users.passwordHash 미선언이라 저장 불가 → 안내 메시지 반환(준비 중), DB 미변경.
//    (missingSchemaColumns / blockers 보고)

import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { profileUpdateSchema, changePasswordSchema } from '@teamlet/shared'
import type { UserProfile } from '@teamlet/modules/company'

export type ProfileActionState = { error: string | null; success?: boolean }

/** 내 프로필 조회 — 페이지 로더. employees(이름/연락처) + users(이메일) 조합. */
export async function getUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser()
  try {
    const rows = await getDb()
      .select({
        name: employees.name,
        phone: employees.phone,
        companyEmail: employees.companyEmail,
        personalEmail: employees.personalEmail,
      })
      .from(employees)
      .where(eq(employees.id, user.employeeId))
      .limit(1)
    const e = rows[0]
    if (!e) return { id: user.employeeId, name: user.name, email: '', phone: null, hasPassword: false }
    return {
      id: user.employeeId,
      name: e.name,
      email: e.companyEmail ?? e.personalEmail ?? '',
      phone: e.phone ?? null,
      // users.passwordHash 미선언 → 변경 폼은 항상 비활성(소셜/준비중 안내).
      hasPassword: false,
    }
  } catch (err) {
    console.error('[db] getUserProfile 실패', err)
    return { id: user.employeeId, name: user.name, email: '', phone: null, hasPassword: false }
  }
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser()
  const parsed = profileUpdateSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력 오류' }
  }
  try {
    // 원본은 users + employees 둘 다 갱신. v1 users.phone 미선언 → users.name 만, employees 는 name/phone.
    await getDb()
      .update(employees)
      .set({ name: parsed.data.name, phone: parsed.data.phone || null, updatedAt: new Date() })
      .where(eq(employees.id, user.employeeId))
    // users.name 도 동기화 (선언된 컬럼만).
    const u = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.name, user.name))
      .limit(1)
    if (u.length) {
      await getDb().update(users).set({ name: parsed.data.name }).where(eq(users.id, u[0].id))
    }
    return { error: null, success: true }
  } catch (err) {
    console.error('[db] updateProfile 실패', err)
    return { error: '저장에 실패했어요' }
  }
}

export async function changePasswordAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  // 검증은 원본과 동일하게 수행해 폼 UX 를 보존하되, users.passwordHash 미선언이라 실제 저장은 못 해요.
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get('currentPassword') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
    newPasswordConfirm: String(formData.get('newPasswordConfirm') ?? ''),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력 오류' }
  }
  return {
    error: '비밀번호 변경은 아직 준비 중이에요 (users.passwordHash 컬럼 미연결).',
  }
}
