'use server'

// 회사 휴가 설정(company-leave-settings) 서버 액션 — drizzle(neon-http) + Neon 직결.
// 원본 packages/modules/src/leave/company-settings.ts 재현 (퇴직자 연차 조정 + 연차 촉진 설정).
//   ⚠️ v1 schema.ts 에 company_leave_settings 테이블 선언이 없어 parameterized raw SQL 로 다뤄요(_db-columns.md).
//      회사당 1행(없으면 생성/upsert). updatedAt(REQUIRED, no default) 직접 채움.
//   권한: leave.policy.manage (인사관리 전용).

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { ok, err, errors, type Result } from '@teamlet/shared'
import type { CompanyLeaveSettingsItem, CompanyLeaveSettingsUpdateInput } from '@/lib/modules/leave-policy'

const POLICY_MANAGE = 'leave.policy.manage'

function num(v: unknown, d = 0): number {
  const x = Number(v ?? d)
  return Number.isFinite(x) ? x : d
}

function rowsOf(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[]
  const r = (res as { rows?: unknown })?.rows
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : []
}

function rowToItem(r: Record<string, unknown>): CompanyLeaveSettingsItem {
  return {
    retirementAdjustMode: (r.retirementAdjustMode as CompanyLeaveSettingsItem['retirementAdjustMode']) ?? 'EMPLOYEE_FAVORABLE',
    promotionApproverEmployeeId: (r.promotionApproverEmployeeId as string | null) ?? null,
    promotionCcEmployeeIds: Array.isArray(r.promotionCcEmployeeIds) ? (r.promotionCcEmployeeIds as string[]) : [],
    memberRemindEnabled: Boolean(r.memberRemindEnabled),
    adminRemindEnabled: Boolean(r.adminRemindEnabled),
    planNoticeDaysBefore: num(r.planNoticeDaysBefore, 10),
    annualPromotionMonthsBefore: num(r.annualPromotionMonthsBefore, 6),
    annualPromotionOffsetDays: num(r.annualPromotionOffsetDays, 0),
    monthly1stPromotionMonthsBefore: num(r.monthly1stPromotionMonthsBefore, 3),
    monthly1stPromotionOffsetDays: num(r.monthly1stPromotionOffsetDays, 0),
    monthly2ndPromotionMonthsBefore: num(r.monthly2ndPromotionMonthsBefore, 1),
    monthly2ndPromotionOffsetDays: num(r.monthly2ndPromotionOffsetDays, 0),
  }
}

function defaults(): CompanyLeaveSettingsItem {
  return {
    retirementAdjustMode: 'EMPLOYEE_FAVORABLE',
    promotionApproverEmployeeId: null,
    promotionCcEmployeeIds: [],
    memberRemindEnabled: false,
    adminRemindEnabled: false,
    planNoticeDaysBefore: 10,
    annualPromotionMonthsBefore: 6,
    annualPromotionOffsetDays: 0,
    monthly1stPromotionMonthsBefore: 3,
    monthly1stPromotionOffsetDays: 0,
    monthly2ndPromotionMonthsBefore: 1,
    monthly2ndPromotionOffsetDays: 0,
  }
}

/** 회사 휴가 설정 조회 — 없으면 기본값 반환(페이지가 항상 렌더되도록). */
export async function getCompanyLeaveSettingsAction(): Promise<Result<CompanyLeaveSettingsItem>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const rows = rowsOf(await db.execute(sql`select * from company_leave_settings where "companyId" = ${user.companyId} limit 1`))
    return ok(rows.length ? rowToItem(rows[0]) : defaults())
  } catch (e) {
    console.error('[company-leave-settings] get 실패', e)
    return ok(defaults())
  }
}

export async function updateCompanyLeaveSettingsAction(input: CompanyLeaveSettingsUpdateInput): Promise<Result<void>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, POLICY_MANAGE))) return err(errors.forbidden('leave.policy.manage 권한이 필요해요'))
  try {
    const db = getDb()
    const existing = rowsOf(await db.execute(sql`select id from company_leave_settings where "companyId" = ${user.companyId} limit 1`))
    if (existing.length) {
      const sets = [sql`"updatedAt" = now()`]
      const push = (col: string, val: unknown) => sets.push(sql`${sql.raw('"' + col + '"')} = ${val as never}`)
      if (input.retirementAdjustMode !== undefined) push('retirementAdjustMode', input.retirementAdjustMode)
      if (input.promotionApproverEmployeeId !== undefined) push('promotionApproverEmployeeId', input.promotionApproverEmployeeId)
      if (input.promotionCcEmployeeIds !== undefined) push('promotionCcEmployeeIds', input.promotionCcEmployeeIds)
      if (input.memberRemindEnabled !== undefined) push('memberRemindEnabled', input.memberRemindEnabled)
      if (input.adminRemindEnabled !== undefined) push('adminRemindEnabled', input.adminRemindEnabled)
      if (input.planNoticeDaysBefore !== undefined) push('planNoticeDaysBefore', input.planNoticeDaysBefore)
      if (input.annualPromotionMonthsBefore !== undefined) push('annualPromotionMonthsBefore', input.annualPromotionMonthsBefore)
      if (input.annualPromotionOffsetDays !== undefined) push('annualPromotionOffsetDays', input.annualPromotionOffsetDays)
      if (input.monthly1stPromotionMonthsBefore !== undefined) push('monthly1stPromotionMonthsBefore', input.monthly1stPromotionMonthsBefore)
      if (input.monthly1stPromotionOffsetDays !== undefined) push('monthly1stPromotionOffsetDays', input.monthly1stPromotionOffsetDays)
      if (input.monthly2ndPromotionMonthsBefore !== undefined) push('monthly2ndPromotionMonthsBefore', input.monthly2ndPromotionMonthsBefore)
      if (input.monthly2ndPromotionOffsetDays !== undefined) push('monthly2ndPromotionOffsetDays', input.monthly2ndPromotionOffsetDays)
      await db.execute(sql`update company_leave_settings set ${sql.join(sets, sql`, `)} where "companyId" = ${user.companyId}`)
    } else {
      const m = { ...defaults(), ...input }
      await db.execute(sql`
        insert into company_leave_settings (
          id, "companyId", "retirementAdjustMode", "promotionApproverEmployeeId", "promotionCcEmployeeIds",
          "memberRemindEnabled", "adminRemindEnabled", "planNoticeDaysBefore",
          "annualPromotionMonthsBefore", "annualPromotionOffsetDays",
          "monthly1stPromotionMonthsBefore", "monthly1stPromotionOffsetDays",
          "monthly2ndPromotionMonthsBefore", "monthly2ndPromotionOffsetDays", "updatedAt"
        ) values (
          ${crypto.randomUUID()}, ${user.companyId}, ${m.retirementAdjustMode}, ${m.promotionApproverEmployeeId},
          ${sql`${m.promotionCcEmployeeIds}`}, ${m.memberRemindEnabled}, ${m.adminRemindEnabled}, ${m.planNoticeDaysBefore},
          ${m.annualPromotionMonthsBefore}, ${m.annualPromotionOffsetDays},
          ${m.monthly1stPromotionMonthsBefore}, ${m.monthly1stPromotionOffsetDays},
          ${m.monthly2ndPromotionMonthsBefore}, ${m.monthly2ndPromotionOffsetDays}, now()
        )
      `)
    }
    revalidatePath('/settings/leave-policies')
    return ok(undefined)
  } catch (e) {
    console.error('[company-leave-settings] update 실패', e)
    return err(errors.internal('휴가 설정 저장 중 오류가 발생했어요'))
  }
}
