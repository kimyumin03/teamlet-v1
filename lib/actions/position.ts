'use server'

// 직책(position) 서버 액션 — drizzle/Neon. 원본 modules/position 의 create/update/delete 재현.
//   - 권한: member.directory.manage
//   - 이름 중복 차단 (CONFLICT)
//   - 삭제는 soft (isActive=false) — 배정된 직원 있으면 거절

import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { positions, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  toApiResponse,
  ok,
  err,
  errors,
  type ApiResponse,
  type Result,
  type PositionCreateInput,
} from '@teamlet/shared'

const DIRECTORY_MANAGE = 'member.directory.manage'

async function guardManage(): Promise<{ companyId: string } | { error: ReturnType<typeof errors.forbidden> }> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
    return { error: errors.forbidden('member.directory.manage 권한이 필요해요') }
  }
  return { companyId: user.companyId }
}

export async function createPositionAction(
  input: PositionCreateInput,
): Promise<ApiResponse<{ positionId: string }>> {
  const run = async (): Promise<Result<{ positionId: string }>> => {
    const g = await guardManage()
    if ('error' in g) return err(g.error)
    const name = (input.name ?? '').trim()
    if (name.length < 1) return err(errors.validation('직책명을 입력해 주세요'))

    const db = getDb()
    const dup = await db
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.companyId, g.companyId), eq(positions.name, name), eq(positions.isActive, true)))
      .limit(1)
    if (dup.length) return err(errors.conflict('같은 이름의 직책이 있어요'))

    const all = await db.select({ id: positions.id }).from(positions).where(eq(positions.companyId, g.companyId))
    const id = crypto.randomUUID()
    try {
      await db.insert(positions).values({
        id,
        companyId: g.companyId,
        name,
        isOrgHead: input.isOrgHead ?? false,
        sortOrder: all.length,
        isActive: true,
        updatedAt: new Date(),
      })
    } catch (e) {
      console.error('[db] createPosition 실패', e)
      return err(errors.internal('직책 추가 중 오류가 발생했어요'))
    }
    return ok({ positionId: id })
  }
  return toApiResponse(await run())
}

export async function updatePositionAction(
  positionId: string,
  data: { name: string },
): Promise<ApiResponse<{ positionId: string }>> {
  const run = async (): Promise<Result<{ positionId: string }>> => {
    const g = await guardManage()
    if ('error' in g) return err(g.error)
    const name = (data.name ?? '').trim()
    if (name.length < 1) return err(errors.validation('직책명을 입력해 주세요'))

    const db = getDb()
    const cur = await db
      .select({ id: positions.id, companyId: positions.companyId })
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
    if (!cur.length || cur[0].companyId !== g.companyId) return err(errors.notFound('직책을 찾을 수 없어요'))

    const dup = await db
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.companyId, g.companyId), eq(positions.name, name), eq(positions.isActive, true)))
      .limit(1)
    if (dup.length && dup[0].id !== positionId) return err(errors.conflict('같은 이름의 직책이 있어요'))

    try {
      await db.update(positions).set({ name, updatedAt: new Date() }).where(eq(positions.id, positionId))
    } catch (e) {
      console.error('[db] updatePosition 실패', e)
      return err(errors.internal('직책 수정 중 오류가 발생했어요'))
    }
    return ok({ positionId })
  }
  return toApiResponse(await run())
}

export async function deletePositionAction(
  positionId: string,
): Promise<ApiResponse<{ positionId: string }>> {
  const run = async (): Promise<Result<{ positionId: string }>> => {
    const g = await guardManage()
    if ('error' in g) return err(g.error)

    const db = getDb()
    const cur = await db
      .select({ id: positions.id, companyId: positions.companyId })
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
    if (!cur.length || cur[0].companyId !== g.companyId) return err(errors.notFound('직책을 찾을 수 없어요'))

    const assigned = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.positionId, positionId), eq(employees.isActive, true)))
      .limit(1)
    if (assigned.length) return err(errors.conflict('배정된 구성원이 있어 삭제할 수 없어요'))

    try {
      await db.update(positions).set({ isActive: false, updatedAt: new Date() }).where(eq(positions.id, positionId))
    } catch (e) {
      console.error('[db] deletePosition 실패', e)
      return err(errors.internal('직책 삭제 중 오류가 발생했어요'))
    }
    return ok({ positionId })
  }
  return toApiResponse(await run())
}
