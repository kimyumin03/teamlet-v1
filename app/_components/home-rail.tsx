import Link from 'next/link'
import { MiniCalendar } from './mini-calendar'

// teamlet home-rail.tsx 그대로 (lucide → 인라인 SVG). 휴가/이벤트 데이터 이식 전이라
// 자리비움·축하 위젯은 데이터 있을 때만 노출(원본 동작과 동일).
const IconCal = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const IconUsers = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

export function HomeRail({ activeCount = 0 }: { activeCount?: number }) {
  const todayAbsent: { id: string; employeeName: string; leaveTypeName: string }[] = []
  const workingCount = Math.max(0, activeCount - todayAbsent.length)

  return (
    <aside className="rail-h">
      <div className="widget">
        <h5>
          {IconCal} 이번 달 일정
          <Link href="/leave" className="all">
            월 보기 →
          </Link>
        </h5>
        <MiniCalendar />
      </div>

      <div className="widget">
        <h5>
          {IconUsers} 오늘 근무 현황
          <Link href="/members" className="all">
            전체 →
          </Link>
        </h5>
        <div className="today-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="cell">
            <div className="n num">{String(workingCount).padStart(2, '0')}</div>
            <div className="l">출근</div>
          </div>
          <div className="cell">
            <div className="n num">{String(todayAbsent.length).padStart(2, '0')}</div>
            <div className="l">휴가</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
