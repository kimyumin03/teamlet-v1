'use server'

// 맞춤 휴가(휴가 유형, leave-type) 서버 액션 — drizzle(neon-http) + Neon 직결.
// 원본 packages/modules/src/leave/type.ts 재현. 권한: leave.policy.manage (인사관리 전용).
//   ⚠️ v1 schema.ts 의 leave_types 선언은 id/companyId/key/name 4개뿐 — 실제 Neon 테이블엔 grantMethod 등
//      모든 컬럼이 있어 parameterized raw SQL 로 전체 컬럼을 충실히 다뤄요(_db-columns.md). updatedAt 직접 채움.
//   - bootstrap: 법정의무휴가(연차·병가 등) 일괄 등록(멱등 — 같은 key 있으면 건너뜀).

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { ok, err, errors, toApiResponse, type Result, type ApiResponse } from '@teamlet/shared'
import type { LeaveTypeFullItem, LeaveTypeCreateInput, LeaveTypeUpdateInput } from '@/lib/modules/leave-policy'

const POLICY_MANAGE = 'leave.policy.manage'

function revalidate() {
  revalidatePath('/settings/leave-types')
  revalidatePath('/settings/leave-policies')
}

async function requireManage(): Promise<{ employeeId: string; companyId: string } | null> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, POLICY_MANAGE))) return null
  return { employeeId: user.employeeId, companyId: user.companyId }
}

function num(v: unknown): number {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

function rowsOf(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[]
  const r = (res as { rows?: unknown })?.rows
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : []
}

function rowToFull(t: Record<string, unknown>): LeaveTypeFullItem {
  return {
    id: String(t.id),
    key: String(t.key ?? ''),
    name: String(t.name ?? ''),
    description: String(t.description ?? ''),
    isSystem: Boolean(t.isSystem),
    isRequired: Boolean(t.isRequired),
    isActive: t.isActive == null ? true : Boolean(t.isActive),
    grantMethod: (t.grantMethod as LeaveTypeFullItem['grantMethod']) ?? 'ON_REQUEST',
    grantUnit: (t.grantUnit as LeaveTypeFullItem['grantUnit']) ?? 'DAY',
    grantAmount: t.grantAmount != null ? num(t.grantAmount) : null,
    paymentType: (t.paymentType as LeaveTypeFullItem['paymentType']) ?? 'PAID',
    partialPayDays: t.partialPayDays != null ? num(t.partialPayDays) : null,
    genderRestriction: (t.genderRestriction as LeaveTypeFullItem['genderRestriction']) ?? 'ALL',
    evidenceRequirement: (t.evidenceRequirement as LeaveTypeFullItem['evidenceRequirement']) ?? 'NONE',
    useUnit: (t.useUnit as LeaveTypeFullItem['useUnit']) ?? 'DAY',
    hourUnitMinutes: t.hourUnitMinutes != null ? num(t.hourUnitMinutes) : null,
    deductOnHoliday: Boolean(t.deductOnHoliday),
    periodicCycle: (t.periodicCycle as string | null) ?? null,
    tenureYears: t.tenureYears != null ? num(t.tenureYears) : null,
    excludedEmploymentTypes: Array.isArray(t.excludedEmploymentTypes) ? (t.excludedEmploymentTypes as string[]) : [],
    approverEmployeeId: (t.approverEmployeeId as string | null) ?? null,
    ccEmployeeIds: Array.isArray(t.ccEmployeeIds) ? (t.ccEmployeeIds as string[]) : [],
  }
}

/** 회사의 모든 휴가 유형(전체 컬럼) — 설정/맞춤휴가 목록·편집용 */
export async function listLeaveTypesFull(): Promise<Result<LeaveTypeFullItem[]>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const res = await db.execute(sql`select * from leave_types where "companyId" = ${user.companyId} order by "sortOrder" asc, name asc`)
    return ok(rowsOf(res).map(rowToFull))
  } catch (e) {
    console.error('[leave-type] listFull 실패', e)
    return ok([])
  }
}

export async function createLeaveTypeAction(input: LeaveTypeCreateInput): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    if (!input.name?.trim()) return err(errors.validation('이름을 입력해 주세요'))
    if (!input.key?.trim()) return err(errors.validation('key 를 입력해 주세요'))
    try {
      const db = getDb()
      const dup = rowsOf(await db.execute(sql`select id from leave_types where "companyId" = ${ctx.companyId} and key = ${input.key} limit 1`))
      if (dup.length) return err(errors.conflict('이미 같은 key 의 휴가 종류가 있어요'))
      const id = crypto.randomUUID()
      await db.execute(sql`
        insert into leave_types (
          id, "companyId", key, name, description, "grantMethod", "grantUnit", "grantAmount", "paymentType",
          "genderRestriction", "evidenceRequirement", "useUnit", "hourUnitMinutes", "partialPayDays",
          "deductOnHoliday", "periodicCycle", "tenureYears", "excludedEmploymentTypes", "approverEmployeeId",
          "ccEmployeeIds", "updatedAt"
        ) values (
          ${id}, ${ctx.companyId}, ${input.key}, ${input.name}, ${input.description ?? ''}, ${input.grantMethod},
          ${input.grantUnit}, ${input.grantAmount ?? null}, ${input.paymentType}, ${input.genderRestriction},
          ${input.evidenceRequirement}, ${input.useUnit}, ${input.hourUnitMinutes ?? null}, ${input.partialPayDays ?? null},
          ${input.deductOnHoliday}, ${input.periodicCycle ?? null}, ${input.tenureYears ?? null},
          ${sql`${input.excludedEmploymentTypes ?? []}`}, ${input.approverEmployeeId ?? null}, ${sql`${input.ccEmployeeIds ?? []}`}, now()
        )
      `)
      revalidate()
      return ok({ id })
    } catch (e) {
      console.error('[leave-type] create 실패', e)
      return err(errors.internal('휴가 종류 생성 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function updateLeaveTypeAction(leaveTypeId: string, input: LeaveTypeUpdateInput): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id, "companyId" from leave_types where id = ${leaveTypeId} limit 1`))
      if (!existing.length || String(existing[0].companyId) !== ctx.companyId) return err(errors.notFound('휴가 종류를 찾을 수 없어요'))
      const sets = [sql`"updatedAt" = now()`]
      const push = (col: string, val: unknown) => sets.push(sql`${sql.raw('"' + col + '"')} = ${val as never}`)
      if (input.name !== undefined) push('name', input.name)
      if (input.description !== undefined) push('description', input.description)
      if (input.grantMethod !== undefined) push('grantMethod', input.grantMethod)
      if (input.grantUnit !== undefined) push('grantUnit', input.grantUnit)
      if (input.grantAmount !== undefined) push('grantAmount', input.grantAmount)
      if (input.paymentType !== undefined) push('paymentType', input.paymentType)
      if (input.partialPayDays !== undefined) push('partialPayDays', input.partialPayDays)
      if (input.genderRestriction !== undefined) push('genderRestriction', input.genderRestriction)
      if (input.evidenceRequirement !== undefined) push('evidenceRequirement', input.evidenceRequirement)
      if (input.useUnit !== undefined) push('useUnit', input.useUnit)
      if (input.hourUnitMinutes !== undefined) push('hourUnitMinutes', input.hourUnitMinutes)
      if (input.deductOnHoliday !== undefined) push('deductOnHoliday', input.deductOnHoliday)
      if (input.periodicCycle !== undefined) push('periodicCycle', input.periodicCycle)
      if (input.tenureYears !== undefined) push('tenureYears', input.tenureYears)
      if (input.excludedEmploymentTypes !== undefined) push('excludedEmploymentTypes', input.excludedEmploymentTypes)
      if (input.approverEmployeeId !== undefined) push('approverEmployeeId', input.approverEmployeeId)
      if (input.ccEmployeeIds !== undefined) push('ccEmployeeIds', input.ccEmployeeIds)
      if (input.isActive !== undefined) push('isActive', input.isActive)
      await db.execute(sql`update leave_types set ${sql.join(sets, sql`, `)} where id = ${leaveTypeId}`)
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[leave-type] update 실패', e)
      return err(errors.internal('휴가 종류 수정 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function deleteLeaveTypeAction(leaveTypeId: string): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id, "companyId", "isSystem", "isRequired" from leave_types where id = ${leaveTypeId} limit 1`))
      if (!existing.length || String(existing[0].companyId) !== ctx.companyId) return err(errors.notFound('휴가 종류를 찾을 수 없어요'))
      if (Boolean(existing[0].isSystem) || Boolean(existing[0].isRequired)) return err(errors.forbidden('법정 필수 휴가는 삭제할 수 없어요'))
      const used = rowsOf(await db.execute(sql`select id from leave_balances where "leaveTypeId" = ${leaveTypeId} limit 1`))
      if (used.length) return err(errors.conflict('사용 이력이 있어 삭제할 수 없어요. 비활성화해 주세요.'))
      await db.execute(sql`delete from leave_types where id = ${leaveTypeId}`)
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[leave-type] delete 실패', e)
      return err(errors.internal('휴가 종류 삭제 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

// 법정의무휴가 시드 — key 가 회사에 없으면 추가(멱등)
const STATUTORY: { key: string; name: string; description: string; required: boolean; system: boolean; grantMethod: string; paymentType: string; gender: string }[] = [
  { key: 'annual', name: '연차', description: '연차유급휴가 (정책 기반 자동 부여)', required: true, system: true, grantMethod: 'PERIODIC', paymentType: 'PAID', gender: 'ALL' },
  { key: 'maternity', name: '출산전후휴가', description: '근로기준법 제74조', required: true, system: true, grantMethod: 'ON_REQUEST', paymentType: 'PAID', gender: 'FEMALE' },
  { key: 'spouse_birth', name: '배우자 출산휴가', description: '남녀고용평등법 제18조의2', required: true, system: true, grantMethod: 'ON_REQUEST', paymentType: 'PAID', gender: 'ALL' },
  { key: 'infertility', name: '난임치료휴가', description: '남녀고용평등법 제18조의3', required: true, system: true, grantMethod: 'ON_REQUEST', paymentType: 'PARTIAL_PAID', gender: 'ALL' },
  { key: 'family_care', name: '가족돌봄휴가', description: '남녀고용평등법 제22조의2', required: true, system: true, grantMethod: 'ON_REQUEST', paymentType: 'UNPAID', gender: 'ALL' },
]

export async function bootstrapLeaveTypesAction(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireManage()
  if (!ctx) return { ok: false, error: 'leave.policy.manage 권한이 필요해요' }
  try {
    const db = getDb()
    const existing = rowsOf(await db.execute(sql`select key from leave_types where "companyId" = ${ctx.companyId}`))
    const have = new Set(existing.map((r) => String(r.key)))
    for (const s of STATUTORY) {
      if (have.has(s.key)) continue
      await db.execute(sql`
        insert into leave_types (id, "companyId", key, name, description, "isSystem", "isRequired", "grantMethod", "grantUnit", "paymentType", "genderRestriction", "evidenceRequirement", "updatedAt")
        values (${crypto.randomUUID()}, ${ctx.companyId}, ${s.key}, ${s.name}, ${s.description}, ${s.system}, ${s.required}, ${s.grantMethod}, 'DAY', ${s.paymentType}, ${s.gender}, 'NONE', now())
      `)
    }
    revalidate()
    return { ok: true }
  } catch (e) {
    console.error('[leave-type] bootstrap 실패', e)
    return { ok: false, error: '법정의무휴가 등록에 실패했어요' }
  }
}
