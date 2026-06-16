'use server'

// 연차 정책(leave-policy) 서버 액션 — drizzle(neon-http) + Neon 직결. 원본 packages/modules/src/leave/policy.ts 재현.
//   - 권한: leave.policy.manage (인사관리 전용). 페이지 isHrAdmin 게이트와 함께 액션에서도 가드.
//   - ⚠️ v1 schema.ts 의 leave_policies / leave_policy_assignments 선언은 최소 컬럼만 가짐.
//     실제 Neon 테이블에는 grantMode·useUnit·approver 등 모든 컬럼이 있어 — drizzle 선언 컬럼만으론
//     원본 동작(부여기준/소멸/승인선 저장)을 재현할 수 없어요. 그래서 읽기/쓰기를 parameterized raw SQL 로
//     수행해 실제 컬럼 전체를 충실히 다뤄요(_db-columns.md 기준). updatedAt(REQUIRED, no default)도 직접 채움.
//   - leave_policy_assignments 는 schema.ts 에 없어 raw SQL 로 배정 인원수만 집계해요(읽기).

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  ok,
  err,
  errors,
  toApiResponse,
  leavePolicyCreateSchema,
  leavePolicyUpdateSchema,
  type Result,
  type ApiResponse,
} from '@teamlet/shared'
import type { LeavePolicyItem, AutoGrantResult } from '@/lib/modules/leave-policy'

const POLICY_MANAGE = 'leave.policy.manage'

function revalidate() {
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

// neon-http 의 db.execute(sql) 는 { rows } 봉투 또는 배열을 줄 수 있어 안전하게 평탄화
function rowsOf(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[]
  const r = (res as { rows?: unknown })?.rows
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : []
}

function rowToItem(p: Record<string, unknown>, assignedCount: number): LeavePolicyItem {
  return {
    id: String(p.id),
    name: String(p.name ?? ''),
    leaveTypeId: String(p.leaveTypeId ?? ''),
    grantMode: (p.grantMode as LeavePolicyItem['grantMode']) ?? 'FISCAL_YEAR',
    fiscalStartMonth: num(p.fiscalStartMonth) || 1,
    monthlyGrantRule: (p.monthlyGrantRule as LeavePolicyItem['monthlyGrantRule']) ?? 'MONTHLY_ON_ATTENDANCE',
    annualFirstYearRule: (p.annualFirstYearRule as LeavePolicyItem['annualFirstYearRule']) ?? 'PRORATED_ON_FIRST_FISCAL',
    decimalRule: (p.decimalRule as LeavePolicyItem['decimalRule']) ?? 'ROUND_UP_DAY',
    expiryMonths: num(p.expiryMonths) || 12,
    carryoverMaxDays: p.carryoverMaxDays != null ? num(p.carryoverMaxDays) : null,
    useUnit: (p.useUnit as LeavePolicyItem['useUnit']) ?? 'HALF_DAY',
    hourUnitMinutes: p.hourUnitMinutes != null ? num(p.hourUnitMinutes) : null,
    overdraftEnabled: Boolean(p.overdraftEnabled),
    overdraftMaxDays: p.overdraftMaxDays != null ? num(p.overdraftMaxDays) : null,
    monthlyExpiryMode: (p.monthlyExpiryMode as LeavePolicyItem['monthlyExpiryMode']) ?? 'HIRE_DATE_1Y',
    monthlyGraceMonths: p.monthlyGraceMonths != null ? num(p.monthlyGraceMonths) : null,
    annualExpiryMode: (p.annualExpiryMode as LeavePolicyItem['annualExpiryMode']) ?? 'GRANT_DATE_1Y',
    annualGraceMonths: p.annualGraceMonths != null ? num(p.annualGraceMonths) : null,
    approverEmployeeId: (p.approverEmployeeId as string | null) ?? null,
    ccEmployeeIds: Array.isArray(p.ccEmployeeIds) ? (p.ccEmployeeIds as string[]) : [],
    approveOnRegister: p.approveOnRegister == null ? true : Boolean(p.approveOnRegister),
    approveOnCancel: Boolean(p.approveOnCancel),
    smartPromotionEnabled: Boolean(p.smartPromotionEnabled),
    isDefault: Boolean(p.isDefault),
    isActive: p.isActive == null ? true : Boolean(p.isActive),
    assignedCount,
  }
}

/** 회사 연차 정책 목록 (배정 인원 수 포함) */
export async function listLeavePolicies(_employeeId?: string): Promise<Result<LeavePolicyItem[]>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const res = await db.execute(sql`select * from leave_policies where "companyId" = ${user.companyId} order by "createdAt" asc`)
    const rows = rowsOf(res)
    if (rows.length === 0) return ok([])
    const ids = rows.map((r) => String(r.id))
    const aRes = await db.execute(
      sql`select "policyId", count(*)::int as c from leave_policy_assignments where "policyId" in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) group by "policyId"`,
    )
    const cnt = new Map<string, number>()
    for (const r of rowsOf(aRes)) cnt.set(String(r.policyId), num(r.c))
    return ok(rows.map((r) => rowToItem(r, cnt.get(String(r.id)) ?? 0)))
  } catch (e) {
    console.error('[leave-policy] list 실패', e)
    return ok([])
  }
}

type PolicyData = ReturnType<typeof leavePolicyCreateSchema.parse>

async function clearOtherDefaults(companyId: string, exceptId: string) {
  const db = getDb()
  await db.execute(sql`update leave_policies set "isDefault" = false, "updatedAt" = now() where "companyId" = ${companyId} and "isDefault" = true and id <> ${exceptId}`)
}

/** 전체 컬럼 INSERT — 실제 Neon 테이블 컬럼 전부 채움(updatedAt 포함). */
async function insertPolicy(id: string, companyId: string, d: PolicyData): Promise<void> {
  const db = getDb()
  await db.execute(sql`
    insert into leave_policies (
      id, "companyId", name, "leaveTypeId", "grantMode", "fiscalStartMonth", "monthlyGrantRule",
      "annualFirstYearRule", "decimalRule", "expiryMonths", "carryoverMaxDays", "useUnit", "hourUnitMinutes",
      "overdraftEnabled", "overdraftMaxDays", "monthlyExpiryMode", "monthlyGraceMonths", "annualExpiryMode",
      "annualGraceMonths", "approverEmployeeId", "ccEmployeeIds", "approveOnRegister", "approveOnCancel",
      "smartPromotionEnabled", "isDefault", "isActive", "updatedAt"
    ) values (
      ${id}, ${companyId}, ${d.name}, ${d.leaveTypeId}, ${d.grantMode ?? 'FISCAL_YEAR'}, ${d.fiscalStartMonth ?? 1},
      ${d.monthlyGrantRule ?? 'MONTHLY_ON_ATTENDANCE'}, ${d.annualFirstYearRule ?? 'PRORATED_ON_FIRST_FISCAL'},
      ${d.decimalRule ?? 'ROUND_UP_DAY'}, ${d.expiryMonths ?? 12}, ${d.carryoverMaxDays ?? null}, ${d.useUnit ?? 'HALF_DAY'},
      ${d.hourUnitMinutes ?? null}, ${d.overdraftEnabled ?? false}, ${d.overdraftMaxDays ?? null},
      ${d.monthlyExpiryMode ?? 'HIRE_DATE_1Y'}, ${d.monthlyGraceMonths ?? null}, ${d.annualExpiryMode ?? 'GRANT_DATE_1Y'},
      ${d.annualGraceMonths ?? null}, ${d.approverEmployeeId ?? null}, ${sql`${d.ccEmployeeIds ?? []}`},
      ${d.approveOnRegister ?? true}, ${d.approveOnCancel ?? false}, ${d.smartPromotionEnabled ?? false},
      ${d.isDefault ?? false}, ${d.isActive ?? true}, now()
    )
  `)
}

export async function createLeavePolicyAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    const parsed = leavePolicyCreateSchema.safeParse(raw)
    if (!parsed.success) return err(errors.validation(parsed.error.issues[0]?.message ?? '입력 오류'))
    try {
      const id = crypto.randomUUID()
      await insertPolicy(id, ctx.companyId, parsed.data)
      if (parsed.data.isDefault) await clearOtherDefaults(ctx.companyId, id)
      revalidate()
      return ok({ id })
    } catch (e) {
      console.error('[leave-policy] create 실패', e)
      return err(errors.internal('정책 생성 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

/** 기본 연차 정책 원클릭 생성 — 정책 0개 회사 부트스트랩. 멱등. */
export async function createDefaultLeavePolicyAction(): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id from leave_policies where "companyId" = ${ctx.companyId} limit 1`))
      if (existing.length) return ok({ id: String(existing[0].id) })
      const annual = rowsOf(await db.execute(sql`select id from leave_types where "companyId" = ${ctx.companyId} and key = 'annual' limit 1`))
      if (!annual.length) return err(errors.validation('연차 휴가 유형이 없어요. 먼저 연차 종류를 생성해 주세요.'))
      const id = crypto.randomUUID()
      await insertPolicy(id, ctx.companyId, leavePolicyCreateSchema.parse({ name: '표준 연차 정책', leaveTypeId: String(annual[0].id), isDefault: true }))
      await clearOtherDefaults(ctx.companyId, id)
      revalidate()
      return ok({ id })
    } catch (e) {
      console.error('[leave-policy] createDefault 실패', e)
      return err(errors.internal('기본 정책 생성 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function updateLeavePolicyAction(policyId: string, raw: unknown): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    const parsed = leavePolicyUpdateSchema.safeParse(raw)
    if (!parsed.success) return err(errors.validation(parsed.error.issues[0]?.message ?? '입력 오류'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id, "companyId" from leave_policies where id = ${policyId} limit 1`))
      if (!existing.length || String(existing[0].companyId) !== ctx.companyId) return err(errors.notFound('정책을 찾을 수 없어요'))
      const d = parsed.data
      const sets = [sql`"updatedAt" = now()`]
      const push = (col: string, val: unknown) => sets.push(sql`${sql.raw('"' + col + '"')} = ${val as never}`)
      if (d.name !== undefined) push('name', d.name)
      if (d.grantMode !== undefined) push('grantMode', d.grantMode)
      if (d.fiscalStartMonth !== undefined) push('fiscalStartMonth', d.fiscalStartMonth)
      if (d.monthlyGrantRule !== undefined) push('monthlyGrantRule', d.monthlyGrantRule)
      if (d.annualFirstYearRule !== undefined) push('annualFirstYearRule', d.annualFirstYearRule)
      if (d.decimalRule !== undefined) push('decimalRule', d.decimalRule)
      if (d.expiryMonths !== undefined) push('expiryMonths', d.expiryMonths)
      if (d.carryoverMaxDays !== undefined) push('carryoverMaxDays', d.carryoverMaxDays)
      if (d.useUnit !== undefined) push('useUnit', d.useUnit)
      if (d.hourUnitMinutes !== undefined) push('hourUnitMinutes', d.hourUnitMinutes)
      if (d.overdraftEnabled !== undefined) push('overdraftEnabled', d.overdraftEnabled)
      if (d.overdraftMaxDays !== undefined) push('overdraftMaxDays', d.overdraftMaxDays)
      if (d.monthlyExpiryMode !== undefined) push('monthlyExpiryMode', d.monthlyExpiryMode)
      if (d.monthlyGraceMonths !== undefined) push('monthlyGraceMonths', d.monthlyGraceMonths)
      if (d.annualExpiryMode !== undefined) push('annualExpiryMode', d.annualExpiryMode)
      if (d.annualGraceMonths !== undefined) push('annualGraceMonths', d.annualGraceMonths)
      if (d.approverEmployeeId !== undefined) push('approverEmployeeId', d.approverEmployeeId)
      if (d.ccEmployeeIds !== undefined) push('ccEmployeeIds', d.ccEmployeeIds)
      if (d.approveOnRegister !== undefined) push('approveOnRegister', d.approveOnRegister)
      if (d.approveOnCancel !== undefined) push('approveOnCancel', d.approveOnCancel)
      if (d.smartPromotionEnabled !== undefined) push('smartPromotionEnabled', d.smartPromotionEnabled)
      if (d.isDefault !== undefined) push('isDefault', d.isDefault)
      if (d.isActive !== undefined) push('isActive', d.isActive)
      await db.execute(sql`update leave_policies set ${sql.join(sets, sql`, `)} where id = ${policyId}`)
      if (d.isDefault) await clearOtherDefaults(ctx.companyId, policyId)
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[leave-policy] update 실패', e)
      return err(errors.internal('정책 수정 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function deleteLeavePolicyAction(policyId: string): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id, "companyId" from leave_policies where id = ${policyId} limit 1`))
      if (!existing.length || String(existing[0].companyId) !== ctx.companyId) return err(errors.notFound('정책을 찾을 수 없어요'))
      const assigns = rowsOf(await db.execute(sql`select id from leave_policy_assignments where "policyId" = ${policyId} limit 1`))
      if (assigns.length) return err(errors.conflict('배정된 구성원이 있어 삭제할 수 없어요'))
      await db.execute(sql`delete from leave_policies where id = ${policyId}`)
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[leave-policy] delete 실패', e)
      return err(errors.internal('정책 삭제 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

/**
 * 연차 자동부여 실행 — 정책 배정된 구성원에게 연차 종류 기준일수 부여. 멱등.
 * v1 schema 에 leave_transactions 가 없어 leave_balances 직접 갱신. 같은 해 재실행 시 grantedDays>0 이면 건너뜀.
 */
export async function runAnnualLeaveGrantAction(year: number): Promise<ApiResponse<AutoGrantResult>> {
  const run = async (): Promise<Result<AutoGrantResult>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const annual = rowsOf(await db.execute(sql`select id, "grantAmount" from leave_types where "companyId" = ${ctx.companyId} and key = 'annual' limit 1`))
      if (!annual.length) return err(errors.validation('연차 휴가 유형이 없어요'))
      const leaveTypeId = String(annual[0].id)
      const grantAmount = annual[0].grantAmount != null ? num(annual[0].grantAmount) : null

      const assigns = rowsOf(await db.execute(sql`
        select distinct lpa."employeeId" as eid
        from leave_policy_assignments lpa
        join leave_policies lp on lp.id = lpa."policyId"
        join employees e on e.id = lpa."employeeId"
        where lp."companyId" = ${ctx.companyId} and e."isActive" = true
      `))
      const targetIds = assigns.map((a) => String(a.eid))

      const result: AutoGrantResult = {
        year,
        grantedCount: 0,
        grantedDays: 0,
        alreadyGrantedCount: 0,
        skippedNoAmountCount: 0,
        noPolicyCount: 0,
      }
      if (grantAmount == null || grantAmount <= 0) {
        result.skippedNoAmountCount = targetIds.length
        return ok(result)
      }

      for (const employeeId of targetIds) {
        const bal = rowsOf(await db.execute(sql`select id, "grantedDays" from leave_balances where "employeeId" = ${employeeId} and "leaveTypeId" = ${leaveTypeId} and year = ${year} limit 1`))
        if (bal.length) {
          if (num(bal[0].grantedDays) > 0) {
            result.alreadyGrantedCount += 1
            continue
          }
          await db.execute(sql`update leave_balances set "grantedDays" = ${String(grantAmount)}, "updatedAt" = now() where id = ${String(bal[0].id)}`)
        } else {
          await db.execute(sql`insert into leave_balances (id, "employeeId", "leaveTypeId", year, "grantedDays", "usedDays", "adjustedDays", "updatedAt") values (${crypto.randomUUID()}, ${employeeId}, ${leaveTypeId}, ${year}, ${String(grantAmount)}, 0, 0, now())`)
        }
        result.grantedCount += 1
        result.grantedDays += grantAmount
      }
      revalidate()
      revalidatePath('/leave')
      return ok(result)
    } catch (e) {
      console.error('[leave-policy] runAnnualLeaveGrant 실패', e)
      return err(errors.internal('연차 자동부여 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}
