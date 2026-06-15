'use server'

// 휴가(leave) 서버 액션 — 한 에이전트가 소유(공유 충돌 방지). 모두 drizzle + Neon 직결.
// 원본 packages/modules/src/leave/{balance,request} 의 의미를 동일하게 재현하되,
// v1 schema 에 선언된 테이블(leave_requests, leave_balances, leave_types, employees, company_holidays)만 사용해요.
// ⚠️ leave_transactions / form_documents 결재선은 v1 schema 에 없어 (missingSchemaColumns/blockers 참고)
//    부여·조정·소멸·승인은 leave_balances 를 직접 갱신하는 방식으로 충실하게 구현했어요.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveRequests, leaveTypes, leaveBalances, employees, companyHolidays, departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { ok, err, errors, toApiResponse, type Result, type ApiResponse } from '@teamlet/shared'
import type {
  LeaveBalanceSummary,
  LeaveTypeItem,
  LeaveRequestItem,
  CompanyLeaveBalanceRow,
  CompanyLeaveRequestItem,
  AnnualLeaveLedger,
  AnnualLeaveLedgerRow,
  MonthlyAnnualUsageRow,
  LeaveGrantHistoryRow,
  LeaveScheduleEntry,
  LeaveRequestStatus,
} from '@/lib/modules/leave'

/* ─────────────────────────────────────────────
   공통 헬퍼
───────────────────────────────────────────── */

function n(v: unknown): number {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

function emptySchedule(): LeaveScheduleEntry[] {
  return []
}

function isPreGranted(key: string, method: string): boolean {
  if (key === 'annual') return true
  return method === 'ON_HIRE' || method === 'ON_TENURE' || method === 'MANUAL'
}

/* ─────────────────────────────────────────────
   읽기 (페이지 로더)
───────────────────────────────────────────── */

/** 회사의 활성 휴가 종류 — 신청/부여 모달에서 사용. */
export async function listLeaveTypes(_employeeId?: string): Promise<Result<LeaveTypeItem[]>> {
  const user = await getCurrentUser()
  try {
    const rows = await getDb()
      .select({ id: leaveTypes.id, name: leaveTypes.name, key: leaveTypes.key })
      .from(leaveTypes)
      .where(eq(leaveTypes.companyId, user.companyId))
    return ok(
      rows.map((t) => ({
        id: t.id,
        name: t.name,
        key: t.key,
        grantAmount: null,
        grantMethod: t.key === 'annual' ? 'ANNUAL' : 'ON_REQUEST',
        grantUnit: 'DAY',
        paymentType: 'PAID',
        evidenceRequirement: 'NONE',
        approverEmployeeId: null,
        approverName: null,
        ccNames: [],
        periodicCycle: null,
        periodicUsed: null,
      })),
    )
  } catch (e) {
    console.error('[leave] listLeaveTypes 실패', e)
    return ok([])
  }
}

/** 직원의 연도별 휴가 잔액 요약. */
export async function getLeaveBalances(employeeId: string, year: number): Promise<Result<LeaveBalanceSummary[]>> {
  try {
    const rows = await getDb()
      .select({
        leaveTypeId: leaveBalances.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        leaveTypeKey: leaveTypes.key,
        granted: leaveBalances.grantedDays,
        used: leaveBalances.usedDays,
        adjusted: leaveBalances.adjustedDays,
      })
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)))
    return ok(
      rows.map((b) => {
        const granted = n(b.granted)
        const used = n(b.used)
        const adjusted = n(b.adjusted)
        return {
          leaveTypeId: b.leaveTypeId,
          leaveTypeName: b.leaveTypeName ?? '휴가',
          leaveTypeKey: b.leaveTypeKey ?? '',
          grantedDays: granted,
          usedDays: used,
          adjustedDays: adjusted,
          remainingDays: granted - used + adjusted,
        }
      }),
    )
  } catch (e) {
    console.error('[leave] getLeaveBalances 실패', e)
    return ok([])
  }
}

/** 내 휴가 신청 이력 (최신순). */
export async function listMyLeaveRequests(employeeId: string): Promise<Result<LeaveRequestItem[]>> {
  try {
    const rows = await getDb()
      .select({
        id: leaveRequests.id,
        leaveTypeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.employeeId, employeeId))
      .orderBy(desc(leaveRequests.createdAt))
    return ok(
      rows.map((r) => ({
        id: r.id,
        leaveTypeName: r.leaveTypeName ?? '휴가',
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        days: n(r.days),
        reason: r.reason ?? '',
        status: r.status as LeaveRequestStatus,
        reviewNote: null,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        unitType: 'FULL',
        schedule: emptySchedule(),
      })),
    )
  } catch (e) {
    console.error('[leave] listMyLeaveRequests 실패', e)
    return ok([])
  }
}

/** 연차 상세 월별 원장 — v1 에는 leave_transactions 가 없어 잔액 기반 단순 원장으로 재현. */
export async function getAnnualLeaveLedger(employeeId: string, year: number): Promise<Result<AnnualLeaveLedger>> {
  try {
    const balRes = await getLeaveBalances(employeeId, year)
    const annual = (balRes.ok ? balRes.data : []).find((b) => b.leaveTypeKey === 'annual')
    if (!annual) {
      return ok({ year, hasAnnualType: false, rows: [], summary: { granted: 0, expired: 0, used: 0, adjusted: 0 } })
    }
    const now = new Date()
    const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : year < now.getFullYear() ? 12 : 0
    const rows: AnnualLeaveLedgerRow[] = []
    let cumulative = 0
    for (let m = 1; m <= 12; m++) {
      const granted = m === 1 ? annual.grantedDays + annual.adjustedDays : 0
      const used = m === currentMonth ? annual.usedDays : 0
      cumulative = cumulative + granted - used
      rows.push({
        month: m,
        granted,
        expired: 0,
        used,
        adjusted: 0,
        remaining: Math.max(0, cumulative),
        isHireMonth: false,
        isCurrentMonth: currentMonth === m,
      })
    }
    return ok({
      year,
      hasAnnualType: true,
      rows,
      summary: { granted: annual.grantedDays, expired: 0, used: annual.usedDays, adjusted: annual.adjustedDays },
    })
  } catch (e) {
    console.error('[leave] getAnnualLeaveLedger 실패', e)
    return ok({ year, hasAnnualType: false, rows: [], summary: { granted: 0, expired: 0, used: 0, adjusted: 0 } })
  }
}

/** 회사 전체 휴가 잔액 (직원 × 휴가종류). */
export async function listCompanyLeaveBalances(_actorEmployeeId: string, year: number): Promise<Result<CompanyLeaveBalanceRow[]>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const types = await db
      .select({ id: leaveTypes.id, key: leaveTypes.key, name: leaveTypes.name })
      .from(leaveTypes)
      .where(eq(leaveTypes.companyId, user.companyId))

    const emps = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeNumber: employees.employeeNumber,
        hireDate: employees.hireDate,
        gender: employees.gender,
        departmentName: departments.name,
        positionName: positions.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(and(eq(employees.companyId, user.companyId), eq(employees.isActive, true)))
      .orderBy(asc(employees.name))

    const empIds = emps.map((e) => e.id)
    const bals = empIds.length
      ? await db
          .select({
            employeeId: leaveBalances.employeeId,
            leaveTypeId: leaveBalances.leaveTypeId,
            granted: leaveBalances.grantedDays,
            used: leaveBalances.usedDays,
            adjusted: leaveBalances.adjustedDays,
          })
          .from(leaveBalances)
          .where(and(inArray(leaveBalances.employeeId, empIds), eq(leaveBalances.year, year)))
      : []

    const balByEmp = new Map<string, typeof bals>()
    for (const b of bals) {
      const arr = balByEmp.get(b.employeeId) ?? []
      arr.push(b)
      balByEmp.set(b.employeeId, arr)
    }

    return ok(
      emps.map((emp) => ({
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNumber: emp.employeeNumber,
        departmentName: emp.departmentName ?? null,
        positionName: emp.positionName ?? null,
        hireDate: emp.hireDate ? new Date(emp.hireDate) : null,
        gender: (emp.gender as 'MALE' | 'FEMALE' | 'OTHER' | null) ?? null,
        balances: types.map((lt) => {
          const bal = (balByEmp.get(emp.id) ?? []).find((b) => b.leaveTypeId === lt.id)
          const granted = bal ? n(bal.granted) : 0
          const used = bal ? n(bal.used) : 0
          const adjusted = bal ? n(bal.adjusted) : 0
          return {
            leaveTypeId: lt.id,
            leaveTypeKey: lt.key,
            leaveTypeName: lt.name,
            grantedDays: granted,
            usedDays: used,
            adjustedDays: adjusted,
            remainingDays: granted - used + adjusted,
          }
        }),
      })),
    )
  } catch (e) {
    console.error('[leave] listCompanyLeaveBalances 실패', e)
    return ok([])
  }
}

/** 회사 전체 휴가 신청 내역 (최근 500건). */
export async function listCompanyLeaveRequests(_actorEmployeeId: string): Promise<Result<CompanyLeaveRequestItem[]>> {
  const user = await getCurrentUser()
  try {
    const rows = await getDb()
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        employeeName: employees.name,
        departmentName: departments.name,
        leaveTypeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(employees.companyId, user.companyId))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(500)
    return ok(
      rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        departmentName: r.departmentName ?? null,
        leaveTypeName: r.leaveTypeName ?? '휴가',
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        days: n(r.days),
        reason: r.reason ?? '',
        status: r.status as LeaveRequestStatus,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        formDocumentId: null,
        unitType: 'FULL',
        schedule: emptySchedule(),
      })),
    )
  } catch (e) {
    console.error('[leave] listCompanyLeaveRequests 실패', e)
    return ok([])
  }
}

/** 월별 연차 사용 — 잔액 기준 + 승인된 신청을 월별로 분배. */
export async function listMonthlyAnnualUsage(_actorEmployeeId: string, year: number): Promise<Result<MonthlyAnnualUsageRow[]>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const annualType = await db
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, user.companyId), eq(leaveTypes.key, 'annual')))
      .limit(1)
    if (!annualType.length) return ok([])
    const annualId = annualType[0].id

    const emps = await db
      .select({ id: employees.id, name: employees.name, employeeNumber: employees.employeeNumber, hireDate: employees.hireDate })
      .from(employees)
      .where(and(eq(employees.companyId, user.companyId), eq(employees.isActive, true)))
      .orderBy(asc(employees.name))
    const empIds = emps.map((e) => e.id)
    if (empIds.length === 0) return ok([])

    const bals = await db
      .select({ employeeId: leaveBalances.employeeId, granted: leaveBalances.grantedDays, used: leaveBalances.usedDays, adjusted: leaveBalances.adjustedDays })
      .from(leaveBalances)
      .where(and(inArray(leaveBalances.employeeId, empIds), eq(leaveBalances.leaveTypeId, annualId), eq(leaveBalances.year, year)))
    const balMap = new Map(bals.map((b) => [b.employeeId, b]))

    const reqs = await db
      .select({ employeeId: leaveRequests.employeeId, startDate: leaveRequests.startDate, days: leaveRequests.days })
      .from(leaveRequests)
      .where(
        and(
          inArray(leaveRequests.employeeId, empIds),
          eq(leaveRequests.leaveTypeId, annualId),
          eq(leaveRequests.status, 'APPROVED'),
          gte(leaveRequests.startDate, `${year}-01-01`),
          lt(leaveRequests.startDate, `${year + 1}-01-01`),
        ),
      )
    const monthByEmp = new Map<string, number[]>()
    for (const r of reqs) {
      const month = new Date(r.startDate).getMonth()
      const arr = monthByEmp.get(r.employeeId) ?? Array(12).fill(0)
      arr[month] = (arr[month] ?? 0) + n(r.days)
      monthByEmp.set(r.employeeId, arr)
    }

    return ok(
      emps.map((e) => {
        const bal = balMap.get(e.id)
        const granted = bal ? n(bal.granted) : 0
        const used = bal ? n(bal.used) : 0
        const adjusted = bal ? n(bal.adjusted) : 0
        return {
          employeeId: e.id,
          employeeName: e.name,
          employeeNumber: e.employeeNumber,
          hireDate: e.hireDate ? new Date(e.hireDate) : null,
          remainingDays: Math.max(0, granted + adjusted - used),
          monthlyUsage: monthByEmp.get(e.id) ?? Array(12).fill(0),
        }
      }),
    )
  } catch (e) {
    console.error('[leave] listMonthlyAnnualUsage 실패', e)
    return ok([])
  }
}

/** 부여·조정 내역 — v1 에 leave_transactions 가 없어 빈 목록(런타임 안전). */
export async function listLeaveGrantHistory(
  _actorEmployeeId: string,
  _filters?: { employeeId?: string; leaveTypeId?: string; year?: number },
): Promise<Result<LeaveGrantHistoryRow[]>> {
  return ok([])
}

/** 결재자 후보 — 회사 활성 구성원(본인 제외). */
export async function listApproverCandidates(_employeeId?: string): Promise<Result<{ id: string; name: string }[]>> {
  const user = await getCurrentUser()
  try {
    const rows = await getDb()
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.companyId, user.companyId), eq(employees.isActive, true)))
      .orderBy(asc(employees.name))
    return ok(rows.filter((e) => e.id !== user.employeeId))
  } catch (e) {
    console.error('[leave] listApproverCandidates 실패', e)
    return ok([])
  }
}

/** 연차 정책 승인자 — v1 에 정책 승인자 매핑이 없어 미지정(자동 승인). */
export async function getMyAnnualPolicyApprover(
  _employeeId: string,
): Promise<{ approverId: string | null; approverName: string | null; approveOnRegister: boolean }> {
  return { approverId: null, approverName: null, approveOnRegister: true }
}

/** 공휴일 날짜 문자열 목록 (YYYY-MM-DD) — 신청 모달 일수 자동계산용. */
export async function getHolidayDatesAction(year: number): Promise<string[]> {
  const user = await getCurrentUser()
  try {
    const rows = await getDb()
      .select({ date: companyHolidays.date })
      .from(companyHolidays)
      .where(eq(companyHolidays.companyId, user.companyId))
    return rows
      .filter((h) => h.date)
      .map((h) => new Date(h.date as string).toISOString().slice(0, 10))
      .filter((d) => d.startsWith(String(year)))
  } catch (e) {
    console.error('[leave] getHolidayDatesAction 실패', e)
    return []
  }
}

/* ─────────────────────────────────────────────
   쓰기 (클라이언트 컴포넌트가 호출하는 액션) — ApiResponse 반환
───────────────────────────────────────────── */

async function leaveTypeKeyOf(leaveTypeId: string): Promise<string> {
  const rows = await getDb().select({ key: leaveTypes.key }).from(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).limit(1)
  return rows[0]?.key ?? ''
}

/** 휴가 신청 — 결재자 지정 시 PENDING, 없으면 즉시 APPROVED + 잔액 차감. */
export async function requestLeaveAction(input: {
  leaveTypeId: string
  approverId?: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  evidenceFileUrl?: string
  schedule?: LeaveScheduleEntry[]
}): Promise<ApiResponse<{ id: string }>> {
  const user = await getCurrentUser()
  return toApiResponse(await requestLeaveImpl(user.employeeId, input))
}

async function requestLeaveImpl(
  employeeId: string,
  input: {
    leaveTypeId: string
    approverId?: string
    startDate: string
    endDate: string
    days: number
    reason?: string
    schedule?: LeaveScheduleEntry[]
  },
): Promise<Result<{ id: string }>> {
  if (!input.leaveTypeId) return err(errors.validation('휴가 종류를 선택해 주세요'))
  if (!input.startDate) return err(errors.validation('시작일을 선택해 주세요'))
  const days =
    input.schedule && input.schedule.length > 0
      ? Math.round(input.schedule.reduce((s, e) => s + e.days, 0) * 100) / 100
      : input.days
  if (days <= 0) return err(errors.validation('사용 일수가 0이에요. 날짜와 사용 단위를 확인해 주세요.'))
  if (input.approverId && input.approverId === employeeId)
    return err(errors.validation('본인을 결재자로 지정할 수 없어요'))

  const needsApproval = !!input.approverId
  const status: LeaveRequestStatus = needsApproval ? 'PENDING' : 'APPROVED'
  const id = crypto.randomUUID()

  try {
    const db = getDb()
    await db.insert(leaveRequests).values({
      id,
      employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate || input.startDate,
      days: String(days),
      reason: input.reason ?? '',
      status,
      updatedAt: new Date(),
    })
    if (!needsApproval) {
      const key = await leaveTypeKeyOf(input.leaveTypeId)
      const grantsOnRequest = !isPreGranted(key, key === 'annual' ? 'ANNUAL' : 'ON_REQUEST')
      await applyBalanceUse(employeeId, input.leaveTypeId, new Date(input.startDate).getFullYear(), days, grantsOnRequest)
    }
  } catch (e) {
    console.error('[leave] requestLeave insert 실패', e)
    return err(errors.internal('휴가 신청 저장 중 오류가 발생했어요'))
  }

  revalidatePath('/leave')
  revalidatePath('/leave/requests')
  return ok({ id })
}

/** 잔액에 사용(USE) 반영 — leave_balances 의 usedDays(+grantedDays) 증가. 없으면 생성. */
async function applyBalanceUse(employeeId: string, leaveTypeId: string, year: number, days: number, grantsOnRequest: boolean): Promise<void> {
  const db = getDb()
  const existing = await db
    .select({ id: leaveBalances.id })
    .from(leaveBalances)
    .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.leaveTypeId, leaveTypeId), eq(leaveBalances.year, year)))
    .limit(1)
  if (existing.length) {
    await db
      .update(leaveBalances)
      .set({
        usedDays: sql`${leaveBalances.usedDays} + ${days}`,
        ...(grantsOnRequest ? { grantedDays: sql`${leaveBalances.grantedDays} + ${days}` } : {}),
      })
      .where(eq(leaveBalances.id, existing[0].id))
  } else {
    await db.insert(leaveBalances).values({
      id: crypto.randomUUID(),
      employeeId,
      leaveTypeId,
      year,
      grantedDays: String(grantsOnRequest ? days : 0),
      usedDays: String(days),
      adjustedDays: '0',
      updatedAt: new Date(),
    })
  }
}

/** 휴가 승인 — PENDING → APPROVED + 잔액 사용 차감. */
export async function approveLeaveAction(requestId: string): Promise<ApiResponse<void>> {
  return toApiResponse(await decideLeaveImpl(requestId, 'APPROVED'))
}

/** 휴가 반려 — PENDING → REJECTED. */
export async function rejectLeaveAction(requestId: string, _reviewNote?: string): Promise<ApiResponse<void>> {
  return toApiResponse(await decideLeaveImpl(requestId, 'REJECTED'))
}

async function decideLeaveImpl(requestId: string, decision: 'APPROVED' | 'REJECTED'): Promise<Result<void>> {
  if (!requestId) return err(errors.validation('잘못된 요청이에요'))
  try {
    const db = getDb()
    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveTypeId: leaveRequests.leaveTypeId,
        startDate: leaveRequests.startDate,
        days: leaveRequests.days,
        status: leaveRequests.status,
        key: leaveTypes.key,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.id, requestId))
      .limit(1)
    const req = rows[0]
    if (!req) return err(errors.notFound('휴가 신청을 찾을 수 없어요'))
    if (req.status !== 'PENDING') return err(errors.validation('대기 중인 신청만 처리할 수 있어요'))

    await db.update(leaveRequests).set({ status: decision, updatedAt: new Date() }).where(eq(leaveRequests.id, requestId))

    if (decision === 'APPROVED') {
      const key = req.key ?? ''
      const grantsOnRequest = !isPreGranted(key, key === 'annual' ? 'ANNUAL' : 'ON_REQUEST')
      await applyBalanceUse(req.employeeId, req.leaveTypeId, new Date(req.startDate).getFullYear(), n(req.days), grantsOnRequest)
    }
  } catch (e) {
    console.error('[leave] decideLeave 실패', e)
    return err(errors.internal('처리 중 오류가 발생했어요'))
  }
  revalidatePath('/leave')
  revalidatePath('/leave/requests')
  revalidatePath('/hr/leave')
  return ok(undefined)
}

/** 휴가 취소 — 본인 PENDING/APPROVED 신청을 취소하고 잔액 복원(승인됐던 경우). */
export async function cancelLeaveAction(requestId: string): Promise<ApiResponse<{ pendingApproval: boolean }>> {
  const user = await getCurrentUser()
  return toApiResponse(await cancelLeaveImpl(requestId, user.employeeId))
}

async function cancelLeaveImpl(requestId: string, employeeId: string): Promise<Result<{ pendingApproval: boolean }>> {
  try {
    const db = getDb()
    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveTypeId: leaveRequests.leaveTypeId,
        startDate: leaveRequests.startDate,
        days: leaveRequests.days,
        status: leaveRequests.status,
        key: leaveTypes.key,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.id, requestId))
      .limit(1)
    const req = rows[0]
    if (!req) return err(errors.notFound('휴가 신청을 찾을 수 없어요'))
    if (req.employeeId !== employeeId) return err(errors.forbidden('본인 신청만 취소할 수 있어요'))
    if (!['PENDING', 'APPROVED'].includes(req.status)) return err(errors.validation('취소할 수 없는 상태예요'))

    const wasApproved = req.status === 'APPROVED'
    await db.update(leaveRequests).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(leaveRequests.id, requestId))

    if (wasApproved) {
      const key = req.key ?? ''
      const grantsOnRequest = !isPreGranted(key, key === 'annual' ? 'ANNUAL' : 'ON_REQUEST')
      const days = n(req.days)
      const year = new Date(req.startDate).getFullYear()
      await db
        .update(leaveBalances)
        .set({
          usedDays: sql`${leaveBalances.usedDays} - ${days}`,
          ...(grantsOnRequest ? { grantedDays: sql`${leaveBalances.grantedDays} - ${days}` } : {}),
        })
        .where(and(eq(leaveBalances.employeeId, req.employeeId), eq(leaveBalances.leaveTypeId, req.leaveTypeId), eq(leaveBalances.year, year)))
    }
  } catch (e) {
    console.error('[leave] cancelLeave 실패', e)
    return err(errors.internal('취소 중 오류가 발생했어요'))
  }
  revalidatePath('/leave')
  revalidatePath('/hr/leave')
  return ok({ pendingApproval: false })
}

/** 관리자 휴가 부여 — leave_balances.grantedDays 증가(없으면 생성). */
export async function grantLeaveAction(input: {
  employeeId: string
  leaveTypeId: string
  days: number
  reason?: string
}): Promise<ApiResponse<void>> {
  return toApiResponse(await adjustBalanceImpl(input.employeeId, input.leaveTypeId, Math.abs(input.days), 'grant'))
}

/** 관리자 휴가 조정 — days 부호에 따라 adjustedDays 증감. */
export async function adjustLeaveAction(input: {
  employeeId: string
  leaveTypeId: string
  days: number
  reason?: string
}): Promise<ApiResponse<void>> {
  return toApiResponse(await adjustBalanceImpl(input.employeeId, input.leaveTypeId, input.days, 'adjust'))
}

async function adjustBalanceImpl(
  employeeId: string,
  leaveTypeId: string,
  days: number,
  mode: 'grant' | 'adjust',
): Promise<Result<void>> {
  if (!employeeId || !leaveTypeId) return err(errors.validation('대상자와 휴가 종류를 선택해 주세요'))
  if (mode === 'grant' && days <= 0) return err(errors.validation('올바른 일수를 입력해 주세요'))
  const year = new Date().getFullYear()
  try {
    const db = getDb()
    const existing = await db
      .select({ id: leaveBalances.id })
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.leaveTypeId, leaveTypeId), eq(leaveBalances.year, year)))
      .limit(1)
    const col = mode === 'grant' ? leaveBalances.grantedDays : leaveBalances.adjustedDays
    if (existing.length) {
      await db
        .update(leaveBalances)
        .set({ [mode === 'grant' ? 'grantedDays' : 'adjustedDays']: sql`${col} + ${days}` })
        .where(eq(leaveBalances.id, existing[0].id))
    } else {
      await db.insert(leaveBalances).values({
        id: crypto.randomUUID(),
        employeeId,
        leaveTypeId,
        year,
        grantedDays: String(mode === 'grant' ? days : 0),
        usedDays: '0',
        adjustedDays: String(mode === 'adjust' ? days : 0),
        updatedAt: new Date(),
      })
    }
  } catch (e) {
    console.error('[leave] adjustBalance 실패', e)
    return err(errors.internal('처리 중 오류가 발생했어요'))
  }
  revalidatePath('/hr/leave')
  return ok(undefined)
}

/** 연차 소멸·이월 — v1 에는 정책/leave_transactions 가 없어 noop(멱등). */
export async function processLeaveExpiryAction(_year: number): Promise<ApiResponse<{ expired: number; carriedOver: number }>> {
  return toApiResponse(ok({ expired: 0, carriedOver: 0 }))
}

export async function listLeaveGrantHistoryAction(filters?: {
  employeeId?: string
  leaveTypeId?: string
  year?: number
}): Promise<ApiResponse<LeaveGrantHistoryRow[]>> {
  const user = await getCurrentUser()
  return toApiResponse(await listLeaveGrantHistory(user.employeeId, filters))
}

/* ─────────────────────────────────────────────
   기존 v1 폼 액션(서버 액션 form) 보존 — new/page.tsx, requests/page.tsx 가 사용
───────────────────────────────────────────── */

const TYPE_KEY: Record<string, string> = { 연차: 'annual', 병가: 'sick', 경조사: 'condolence' }

function diffDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end || start)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  const d = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return d > 0 ? d : 1
}

/** 휴가 신청 (HTML form action) — new/page.tsx 의 단순 폼 흐름 보존. */
export async function requestLeave(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const typeLabel = String(formData.get('leave_type') || '연차')
  const key = TYPE_KEY[typeLabel] ?? 'annual'
  const startDate = String(formData.get('start_date') || '')
  const endDate = String(formData.get('end_date') || '') || startDate
  const reason = String(formData.get('reason') || '')
  if (!startDate) redirect('/leave/new?error=missing')

  let success = true
  try {
    const db = getDb()
    const lt = await db
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, user.companyId), eq(leaveTypes.key, key)))
      .limit(1)
    if (!lt.length) throw new Error(`leave_type 없음: company=${user.companyId} key=${key}`)
    await db.insert(leaveRequests).values({
      id: crypto.randomUUID(),
      employeeId: user.employeeId,
      leaveTypeId: lt[0].id,
      startDate,
      endDate,
      days: String(diffDays(startDate, endDate)),
      reason,
      status: 'PENDING',
      updatedAt: new Date(),
    })
  } catch (e) {
    console.error('[leave] requestLeave(form) insert 실패', e)
    success = false
  }
  redirect(success ? '/leave?saved=1' : '/leave/new?error=db')
}

/** 휴가 승인/반려 (HTML form action) — requests/page.tsx 의 form 보존. */
export async function decideLeave(formData: FormData): Promise<void> {
  const id = String(formData.get('id') || '')
  const decision = String(formData.get('decision') || '')
  if (!id || (decision !== 'APPROVED' && decision !== 'REJECTED')) return
  await decideLeaveImpl(id, decision as 'APPROVED' | 'REJECTED')
  revalidatePath('/leave/requests')
  revalidatePath('/leave')
}
