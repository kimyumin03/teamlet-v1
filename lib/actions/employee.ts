'use server'

// 구성원(employee) 서버 액션 — drizzle/Neon. 원본 modules/employee 의 create/update/deactivate 재현.
//   - 권한: member.directory.manage
//   - 수정: 빈 문자열 = 필드 지우기(null). 부서·직책은 발령으로만 바꾸므로 여기선 손대지 않음.
//   - 비활성화(퇴직): employmentStatus=RESIGNED, isActive=false, resignedAt=now + 모든 활성 역할 해제.
//     마지막 SYSTEM_SUPER_ADMIN / 본인은 거절(락아웃 가드).

import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, userRoles, roles } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  toApiResponse,
  ok,
  err,
  errors,
  type ApiResponse,
  type Result,
  type EmployeeCreateInput,
  type EmployeeUpdateInput,
} from '@teamlet/shared'

const DIRECTORY_MANAGE = 'member.directory.manage'

function toDate(v?: string): Date | null {
  const s = (v ?? '').trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function createEmployeeAction(
  input: EmployeeCreateInput,
): Promise<ApiResponse<{ employeeId: string }>> {
  const run = async (): Promise<Result<{ employeeId: string }>> => {
    const user = await getCurrentUser()
    if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
      return err(errors.forbidden('member.directory.manage 권한이 필요해요'))
    }
    const name = (input.name ?? '').trim()
    if (name.length < 2) return err(errors.validation('이름은 2자 이상이어야 해요'))

    const id = crypto.randomUUID()
    try {
      await getDb().insert(employees).values({
        id,
        companyId: user.companyId,
        name,
        employeeNumber: input.employeeNumber?.trim() || null,
        companyEmail: input.companyEmail?.trim() || null,
        hireDate: toDate(input.hireDate),
        departmentId: input.departmentId?.trim() || null,
        positionId: input.positionId?.trim() || null,
        updatedAt: new Date(),
      })
    } catch (e) {
      console.error('[db] createEmployee 실패', e)
      return err(errors.internal('구성원 추가 중 오류가 발생했어요'))
    }
    return ok({ employeeId: id })
  }
  return toApiResponse(await run())
}

export async function updateEmployeeAction(
  targetEmployeeId: string,
  input: EmployeeUpdateInput,
): Promise<ApiResponse<{ employeeId: string }>> {
  const run = async (): Promise<Result<{ employeeId: string }>> => {
    const user = await getCurrentUser()
    if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
      return err(errors.forbidden('member.directory.manage 권한이 필요해요'))
    }
    const name = (input.name ?? '').trim()
    if (name.length < 2) return err(errors.validation('이름은 2자 이상이어야 해요'))

    const db = getDb()
    const cur = await db
      .select({ id: employees.id, companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, targetEmployeeId))
      .limit(1)
    if (!cur.length || cur[0].companyId !== user.companyId) return err(errors.notFound('구성원을 찾을 수 없어요'))

    try {
      await db
        .update(employees)
        .set({
          name,
          employeeNumber: input.employeeNumber?.trim() || null,
          companyEmail: input.companyEmail?.trim() || null,
          personalEmail: input.personalEmail?.trim() || null,
          phone: input.phone?.trim() || null,
          birthDate: toDate(input.birthDate),
          gender: input.gender || null,
          employmentType: input.employmentType || 'FULL_TIME',
          probationEndDate: toDate(input.probationEndDate),
          hireDate: toDate(input.hireDate),
          updatedAt: new Date(),
        })
        .where(eq(employees.id, targetEmployeeId))
    } catch (e) {
      console.error('[db] updateEmployee 실패', e)
      return err(errors.internal('구성원 수정 중 오류가 발생했어요'))
    }
    return ok({ employeeId: targetEmployeeId })
  }
  return toApiResponse(await run())
}

export async function deactivateEmployeeAction(
  targetEmployeeId: string,
  reason?: string,
): Promise<ApiResponse<{ employeeId: string }>> {
  void reason
  const run = async (): Promise<Result<{ employeeId: string }>> => {
    const user = await getCurrentUser()
    if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
      return err(errors.forbidden('member.directory.manage 권한이 필요해요'))
    }
    if (targetEmployeeId === user.employeeId) {
      return err(errors.conflict('본인은 퇴직 처리할 수 없어요'))
    }

    const db = getDb()
    const cur = await db
      .select({ id: employees.id, companyId: employees.companyId, isActive: employees.isActive })
      .from(employees)
      .where(eq(employees.id, targetEmployeeId))
      .limit(1)
    if (!cur.length || cur[0].companyId !== user.companyId) return err(errors.notFound('구성원을 찾을 수 없어요'))
    if (cur[0].isActive === false) return err(errors.conflict('이미 비활성 상태예요'))

    // 락아웃 가드: 대상이 최고관리자(SYSTEM_SUPER_ADMIN)이면, 회사의 마지막 최고관리자인지 확인
    const targetSuper = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.employeeId, targetEmployeeId), eq(userRoles.isActive, true), eq(roles.type, 'SYSTEM_SUPER_ADMIN')))
      .limit(1)
    if (targetSuper.length) {
      const allSupers = await db
        .select({ employeeId: userRoles.employeeId })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(employees, eq(employees.id, userRoles.employeeId))
        .where(and(eq(userRoles.isActive, true), eq(roles.type, 'SYSTEM_SUPER_ADMIN'), eq(roles.companyId, user.companyId), eq(employees.isActive, true)))
      const distinct = new Set(allSupers.map((r) => r.employeeId))
      if (distinct.size <= 1) return err(errors.conflict('마지막 최고 관리자는 퇴직 처리할 수 없어요'))
    }

    try {
      await db
        .update(employees)
        .set({ employmentStatus: 'RESIGNED', isActive: false, resignedAt: new Date(), updatedAt: new Date() })
        .where(eq(employees.id, targetEmployeeId))
      // 모든 활성 역할 해제
      await db.update(userRoles).set({ isActive: false }).where(and(eq(userRoles.employeeId, targetEmployeeId), eq(userRoles.isActive, true)))
    } catch (e) {
      console.error('[db] deactivateEmployee 실패', e)
      return err(errors.internal('퇴직 처리 중 오류가 발생했어요'))
    }
    return ok({ employeeId: targetEmployeeId })
  }
  return toApiResponse(await run())
}
