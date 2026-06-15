'use server'

// 부서(department) 서버 액션 — drizzle/Neon. 원본 lib/actions/department.ts + modules/department 의
// create/update/delete 비즈니스 의미를 동일하게 재현. 반환형은 원본과 동일한 ApiResponse<T>.
//   - 권한: member.directory.manage (없으면 FORBIDDEN)
//   - 같은 부모 아래 이름 중복 차단 (CONFLICT)
//   - 삭제는 soft (isActive=false) — 자식/직원 있으면 거절 (CONFLICT)

import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { departments, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  toApiResponse,
  ok,
  err,
  errors,
  type ApiResponse,
  type Result,
  type DepartmentCreateInput,
  type DepartmentUpdateInput,
} from '@teamlet/shared'

const DIRECTORY_MANAGE = 'member.directory.manage'

async function guardManage(): Promise<{ companyId: string } | { error: ReturnType<typeof errors.forbidden> }> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
    return { error: errors.forbidden('member.directory.manage 권한이 필요해요') }
  }
  return { companyId: user.companyId }
}

export async function createDepartmentAction(
  input: DepartmentCreateInput,
): Promise<ApiResponse<{ departmentId: string }>> {
  const run = async (): Promise<Result<{ departmentId: string }>> => {
    const g = await guardManage()
    if ('error' in g) return err(g.error)
    const name = (input.name ?? '').trim()
    if (name.length < 1) return err(errors.validation('부서명을 입력해 주세요'))
    const parentId = input.parentId?.trim() || null

    const db = getDb()
    // 상위 부서 검증 (있으면 같은 회사여야)
    if (parentId) {
      const parent = await db
        .select({ id: departments.id, companyId: departments.companyId })
        .from(departments)
        .where(eq(departments.id, parentId))
        .limit(1)
      if (!parent.length || parent[0].companyId !== g.companyId) {
        return err(errors.notFound('상위 부서를 찾을 수 없어요'))
      }
    }
    // 같은 부모 아래 이름 중복
    const dupWhere = parentId
      ? and(eq(departments.companyId, g.companyId), eq(departments.parentId, parentId), eq(departments.name, name), eq(departments.isActive, true))
      : and(eq(departments.companyId, g.companyId), isNull(departments.parentId), eq(departments.name, name), eq(departments.isActive, true))
    const dup = await db.select({ id: departments.id }).from(departments).where(dupWhere).limit(1)
    if (dup.length) return err(errors.conflict('같은 위치에 같은 이름의 부서가 있어요'))

    // sortOrder = 형제 수
    const siblingsWhere = parentId
      ? and(eq(departments.companyId, g.companyId), eq(departments.parentId, parentId))
      : and(eq(departments.companyId, g.companyId), isNull(departments.parentId))
    const siblings = await db.select({ id: departments.id }).from(departments).where(siblingsWhere)

    const id = crypto.randomUUID()
    try {
      await db.insert(departments).values({
        id,
        companyId: g.companyId,
        parentId,
        name,
        sortOrder: siblings.length,
        isActive: true,
        updatedAt: new Date(),
      })
    } catch (e) {
      console.error('[db] createDepartment 실패', e)
      return err(errors.internal('부서 추가 중 오류가 발생했어요'))
    }
    return ok({ departmentId: id })
  }
  return toApiResponse(await run())
}

export async function updateDepartmentAction(
  departmentId: string,
  input: DepartmentUpdateInput,
): Promise<ApiResponse<{ departmentId: string }>> {
  const run = async (): Promise<Result<{ departmentId: string }>> => {
    const g = await guardManage()
    if ('error' in g) return err(g.error)
    const name = (input.name ?? '').trim()
    if (name.length < 1) return err(errors.validation('부서명을 입력해 주세요'))

    const db = getDb()
    const cur = await db
      .select({ id: departments.id, companyId: departments.companyId, parentId: departments.parentId })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1)
    if (!cur.length || cur[0].companyId !== g.companyId) return err(errors.notFound('부서를 찾을 수 없어요'))

    const parentId = cur[0].parentId
    const dupWhere = parentId
      ? and(eq(departments.companyId, g.companyId), eq(departments.parentId, parentId), eq(departments.name, name), eq(departments.isActive, true))
      : and(eq(departments.companyId, g.companyId), isNull(departments.parentId), eq(departments.name, name), eq(departments.isActive, true))
    const dup = await db.select({ id: departments.id }).from(departments).where(dupWhere).limit(1)
    if (dup.length && dup[0].id !== departmentId) return err(errors.conflict('같은 위치에 같은 이름의 부서가 있어요'))

    try {
      await db.update(departments).set({ name, updatedAt: new Date() }).where(eq(departments.id, departmentId))
    } catch (e) {
      console.error('[db] updateDepartment 실패', e)
      return err(errors.internal('부서 수정 중 오류가 발생했어요'))
    }
    return ok({ departmentId })
  }
  return toApiResponse(await run())
}

export async function deleteDepartmentAction(
  departmentId: string,
): Promise<ApiResponse<{ departmentId: string }>> {
  const run = async (): Promise<Result<{ departmentId: string }>> => {
    const g = await guardManage()
    if ('error' in g) return err(g.error)

    const db = getDb()
    const cur = await db
      .select({ id: departments.id, companyId: departments.companyId })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1)
    if (!cur.length || cur[0].companyId !== g.companyId) return err(errors.notFound('부서를 찾을 수 없어요'))

    // 자식 부서(활성) 있으면 거절
    const children = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.parentId, departmentId), eq(departments.isActive, true)))
      .limit(1)
    if (children.length) return err(errors.conflict('하위 부서가 있어 삭제할 수 없어요'))

    // 배정된 직원(활성) 있으면 거절
    const assigned = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.departmentId, departmentId), eq(employees.isActive, true)))
      .limit(1)
    if (assigned.length) return err(errors.conflict('배정된 구성원이 있어 삭제할 수 없어요'))

    try {
      await db.update(departments).set({ isActive: false, updatedAt: new Date() }).where(eq(departments.id, departmentId))
    } catch (e) {
      console.error('[db] deleteDepartment 실패', e)
      return err(errors.internal('부서 삭제 중 오류가 발생했어요'))
    }
    return ok({ departmentId })
  }
  return toApiResponse(await run())
}
