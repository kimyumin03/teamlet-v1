'use server'

// 초대 링크(invite) 서버 액션 — 원본 lib/actions/invite.ts 의 generateInviteLinkAction 시그니처 유지.
// 원본은 modules/auth.createEmployeeInvite 로 employee_invites 에 토큰 해시를 저장하고 rawToken 으로 URL 생성.
// ⚠️ v1 schema.ts 엔 employee_invites 테이블이 선언돼 있지 않아 토큰을 영속화할 수 없어요(missingSchemaColumns).
//    그래서 데모 동작으로: 권한 확인 후 임시 토큰으로 초대 URL 을 만들어 화면에 보여줘요(복사 UX 동일).
//    실제 토큰 검증/수락은 employee_invites 테이블 선언 후 연결해야 해요(blockers 참고).

import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { getDb } from '@/lib/db'
import { employees } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type InviteActionState = { error: string | null; inviteUrl?: string }

const DIRECTORY_MANAGE = 'member.directory.manage'

export async function generateInviteLinkAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
    return { error: 'member.directory.manage 권한이 필요해요' }
  }

  const employeeId = String(formData.get('employeeId') ?? '')
  if (!employeeId) return { error: '직원 ID가 없어요' }

  // 대상 직원이 같은 회사인지 확인
  const rows = await getDb()
    .select({ id: employees.id, companyId: employees.companyId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)
  if (!rows.length || rows[0].companyId !== user.companyId) return { error: '구성원을 찾을 수 없어요' }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const rawToken = crypto.randomUUID().replace(/-/g, '')
  const inviteUrl = `${baseUrl}/invite/${rawToken}`
  return { error: null, inviteUrl }
}
