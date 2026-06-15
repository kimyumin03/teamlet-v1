import Link from 'next/link'
import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveBalances, employees, leaveTypes, leaveRequests } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// HR 휴가관리 — 회사 전체 휴가 잔여 현황 + 승인 대기. 원본 teamlet 의 /hr/leave.
export const dynamic = 'force-dynamic'

export default async function HrLeavePage() {
  const user = await getCurrentUser()
  let balances: { employeeName: string | null; typeName: string | null; year: number | null; granted: number; used: number; remaining: number }[] = []
  let pendingCount = 0
  try {
    const db = getDb()
    const rows = await db
      .select({
        employeeName: employees.name,
        typeName: leaveTypes.name,
        year: leaveBalances.year,
        granted: leaveBalances.grantedDays,
        used: leaveBalances.usedDays,
        adjusted: leaveBalances.adjustedDays,
      })
      .from(leaveBalances)
      .innerJoin(employees, eq(leaveBalances.employeeId, employees.id))
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(eq(employees.companyId, user.companyId))
      .orderBy(asc(employees.name))
    balances = rows.map((r) => {
      const granted = Number(r.granted ?? 0)
      const used = Number(r.used ?? 0)
      const adjusted = Number(r.adjusted ?? 0)
      return { employeeName: r.employeeName, typeName: r.typeName, year: r.year, granted, used, remaining: granted + adjusted - used }
    })
    const pend = await db
      .select({ id: leaveRequests.id })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(and(eq(employees.companyId, user.companyId), eq(leaveRequests.status, 'PENDING')))
    pendingCount = pend.length
  } catch (err) {
    console.error('[db] hr/leave load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">휴가 관리 (HR)</h1>
          <div className="h-sub">회사 전체 휴가 잔여 현황을 관리해요</div>
        </div>
        <Link href="/leave/requests" className="btn btn-primary">
          승인 대기 {pendingCount > 0 ? `(${pendingCount})` : ''}
        </Link>
      </div>

      <div className="sec-divider">휴가 잔여<span className="ct">{balances.length}</span><span className="line" /></div>
      {balances.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>휴가 잔여 데이터가 없어요.</span>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>구성원</th><th>휴가 종류</th><th style={{ width: 70 }}>연도</th><th style={{ width: 90, textAlign: 'right' }}>부여</th><th style={{ width: 90, textAlign: 'right' }}>사용</th><th style={{ width: 90, textAlign: 'right' }}>잔여</th></tr>
          </thead>
          <tbody>
            {balances.map((b, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{b.employeeName ?? '—'}</td>
                <td>{b.typeName ?? '—'}</td>
                <td><span className="sn">{b.year ?? '—'}</span></td>
                <td style={{ textAlign: 'right' }}><span className="sn">{b.granted}</span></td>
                <td style={{ textAlign: 'right' }}><span className="sn">{b.used}</span></td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: b.remaining <= 0 ? 'var(--destructive)' : 'var(--fg)' }}>{b.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
