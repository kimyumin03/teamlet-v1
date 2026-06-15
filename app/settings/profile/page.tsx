import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { updateProfile } from './actions'

// 내 프로필 — 로그인 사용자 정보 보기 + 이름/연락처 수정.
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser()
  let emp: { name: string; companyEmail: string | null; phone: string | null; departmentName: string | null; positionName: string | null } = {
    name: user.name,
    companyEmail: null,
    phone: null,
    departmentName: null,
    positionName: null,
  }
  try {
    const rows = await getDb()
      .select({ name: employees.name, companyEmail: employees.companyEmail, phone: employees.phone, departmentName: departments.name, positionName: positions.name })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(eq(employees.id, user.employeeId))
      .limit(1)
    if (rows[0]) emp = rows[0]
  } catch (err) {
    console.error('[db] profile load 실패', err)
  }

  const initials = (emp.name || '?').slice(-2)

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>내 프로필</h1>
          <div className="h-sub">기본 정보와 연락처를 관리해요</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-primary)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, background: 'var(--primary)', color: 'var(--primary-on)' }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{emp.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {[emp.departmentName, emp.positionName].filter(Boolean).join(' · ') || '소속 미지정'}
          </div>
        </div>
      </div>

      <form action={updateProfile} className="apply-card">
        <h3>기본 정보</h3>
        <div className="form-grid">
          <div className="fg-field">
            <label>이름 *</label>
            <input name="name" required defaultValue={emp.name} className="ctl-in" />
          </div>
          <div className="fg-field">
            <label>연락처</label>
            <input name="phone" defaultValue={emp.phone ?? ''} className="ctl-in" placeholder="010-0000-0000" />
          </div>
          <div className="fg-field">
            <label>회사 이메일</label>
            <input value={emp.companyEmail ?? '—'} disabled className="ctl-in" style={{ opacity: 0.6 }} />
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/settings" className="btn btn-outline">취소</Link>
          <button type="submit" className="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  )
}
