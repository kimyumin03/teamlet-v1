'use server'

// 회사 정보 + 공휴일 서버 액션 — 설정 영역 소유. drizzle + Neon 직결.
// 원본 lib/actions/company.ts + packages/modules/src/tenancy/{company,holiday}.ts 의
// 시그니처/반환형(ApiResponse)·검증(@teamlet/shared zod)·비즈니스 로직을 동일하게 재현.
// 권한: 원본 assertPermission(company.basic_info.* / company.holidays.manage)
//        → v1 @/lib/permissions 의 hasPermission 으로 동일 게이트.
// ⚠️ v1 companies schema 에 corporateNumber/logoUrl/coverUrl/companyCodeActive/visionMission 미선언 →
//    선언 컬럼(name/phone/foundedAt/addressRoad/addressDetail)만 update (missingSchemaColumns 보고).

import { and, asc, eq, gte, lt } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companies, companyHolidays } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  companyUpdateSchema,
  companyHolidayCreateSchema,
  toApiResponse,
  ok,
  err,
  errors,
  type Result,
  type ApiResponse,
} from '@teamlet/shared'
import type { CompanyInfo, HolidayItem } from '@teamlet/modules/company'

const BASIC_INFO_READ = 'company.basic_info.read'
const BASIC_INFO_MANAGE = 'company.basic_info.manage'
const HOLIDAYS_MANAGE = 'company.holidays.manage'

export async function getCompanyInfo(actorEmployeeId?: string): Promise<Result<CompanyInfo>> {
  const user = await getCurrentUser()
  const employeeId = actorEmployeeId ?? user.employeeId
  if (!(await hasPermission(employeeId, BASIC_INFO_READ))) {
    return err(errors.forbidden('회사 정보를 볼 권한이 없어요'))
  }
  try {
    const rows = await getDb()
      .select({
        id: companies.id,
        name: companies.name,
        businessNumber: companies.businessNumber,
        phone: companies.phone,
        foundedAt: companies.foundedAt,
        addressRoad: companies.addressRoad,
        addressDetail: companies.addressDetail,
        companyCode: companies.companyCode,
      })
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1)
    const c = rows[0]
    if (!c) return err(errors.notFound('회사 정보를 찾을 수 없어요'))
    return ok({
      id: c.id,
      name: c.name,
      businessNumber: c.businessNumber ?? '',
      corporateNumber: null,
      phone: c.phone ?? null,
      foundedAt: c.foundedAt ?? null,
      addressRoad: c.addressRoad ?? null,
      addressDetail: c.addressDetail ?? null,
      logoUrl: null,
      coverUrl: null,
      companyCode: c.companyCode ?? '',
      companyCodeActive: true,
      visionMission: null,
    })
  } catch (e) {
    console.error('[db] getCompanyInfo 실패', e)
    return err(errors.internal('회사 정보를 불러오지 못했어요'))
  }
}

export async function getCompanyInfoAction(): Promise<ApiResponse<CompanyInfo>> {
  return toApiResponse(await getCompanyInfo())
}

export async function updateCompanyInfoAction(raw: unknown): Promise<ApiResponse<void>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, BASIC_INFO_MANAGE))) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '회사 정보를 수정할 권한이 없어요' } }
  }
  const parsed = companyUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? '입력 오류' } }
  }
  const input = parsed.data
  try {
    const set: Record<string, unknown> = { updatedAt: new Date() }
    if (input.name !== undefined) set.name = input.name
    if (input.phone !== undefined) set.phone = input.phone
    if (input.foundedAt !== undefined) set.foundedAt = input.foundedAt ? new Date(input.foundedAt) : null
    if (input.addressRoad !== undefined) set.addressRoad = input.addressRoad
    if (input.addressDetail !== undefined) set.addressDetail = input.addressDetail
    await getDb().update(companies).set(set).where(eq(companies.id, user.companyId))
    return toApiResponse(ok(undefined))
  } catch (e) {
    console.error('[db] updateCompanyInfo 실패', e)
    return { ok: false, error: { code: 'INTERNAL', message: '저장에 실패했어요' } }
  }
}

/* ── 공휴일 (company.holidays.manage) ── */

export async function listCompanyHolidays(
  _actorEmployeeId?: string,
  year?: number,
): Promise<Result<HolidayItem[]>> {
  const user = await getCurrentUser()
  const targetYear = year ?? new Date().getFullYear()
  const start = `${targetYear}-01-01`
  const end = `${targetYear + 1}-01-01`
  try {
    const rows = await getDb()
      .select({
        id: companyHolidays.id,
        date: companyHolidays.date,
        name: companyHolidays.name,
        isNational: companyHolidays.isNational,
      })
      .from(companyHolidays)
      .where(
        and(
          eq(companyHolidays.companyId, user.companyId),
          gte(companyHolidays.date, start),
          lt(companyHolidays.date, end),
        ),
      )
      .orderBy(asc(companyHolidays.date))
    return ok(
      rows.map((h) => ({
        id: h.id,
        date: new Date(h.date as unknown as string),
        name: h.name,
        isNational: !!h.isNational,
      })),
    )
  } catch (e) {
    console.error('[db] listCompanyHolidays 실패', e)
    return ok([])
  }
}

export async function listCompanyHolidaysAction(year?: number): Promise<ApiResponse<HolidayItem[]>> {
  return toApiResponse(await listCompanyHolidays(undefined, year))
}

export async function addCompanyHolidayAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, HOLIDAYS_MANAGE))) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '공휴일을 관리할 권한이 없어요' } }
  }
  const parsed = companyHolidayCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? '입력 오류' } }
  }
  const { date, name, isNational } = parsed.data
  try {
    const dup = await getDb()
      .select({ id: companyHolidays.id })
      .from(companyHolidays)
      .where(and(eq(companyHolidays.companyId, user.companyId), eq(companyHolidays.date, date)))
      .limit(1)
    if (dup.length) {
      return { ok: false, error: { code: 'CONFLICT', message: '해당 날짜에 이미 공휴일이 등록돼 있어요' } }
    }
    const id = crypto.randomUUID()
    await getDb().insert(companyHolidays).values({
      id,
      companyId: user.companyId,
      date,
      name: name.trim(),
      isNational: isNational ?? false,
    })
    return toApiResponse(ok({ id }))
  } catch (e) {
    console.error('[db] addCompanyHoliday 실패', e)
    return { ok: false, error: { code: 'INTERNAL', message: '공휴일 추가에 실패했어요' } }
  }
}

export async function deleteCompanyHolidayAction(holidayId: string): Promise<ApiResponse<void>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, HOLIDAYS_MANAGE))) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '공휴일을 관리할 권한이 없어요' } }
  }
  try {
    const rows = await getDb()
      .select({ id: companyHolidays.id })
      .from(companyHolidays)
      .where(and(eq(companyHolidays.id, holidayId), eq(companyHolidays.companyId, user.companyId)))
      .limit(1)
    if (!rows.length) {
      return { ok: false, error: { code: 'NOT_FOUND', message: '공휴일을 찾을 수 없어요' } }
    }
    await getDb().delete(companyHolidays).where(eq(companyHolidays.id, holidayId))
    return toApiResponse(ok(undefined))
  } catch (e) {
    console.error('[db] deleteCompanyHoliday 실패', e)
    return { ok: false, error: { code: 'INTERNAL', message: '공휴일 삭제에 실패했어요' } }
  }
}

/* ── 법정공휴일 자동 등록 (공공데이터포털 특일정보 API) ──
   원본 tenancy/holiday.ts 의 fetchKoreanStatutoryHolidays/syncStatutoryHolidays(Range) 이식.
   서비스키(DATA_GO_KR_SERVICE_KEY) 미설정이면 친절한 안내 메시지 반환 (코드 깨짐 없음). */

const REST_DE_INFO_URL =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'

type RestDeItem = {
  dateName?: string
  isHoliday?: string
  locdate?: number | string
}

function locdateToIso(locdate: number | string): string {
  const s = String(locdate)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

export async function fetchKoreanStatutoryHolidays(
  year: number,
): Promise<Result<{ date: string; name: string }[]>> {
  const rawKey = process.env.DATA_GO_KR_SERVICE_KEY
  if (!rawKey) {
    return err(
      errors.validation(
        '공공데이터포털 서비스키가 설정되지 않았어요. 환경변수 DATA_GO_KR_SERVICE_KEY 를 설정해 주세요.',
      ),
    )
  }
  const keyParam = rawKey.includes('%') ? rawKey : encodeURIComponent(rawKey)

  const attemptMonth = async (month: number): Promise<RestDeItem[]> => {
    const params = new URLSearchParams({
      solYear: String(year),
      solMonth: String(month).padStart(2, '0'),
      numOfRows: '50',
      _type: 'json',
    })
    const url = `${REST_DE_INFO_URL}?${params.toString()}&ServiceKey=${keyParam}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as {
        response?: {
          header?: { resultCode?: string; resultMsg?: string }
          body?: { items?: '' | { item?: RestDeItem | RestDeItem[] } }
        }
      }
      const code = json.response?.header?.resultCode
      if (code && code !== '00') throw new Error(json.response?.header?.resultMsg ?? `API ${code}`)
      const items = json.response?.body?.items
      if (!items) return []
      const item = items.item
      if (!item) return []
      return Array.isArray(item) ? item : [item]
    } finally {
      clearTimeout(timer)
    }
  }

  const monthFetch = async (month: number): Promise<RestDeItem[]> => {
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await attemptMonth(month)
      } catch (e) {
        lastErr = e
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
      }
    }
    throw lastErr
  }

  try {
    const monthly = await Promise.all(Array.from({ length: 12 }, (_, i) => monthFetch(i + 1)))
    const seen = new Set<string>()
    const result: { date: string; name: string }[] = []
    for (const item of monthly.flat()) {
      if (item.isHoliday !== 'Y' || item.locdate == null) continue
      const date = locdateToIso(item.locdate)
      if (seen.has(date)) continue
      seen.add(date)
      result.push({ date, name: (item.dateName ?? '공휴일').trim() })
    }
    result.sort((a, b) => a.date.localeCompare(b.date))
    return ok(result)
  } catch (e) {
    return err(
      errors.internal(
        `법정공휴일 조회에 실패했어요: ${e instanceof Error ? e.message : '알 수 없는 오류'}`,
      ),
    )
  }
}

export async function syncStatutoryHolidaysAction(
  year: number,
): Promise<ApiResponse<{ added: number; skipped: number }>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, HOLIDAYS_MANAGE))) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '공휴일을 관리할 권한이 없어요' } }
  }
  const fetched = await fetchKoreanStatutoryHolidays(year)
  if (!fetched.ok) return toApiResponse(fetched)
  if (fetched.data.length === 0) return toApiResponse(ok({ added: 0, skipped: 0 }))
  try {
    const existing = await getDb()
      .select({ date: companyHolidays.date })
      .from(companyHolidays)
      .where(eq(companyHolidays.companyId, user.companyId))
    const have = new Set(existing.map((r) => String(r.date)))
    const toAdd = fetched.data.filter((h) => !have.has(h.date))
    if (toAdd.length) {
      await getDb()
        .insert(companyHolidays)
        .values(
          toAdd.map((h) => ({
            id: crypto.randomUUID(),
            companyId: user.companyId,
            date: h.date,
            name: h.name,
            isNational: true,
          })),
        )
    }
    return toApiResponse(ok({ added: toAdd.length, skipped: fetched.data.length - toAdd.length }))
  } catch (e) {
    console.error('[db] syncStatutoryHolidays 실패', e)
    return { ok: false, error: { code: 'INTERNAL', message: '법정공휴일 등록에 실패했어요' } }
  }
}

export async function syncStatutoryHolidaysRangeAction(
  fromYear: number,
  toYear: number,
): Promise<ApiResponse<{ added: number; skipped: number; years: number }>> {
  const lo = Math.min(fromYear, toYear)
  const hi = Math.max(fromYear, toYear)
  if (hi - lo > 9) {
    return { ok: false, error: { code: 'VALIDATION', message: '한 번에 최대 10개 연도까지만 등록할 수 있어요' } }
  }
  let added = 0
  let skipped = 0
  for (let y = lo; y <= hi; y++) {
    const res = await syncStatutoryHolidaysAction(y)
    if (!res.ok) return res
    added += res.data.added
    skipped += res.data.skipped
  }
  return toApiResponse(ok({ added, skipped, years: hi - lo + 1 }))
}
