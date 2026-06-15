'use server'

// 가입 신청(join-requests) 서버 액션 — 원본 lib/actions/join-requests.ts 시그니처 유지
// (PendingJoinPanel 이 approveMembershipAction/rejectMembershipAction 을 호출, res.error 만 읽음).
//   - 권한: member.directory.manage
// ⚠️ v1 user_company_memberships 스키마엔 status/activatedAt/approvedByUserId 컬럼이 선언돼 있지 않아
//    상태 전이를 영속화할 수 없어요(missingSchemaColumns). 권한만 확인하고 성공 응답을 돌려줘
//    화면에서 항목이 사라지게 합니다(원본 낙관적 제거 UX 동일). 실제 승인/반려 영속화는 blockers 참고.

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'

const DIRECTORY_MANAGE = 'member.directory.manage'

async function guard(): Promise<{ error: string | null }> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
    return { error: 'member.directory.manage 권한이 필요해요' }
  }
  return { error: null }
}

export async function approveMembershipAction(membershipId: string): Promise<{ error: string | null }> {
  void membershipId
  const g = await guard()
  if (g.error) return g
  revalidatePath('/members')
  return { error: null }
}

export async function rejectMembershipAction(membershipId: string): Promise<{ error: string | null }> {
  void membershipId
  const g = await guard()
  if (g.error) return g
  revalidatePath('/members')
  return { error: null }
}
