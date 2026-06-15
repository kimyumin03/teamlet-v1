import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveRequests, leaveTypes, companyHolidays } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 휴가 캘린더 — 원본 teamlet 그대로. 내 휴가 + 공휴일 월별 표시 (실데이터).
export const dynamic = 'force-dynamic'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

type CalendarLeaveItem = { id: string; employeeId: string; leaveTypeName: string; startDate: Date; endDate: Date }

function buildMonthNav(year: number, month: number, delta: number) {
  let m = month + delta
  let y = year
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  return `/leave/calendar?year=${y}&month=${m}`
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}
function getFirstDowOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}
function isDateInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

export default async function LeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const user = getCurrentUser()
  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year ?? String(now.getFullYear()), 10)
  const month = parseInt(params.month ?? String(now.getMonth() + 1), 10)

  let items: CalendarLeaveItem[] = []
  let holidays: { date: Date; name: string }[] = []
  try {
    const db = getDb()
    const myLeave = await db
      .select({
        id: leaveRequests.id,
        leaveTypeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.employeeId, user.employeeId))
    items = myLeave.map((r) => ({
      id: r.id,
      employeeId: user.employeeId,
      leaveTypeName: r.leaveTypeName ?? '휴가',
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
    }))

    const holRows = await db
      .select({ date: companyHolidays.date, name: companyHolidays.name })
      .from(companyHolidays)
      .where(eq(companyHolidays.companyId, user.companyId))
    holidays = holRows.filter((h) => h.date).map((h) => ({ date: new Date(h.date as string), name: h.name }))
  } catch (err) {
    console.error('[db] leave calendar load 실패', err)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDowOfMonth(year, month)

  const holidayMap = new Map<number, string>()
  for (const h of holidays) {
    const d = h.date
    if (d.getFullYear() === year && d.getMonth() + 1 === month) holidayMap.set(d.getDate(), h.name)
  }

  const dayMap = new Map<number, CalendarLeaveItem[]>()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dayItems = items.filter((item) => isDateInRange(date, item.startDate, item.endDate))
    if (dayItems.length > 0) dayMap.set(d, dayItems)
  }

  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-7 pb-3">
        <div className="page-h" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="h-title">휴가 캘린더</h1>
            <p className="h-sub mt-1.5">내 휴가와 공휴일을 월별로 확인해요</p>
          </div>
          <Link href="/leave" className="shrink-0 text-[12px] text-foreground-subtle hover:text-foreground transition-colors">
            내 휴가 →
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-10">
        <div className="mx-auto max-w-5xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link href={buildMonthNav(year, month, -1)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border hover:bg-background-secondary transition-colors">
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M9.78 3.47a.75.75 0 0 1 0 1.06L6.81 7.5l2.97 2.97a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </Link>
            <span className="text-[15px] font-semibold text-foreground">{year}년 {month}월</span>
            <Link href={buildMonthNav(year, month, 1)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border hover:bg-background-secondary transition-colors">
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M6.22 3.47a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06L9.19 7.5 6.22 4.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-background-secondary">
              {DOW.map((d, i) => (
                <div key={d} className={`py-2 text-center text-[11px] font-semibold ${i === 0 || i === 6 ? 'text-destructive-600' : 'text-foreground-muted'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const isToday = isCurrentMonth && day === now.getDate()
                const dayItems = day ? (dayMap.get(day) ?? []) : []
                const isWeekend = idx % 7 === 0 || idx % 7 === 6
                const holidayName = day ? holidayMap.get(day) : undefined
                const isRed = !!day && (isWeekend || holidayName != null)
                return (
                  <div
                    key={idx}
                    className={`min-h-[90px] border-b border-r border-border p-1.5 ${
                      !day ? 'bg-background-secondary/40' : holidayName ? 'bg-destructive-100' : isWeekend ? 'bg-destructive-50' : ''
                    }`}
                  >
                    {day && (
                      <>
                        <div className="mb-1 flex items-center gap-1">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${isToday ? 'bg-foreground font-medium text-background' : isRed ? 'font-bold text-destructive-600' : 'font-medium text-foreground-muted'}`}>
                            {day}
                          </span>
                          {holidayName && (
                            <span className="truncate text-[10px] font-semibold text-destructive-600" title={holidayName}>{holidayName}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {dayItems.slice(0, 3).map((item) => (
                            <span key={item.id + day} className="truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] leading-tight text-blue-800" title={item.leaveTypeName}>
                              {item.leaveTypeName}
                            </span>
                          ))}
                          {dayItems.length > 3 && <span className="px-1 text-[10px] text-foreground-subtle">+{dayItems.length - 3}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-blue-100" />내 휴가
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-destructive-50 ring-1 ring-destructive-600" />공휴일·주말
            </span>
          </div>

          {items.length === 0 && (
            <p className="text-center text-[13px] text-foreground-muted">이 달에 등록된 내 휴가가 없어요.</p>
          )}
        </div>
      </div>
    </div>
  )
}
