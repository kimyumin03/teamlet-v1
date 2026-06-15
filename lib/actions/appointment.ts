'use server'

// 인사 발령(appointment) 서버 액션 — drizzle/Neon. 원본 modules/appointment.createAppointment 재현.
//   - 권한: member.directory.manage
//   - 발령 row 추가(불변) + employees.departmentId/positionId 캐시 갱신
//   - 부서·직책 이름은 발령 시점 값으로 스냅샷 (개명/삭제 대비)
//   - 변경 없음 / 발령일 단조성(직전 발령일보다 빠르면 거절) 검증
// ⚠️ v1 appointments 스키마엔 from/to *Id, appointedById 컬럼이 없어 *Name 스냅샷만 저장해요
//    (이력 표시는 이름 기준이라 동작 동일). 누락 컬럼은 missingSchemaColumns 참고.

import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { appointments, employees, departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  toApiResponse,
  ok,
  err,
  errors,
  type ApiResponse,
  type Result,
  type AppointmentCreateInput,
} from '@teamlet/shared'

const DIRECTORY_MANAGE = 'member.directory.manage'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function createAppointmentAction(
  input: AppointmentCreateInput,
): Promise<ApiResponse<{ appointmentId: string }>> {
  const run = async (): Promise<Result<{ appointmentId: string }>> => {
    const user = await getCurrentUser()
    if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
      return err(errors.forbidden('member.directory.manage 권한이 필요해요'))
    }
    const companyId = user.companyId

    const kind = input.kind
    if (!['TRANSFER', 'PROMOTION', 'POSITION_CHANGE', 'REASSIGN'].includes(kind)) {
      return err(errors.validation('발령 유형이 올바르지 않아요'))
    }
    const rawDate = (input.effectiveDate ?? '').trim()
    if (!DATE_RE.test(rawDate)) return err(errors.validation('발령일은 YYYY-MM-DD 형식이어야 해요'))
    const effectiveDate = new Date(`${rawDate}T00:00:00.000Z`)
    if (Number.isNaN(effectiveDate.getTime())) return err(errors.validation('발령일을 인식할 수 없어요'))

    const db = getDb()
    const empRows = await db
      .select({
        id: employees.id,
        companyId: employees.companyId,
        isActive: employees.isActive,
        departmentId: employees.departmentId,
        positionId: employees.positionId,
        fromDepartmentName: departments.name,
        fromPositionName: positions.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(eq(employees.id, input.employeeId))
      .limit(1)
    if (!empRows.length || empRows[0].companyId !== companyId) return err(errors.notFound('구성원을 찾을 수 없어요'))
    const emp = empRows[0]
    if (emp.isActive === false) return err(errors.conflict('비활성 구성원은 발령할 수 없어요'))

    const toDepartmentId = input.departmentId?.trim() || null
    const toPositionId = input.positionId?.trim() || null

    let toDepartmentName: string | null = null
    if (toDepartmentId) {
      const d = await db
        .select({ companyId: departments.companyId, isActive: departments.isActive, name: departments.name })
        .from(departments)
        .where(eq(departments.id, toDepartmentId))
        .limit(1)
      if (!d.length || d[0].companyId !== companyId) return err(errors.notFound('부서를 찾을 수 없어요'))
      if (d[0].isActive === false) return err(errors.conflict('비활성 부서엔 배정할 수 없어요'))
      toDepartmentName = d[0].name
    }

    let toPositionName: string | null = null
    if (toPositionId) {
      const p = await db
        .select({ companyId: positions.companyId, isActive: positions.isActive, name: positions.name })
        .from(positions)
        .where(eq(positions.id, toPositionId))
        .limit(1)
      if (!p.length || p[0].companyId !== companyId) return err(errors.notFound('직책을 찾을 수 없어요'))
      if (p[0].isActive === false) return err(errors.conflict('비활성 직책엔 배정할 수 없어요'))
      toPositionName = p[0].name
    }

    if (toDepartmentId === emp.departmentId && toPositionId === emp.positionId) {
      return err(errors.validation('부서·직책에 바뀐 내용이 없어요'))
    }

    // 발령일 단조성
    const latest = await db
      .select({ effectiveDate: appointments.effectiveDate })
      .from(appointments)
      .where(eq(appointments.employeeId, emp.id))
      .orderBy(desc(appointments.effectiveDate))
      .limit(1)
    if (latest.length && latest[0].effectiveDate && effectiveDate.getTime() < new Date(latest[0].effectiveDate).getTime()) {
      return err(errors.validation('발령일은 직전 발령일보다 빠를 수 없어요'))
    }

    const id = crypto.randomUUID()
    try {
      await db.insert(appointments).values({
        id,
        companyId,
        employeeId: emp.id,
        kind,
        effectiveDate,
        fromDepartmentName: emp.fromDepartmentName ?? null,
        toDepartmentName,
        fromPositionName: emp.fromPositionName ?? null,
        toPositionName,
        memo: input.memo?.trim() || null,
        appointedByName: user.name ?? null,
        createdAt: new Date(),
      })
      // 최신 발령을 employees 캐시에 반영
      await db
        .update(employees)
        .set({ departmentId: toDepartmentId, positionId: toPositionId, updatedAt: new Date() })
        .where(eq(employees.id, emp.id))
    } catch (e) {
      console.error('[db] createAppointment 실패', e)
      return err(errors.internal('발령 등록 중 오류가 발생했어요'))
    }
    void and // (참조 유지)
    return ok({ appointmentId: id })
  }
  return toApiResponse(await run())
}
