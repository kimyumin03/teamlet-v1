'use server'

// 권한(permission) 서버 액션 — drizzle/Neon. 원본 modules/permission/userrole.ts 재현 (구성원 상세 권한 탭).
//   - 권한: permission.role.manage
//   - assignRole: 새 역할 부여 전 기존 활성 역할 전부 비활성화(DYNAMIC_ORG_HEAD 제외) — 교체 의미.
//     이미 활성 매핑이면 CONFLICT. 비활성 매핑이 있으면 재활성화.
//   - revokeRole: isActive=false. SYSTEM_SUPER_ADMIN 해제는 마지막이면 거절(락아웃 가드).
// ⚠️ v1 user_roles 스키마엔 assignedAt/assignedByUserId 컬럼이 없어 저장 안 함 (missingSchemaColumns).

import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { userRoles, roles, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  toApiResponse,
  ok,
  err,
  errors,
  type ApiResponse,
  type Result,
} from '@teamlet/shared'

const ROLE_MANAGE = 'permission.role.manage'

export async function assignRoleAction(
  targetEmployeeId: string,
  roleId: string,
): Promise<ApiResponse<{ userRoleId: string }>> {
  const run = async (): Promise<Result<{ userRoleId: string }>> => {
    const user = await getCurrentUser()
    if (!(await hasPermission(user.employeeId, ROLE_MANAGE))) {
      return err(errors.forbidden('permission.role.manage 권한이 필요해요'))
    }
    const db = getDb()
    const [target, role] = await Promise.all([
      db.select({ id: employees.id, companyId: employees.companyId }).from(employees).where(eq(employees.id, targetEmployeeId)).limit(1),
      db.select({ id: roles.id, companyId: roles.companyId }).from(roles).where(eq(roles.id, roleId)).limit(1),
    ])
    if (!target.length || target[0].companyId !== user.companyId) return err(errors.notFound('대상 직원을 찾을 수 없어요'))
    if (!role.length || role[0].companyId !== user.companyId) return err(errors.notFound('역할을 찾을 수 없어요'))

    const existing = await db
      .select({ id: userRoles.id, isActive: userRoles.isActive })
      .from(userRoles)
      .where(and(eq(userRoles.employeeId, targetEmployeeId), eq(userRoles.roleId, roleId)))
      .limit(1)
    if (existing.length && existing[0].isActive) return err(errors.conflict('이미 부여된 역할이에요'))

    // 기존 활성 역할 전부 비활성화 (DYNAMIC_ORG_HEAD 제외) — 교체 의미론
    const actives = await db
      .select({ id: userRoles.id, roleType: roles.type })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.employeeId, targetEmployeeId), eq(userRoles.isActive, true)))
    for (const a of actives) {
      if (a.roleType === 'DYNAMIC_ORG_HEAD') continue
      await db.update(userRoles).set({ isActive: false }).where(eq(userRoles.id, a.id))
    }

    let userRoleId: string
    try {
      if (existing.length) {
        userRoleId = existing[0].id
        await db.update(userRoles).set({ isActive: true }).where(eq(userRoles.id, userRoleId))
      } else {
        userRoleId = crypto.randomUUID()
        await db.insert(userRoles).values({ id: userRoleId, employeeId: targetEmployeeId, roleId, isActive: true })
      }
    } catch (e) {
      console.error('[db] assignRole 실패', e)
      return err(errors.internal('역할 부여 중 오류가 발생했어요'))
    }
    return ok({ userRoleId })
  }
  return toApiResponse(await run())
}

export async function revokeRoleAction(
  userRoleId: string,
): Promise<ApiResponse<{ userRoleId: string }>> {
  const run = async (): Promise<Result<{ userRoleId: string }>> => {
    const user = await getCurrentUser()
    if (!(await hasPermission(user.employeeId, ROLE_MANAGE))) {
      return err(errors.forbidden('permission.role.manage 권한이 필요해요'))
    }
    const db = getDb()
    const ur = await db
      .select({
        id: userRoles.id,
        isActive: userRoles.isActive,
        roleType: roles.type,
        empCompanyId: employees.companyId,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(employees, eq(employees.id, userRoles.employeeId))
      .where(eq(userRoles.id, userRoleId))
      .limit(1)
    if (!ur.length || ur[0].empCompanyId !== user.companyId) return err(errors.notFound('부여 정보를 찾을 수 없어요'))
    if (ur[0].isActive === false) return err(errors.conflict('이미 해제된 역할이에요'))

    if (ur[0].roleType === 'SYSTEM_SUPER_ADMIN') {
      const supers = await db
        .select({ id: userRoles.id, employeeId: userRoles.employeeId })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(employees, eq(employees.id, userRoles.employeeId))
        .where(and(eq(userRoles.isActive, true), eq(roles.type, 'SYSTEM_SUPER_ADMIN'), eq(roles.companyId, user.companyId), eq(employees.isActive, true)))
      const remaining = supers.filter((s) => s.id !== userRoleId)
      if (remaining.length === 0) return err(errors.conflict('마지막 최고 관리자 권한은 해제할 수 없어요'))
    }

    try {
      await db.update(userRoles).set({ isActive: false }).where(eq(userRoles.id, userRoleId))
    } catch (e) {
      console.error('[db] revokeRole 실패', e)
      return err(errors.internal('역할 해제 중 오류가 발생했어요'))
    }
    return ok({ userRoleId })
  }
  return toApiResponse(await run())
}
