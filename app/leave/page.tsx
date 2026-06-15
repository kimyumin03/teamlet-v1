import Link from 'next/link'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveRequests, leaveTypes } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

export const dynamic = 'force-dynamic'

type LeaveRow = {
  id: string
  employee_email: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  status: string
}

const ANNUAL_GRANTED = 15 // 연차 부여(MVP 고정 — 추후 정책 엔진 이식)

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}
function stCls(status: string) {
  if (status === '승인') return 'st ok'
  if (status === '대기') return 'st wait'
  if (status === '반려') return 'st rej'
  return 'st end'
}

// ✅ 기존 teamlet DB(실제 leave_requests)에서 데모 직원의 휴가를 읽어와요.
//    leave_types 와 조인해 한국어 종류명을, status(영어 enum)는 한국어로 변환해요.
const STATUS_KO: Record<string, string> = {
  DRAFT: '작성중',
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
  CANCEL_PENDING: '취소대기',
}

async function load(): Promise<{ requests: LeaveRow[] }> {
  const user = getCurrentUser()
  try {
    const rows = await getDb()
      .select({
        id: leaveRequests.id,
        typeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.employeeId, user.employeeId))
      .orderBy(desc(leaveRequests.createdAt))
    const requests: LeaveRow[] = rows.map((r) => ({
      id: r.id,
      employee_email: '',
      employee_name: user.name,
      leave_type: (r.typeName ?? '').replace(' 휴가', ''), // '경조사 휴가' → '경조사'
      start_date: r.startDate,
      end_date: r.endDate,
      days: Number(r.days),
      reason: r.reason ?? '',
      status: STATUS_KO[r.status] ?? r.status,
    }))
    return { requests }
  } catch (err) {
    console.error('[db] leave load 실패', err)
    return { requests: [] }
  }
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'history' ? 'history' : 'overview'
  const { requests } = await load()
  const year = new Date().getFullYear()

  const annualUsed = requests
    .filter((r) => r.leave_type === '연차' && r.status === '승인')
    .reduce((s, r) => s + (r.days || 0), 0)
  const pendingCount = requests.filter((r) => r.status === '대기').length
  const annualRemaining = Math.max(0, ANNUAL_GRANTED - annualUsed)
  const usedPct = ANNUAL_GRANTED > 0 ? Math.min(100, (annualUsed / ANNUAL_GRANTED) * 100) : 0
  const schPct =
    ANNUAL_GRANTED > 0 ? Math.min(100 - usedPct, (pendingCount / ANNUAL_GRANTED) * 100) : 0

  const sorted = [...requests].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
  )

  const TYPES = [
    { key: '연차', total: ANNUAL_GRANTED, used: annualUsed },
    { key: '병가', total: null as number | null, used: requests.filter((r) => r.leave_type === '병가' && r.status === '승인').reduce((s, r) => s + (r.days || 0), 0) },
    { key: '경조사', total: null as number | null, used: requests.filter((r) => r.leave_type === '경조사' && r.status === '승인').reduce((s, r) => s + (r.days || 0), 0) },
  ]

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">내 휴가</h1>
          <div className="h-sub">{year} 회계연도 · 1월 1일 ~ 12월 31일</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/leave?tab=history" className="btn btn-outline">
            사용 내역
          </Link>
          <Link href="/leave/new" className="btn btn-primary">
            휴가 신청
          </Link>
        </div>
      </div>

      {/* 히어로 — 잔여 연차 + 진행바 */}
      <div className="lv-hero">
        <div>
          <div className="l">잔여 연차 — {year}년</div>
          <div className="v num">
            {annualRemaining}
            <small>/ {ANNUAL_GRANTED}일</small>
          </div>
          <div className="d">
            올해 부여 <b>{ANNUAL_GRANTED}일</b> · 사용 <b>{annualUsed}일</b>
            {pendingCount > 0 && (
              <>
                {' '}
                · 대기 중 <b>{pendingCount}건</b>
              </>
            )}
          </div>
        </div>
        <div className="lv-hero-bar-wrap">
          <div className="lv-hero-bar">
            <i className="used" style={{ width: `${usedPct}%` }} />
            <i className="sch" style={{ width: `${schPct}%` }} />
          </div>
          <div className="lv-hero-legend">
            <span>
              <i className="u" />
              사용 {annualUsed}
            </span>
            {pendingCount > 0 && (
              <span>
                <i className="s" />
                대기 {pendingCount}
              </span>
            )}
            <span>
              <i className="r" />
              잔여 {annualRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="tabs">
        <Link href="/leave" className={`tab${activeTab === 'overview' ? ' active' : ''}`}>
          개요
        </Link>
        <Link href="/leave?tab=history" className={`tab${activeTab === 'history' ? ' active' : ''}`}>
          신청 이력
          {requests.length > 0 && <span className="count">{requests.length}</span>}
        </Link>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* 휴가 종류 카드 */}
          <div className="types-grid">
            {TYPES.map((t) => (
              <Link key={t.key} href="/leave/new" className="type" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="t">{t.key}</div>
                <div className="vt num">
                  {t.total != null ? Math.max(0, t.total - t.used) : t.used}
                  <small>{t.total != null ? `/ ${t.total}일` : '일 사용'}</small>
                </div>
                <div className="s">{t.total != null ? `사용 ${t.used}일` : '신청하기 →'}</div>
              </Link>
            ))}
          </div>

          {/* 최근 신청 */}
          {sorted.length > 0 && (
            <div className="breakdown" style={{ marginTop: 18 }}>
              <h3>
                예정된 / 최근 신청
                <span className="sub">{sorted.length}건</span>
              </h3>
              {sorted.slice(0, 3).map((r) => (
                <div key={r.id} className="hist-row">
                  <div className="date">
                    <b>{fmtDate(r.start_date)}</b>
                    {r.start_date !== r.end_date && ` ~ ${fmtDate(r.end_date)}`}
                  </div>
                  <div className="desc">
                    <div className="t">{r.leave_type}</div>
                    {r.reason && <div className="s">{r.reason}</div>}
                  </div>
                  <div className="dur">{r.days}일</div>
                  <div>
                    <span className={stCls(r.status)}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: 12,
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--fg-muted)',
                fontSize: 13,
              }}
            >
              신청 내역이 없어요.
            </div>
          ) : (
            sorted.map((r) => (
              <div key={r.id} className="hist-row">
                <div className="date">
                  <b>{fmtDate(r.start_date)}</b>
                  {r.start_date !== r.end_date && ` ~ ${fmtDate(r.end_date)}`}
                </div>
                <div className="desc">
                  <div className="t">{r.leave_type}</div>
                  {r.reason && <div className="s">{r.reason}</div>}
                </div>
                <div className="dur">{r.days}일</div>
                <div>
                  <span className={stCls(r.status)}>{r.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
