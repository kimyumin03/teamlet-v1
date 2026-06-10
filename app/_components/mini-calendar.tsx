'use client'

import { useState } from 'react'

// teamlet mini-calendar.tsx 그대로 (공휴일 연도 fetch 액션만 제거 — axhub 공휴일 데이터 이식 전).
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function MiniCalendar({
  leaveRanges = [],
  eventDates = [],
}: {
  leaveRanges?: { startDate: string; endDate: string }[]
  eventDates?: string[]
}) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const todayY = now.getFullYear()
  const todayM = now.getMonth()
  const todayD = now.getDate()

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const daysInPrev = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1)

  const eventSet = new Set(
    eventDates.map((d) => {
      const dt = new Date(d)
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
    }),
  )

  const rangeSet = new Set<string>()
  for (const r of leaveRanges) {
    const s = new Date(r.startDate)
    s.setHours(0, 0, 0, 0)
    const e = new Date(r.endDate)
    e.setHours(23, 59, 59, 999)
    const cur = new Date(s)
    while (cur <= e) {
      rangeSet.add(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`)
      cur.setDate(cur.getDate() + 1)
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else setViewMonth((m) => m + 1)
  }

  const cells: { day: number; outOfMonth: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, outOfMonth: true })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, outOfMonth: false })
  const remain = 42 - cells.length
  for (let d = 1; d <= remain; d++) cells.push({ day: d, outOfMonth: true })

  const weeks: (typeof cells)[] = []
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div>
      <div className="cal-head">
        <span className="month">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <div className="nav-btns">
          <button onClick={prevMonth}>‹</button>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      <div className="cal">
        {DAY_NAMES.map((d, i) => (
          <div key={d} className={`dow${i === 0 || i === 6 ? ' sun' : ''}`}>
            {d}
          </div>
        ))}

        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            const isToday =
              !cell.outOfMonth && viewYear === todayY && viewMonth === todayM && cell.day === todayD
            const curKey = `${viewYear}-${viewMonth}-${cell.day}`
            const isRange = !cell.outOfMonth && rangeSet.has(curKey)
            const hasEvent = !cell.outOfMonth && eventSet.has(curKey)
            const isWeekend = di === 0 || di === 6

            let cls = 'd'
            if (cell.outOfMonth) cls += ' out'
            else if (isToday) cls += ' today'
            else if (isWeekend) cls += ' sun'
            if (isRange && !isToday) cls += ' range'
            if (hasEvent) cls += ' dot'

            return (
              <div key={`${wi}-${di}`} className={cls}>
                {cell.day}
              </div>
            )
          }),
        )}
      </div>

      <div className="legend">
        <span className="l">
          <i />
          오늘
        </span>
        <span className="h">
          <i />
          공휴일
        </span>
        <span className="r">
          <i />
          휴가
        </span>
      </div>
    </div>
  )
}
