import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companies, departments, positions, leaveTypes, companyHolidays } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 설정 — 회사·조직 개요 (실데이터). 원본 teamlet 의 설정 영역을 v1 한 페이지로 요약.
// 세부 변경(부서/직책/정책/권한 추가·수정)은 쓰기·권한 이식 때 연결.
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  let company: { name: string; businessNumber: string | null; phone: string | null; addressRoad: string | null; addressDetail: string | null } | null = null
  let depts: { id: string; name: string }[] = []
  let posList: { id: string; name: string }[] = []
  let types: { id: string; name: string; key: string }[] = []
  let holidayCount = 0
  try {
    const db = getDb()
    const c = await db
      .select({ name: companies.name, businessNumber: companies.businessNumber, phone: companies.phone, addressRoad: companies.addressRoad, addressDetail: companies.addressDetail })
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1)
    company = c[0] ?? null
    depts = await db.select({ id: departments.id, name: departments.name }).from(departments).where(and(eq(departments.companyId, user.companyId), eq(departments.isActive, true)))
    posList = await db.select({ id: positions.id, name: positions.name }).from(positions).where(and(eq(positions.companyId, user.companyId), eq(positions.isActive, true)))
    types = await db.select({ id: leaveTypes.id, name: leaveTypes.name, key: leaveTypes.key }).from(leaveTypes).where(eq(leaveTypes.companyId, user.companyId))
    const hol = await db.select({ id: companyHolidays.id }).from(companyHolidays).where(eq(companyHolidays.companyId, user.companyId))
    holidayCount = hol.length
  } catch (err) {
    console.error('[db] settings load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">설정</h1>
          <div className="h-sub">회사 정보와 조직 구조를 확인해요</div>
        </div>
      </div>

      {/* 회사 정보 */}
      <div className="sec-divider">회사 정보<span className="line" /></div>
      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><span className="lbl">회사명</span><span className="val" style={{ fontSize: 18 }}>{company?.name ?? '—'}</span></div>
        <div className="kpi"><span className="lbl">사업자번호</span><span className="val" style={{ fontSize: 16 }}>{company?.businessNumber ?? '—'}</span></div>
        <div className="kpi"><span className="lbl">연락처</span><span className="val" style={{ fontSize: 16 }}>{company?.phone ?? '—'}</span></div>
        <div className="kpi"><span className="lbl">주소</span><span className="val" style={{ fontSize: 13 }}>{[company?.addressRoad, company?.addressDetail].filter(Boolean).join(' ') || '—'}</span></div>
      </div>

      {/* 조직 요약 */}
      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><span className="lbl">부서</span><span className="val">{depts.length}<small>개</small></span></div>
        <div className="kpi"><span className="lbl">직책</span><span className="val">{posList.length}<small>개</small></span></div>
        <div className="kpi"><span className="lbl">휴가 종류</span><span className="val">{types.length}<small>종</small></span></div>
        <div className="kpi"><span className="lbl">공휴일</span><span className="val">{holidayCount}<small>일</small></span></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <Link href="/settings/profile" className="btn btn-outline">내 프로필</Link>
        <Link href="/settings/company" className="btn btn-outline">회사 정보 수정</Link>
        <Link href="/settings/org" className="btn btn-outline">조직 관리</Link>
        <Link href="/settings/holidays" className="btn btn-outline">공휴일 관리</Link>
        <Link href="/settings/leave-types" className="btn btn-outline">휴가 종류</Link>
        <Link href="/settings/leave-policies" className="btn btn-outline">휴가 정책</Link>
        <Link href="/settings/permissions" className="btn btn-outline">권한</Link>
        <Link href="/settings/security" className="btn btn-outline">보안</Link>
        <Link href="/settings/approval-policies" className="btn btn-outline">결재 정책</Link>
        <Link href="/settings/notifications" className="btn btn-outline">알림</Link>
        <Link href="/settings/form-templates" className="btn btn-outline">양식</Link>
        <Link href="/settings/join-requests" className="btn btn-outline">가입 신청</Link>
      </div>

      {/* 부서 */}
      <div className="sec-divider">
        부서<span className="ct">{depts.length}</span>
        <Link href="/settings/org" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', marginLeft: 8 }}>조직 관리 →</Link>
        <span className="line" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {depts.length === 0 ? <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 부서가 없어요.</span> : depts.map((d) => <span key={d.id} className="tag">{d.name}</span>)}
      </div>

      {/* 직책 */}
      <div className="sec-divider">직책<span className="ct">{posList.length}</span><span className="line" /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {posList.length === 0 ? <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 직책이 없어요.</span> : posList.map((p) => <span key={p.id} className="tag">{p.name}</span>)}
      </div>

      {/* 휴가 종류 */}
      <div className="sec-divider">휴가 종류<span className="ct">{types.length}</span><span className="line" /></div>
      {types.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 휴가 종류가 없어요.</span>
      ) : (
        <table className="tbl">
          <thead><tr><th>이름</th><th>키</th></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}><td style={{ fontWeight: 600 }}>{t.name}</td><td><span className="sn">{t.key}</span></td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
