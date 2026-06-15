import Link from 'next/link'
import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { departments, positions, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { addDepartment, addPosition } from './actions'

// 조직 · 직책 — 실데이터 목록 + 추가(쓰기). 원본 teamlet 의 설정/조직을 v1 기능형으로.
export const dynamic = 'force-dynamic'

export default async function OrgSettingsPage() {
  const user = await getCurrentUser()
  let depts: { id: string; name: string }[] = []
  let posList: { id: string; name: string }[] = []
  const deptCount = new Map<string, number>()
  try {
    const db = getDb()
    depts = await db.select({ id: departments.id, name: departments.name }).from(departments).where(and(eq(departments.companyId, user.companyId), eq(departments.isActive, true))).orderBy(asc(departments.sortOrder))
    posList = await db.select({ id: positions.id, name: positions.name }).from(positions).where(and(eq(positions.companyId, user.companyId), eq(positions.isActive, true))).orderBy(asc(positions.sortOrder))
    const emps = await db.select({ departmentId: employees.departmentId }).from(employees).where(eq(employees.companyId, user.companyId))
    for (const e of emps) if (e.departmentId) deptCount.set(e.departmentId, (deptCount.get(e.departmentId) ?? 0) + 1)
  } catch (err) {
    console.error('[db] settings/org load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>조직 · 직책</h1>
          <div className="h-sub">부서 구조와 직책을 관리해요.</div>
        </div>
      </div>

      {/* 부서 */}
      <div className="sec-divider">부서<span className="ct">{depts.length}</span><span className="line" /></div>
      <table className="tbl" style={{ marginBottom: 12 }}>
        <thead><tr><th>부서명</th><th style={{ width: 90, textAlign: 'right' }}>인원</th></tr></thead>
        <tbody>
          {depts.length === 0 ? (
            <tr><td colSpan={2} style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 부서가 없어요.</td></tr>
          ) : (
            depts.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td style={{ textAlign: 'right' }}><span className="sn">{deptCount.get(d.id) ?? 0}명</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <form action={addDepartment} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input name="name" required placeholder="새 부서명" className="ctl-in" style={{ maxWidth: 240 }} />
        <button type="submit" className="btn btn-primary">부서 추가</button>
      </form>

      {/* 직책 */}
      <div className="sec-divider">직책<span className="ct">{posList.length}</span><span className="line" /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {posList.length === 0 ? (
          <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 직책이 없어요.</span>
        ) : (
          posList.map((p) => <span key={p.id} className="tag">{p.name}</span>)
        )}
      </div>
      <form action={addPosition} style={{ display: 'flex', gap: 8 }}>
        <input name="name" required placeholder="새 직책명" className="ctl-in" style={{ maxWidth: 240 }} />
        <button type="submit" className="btn btn-primary">직책 추가</button>
      </form>
    </div>
  )
}
