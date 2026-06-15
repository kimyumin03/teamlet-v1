import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companyHolidays } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { addHoliday } from './actions'

// 공휴일 관리 — 실데이터 목록 + 추가(쓰기). 추가하면 휴가 캘린더에도 반영돼요.
export const dynamic = 'force-dynamic'

export default async function HolidaysSettingsPage() {
  const user = await getCurrentUser()
  let holidays: { id: string; date: string | null; name: string }[] = []
  try {
    holidays = await getDb()
      .select({ id: companyHolidays.id, date: companyHolidays.date, name: companyHolidays.name })
      .from(companyHolidays)
      .where(eq(companyHolidays.companyId, user.companyId))
      .orderBy(asc(companyHolidays.date))
  } catch (err) {
    console.error('[db] holidays load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>공휴일 관리</h1>
          <div className="h-sub">회사 공휴일·휴무일을 관리해요. 추가하면 휴가 캘린더에 표시돼요.</div>
        </div>
      </div>

      <form action={addHoliday} style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input type="date" name="date" required className="ctl-in" style={{ maxWidth: 180 }} />
        <input name="name" required placeholder="휴일 이름 (예: 창립기념일)" className="ctl-in" style={{ maxWidth: 260 }} />
        <button type="submit" className="btn btn-primary">추가</button>
      </form>

      <div className="sec-divider">등록된 공휴일<span className="ct">{holidays.length}</span><span className="line" /></div>
      {holidays.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 공휴일이 없어요.</span>
      ) : (
        <table className="tbl">
          <thead><tr><th style={{ width: 160 }}>날짜</th><th>이름</th></tr></thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id}>
                <td><span className="sn">{h.date ?? '—'}</span></td>
                <td style={{ fontWeight: 600 }}>{h.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
