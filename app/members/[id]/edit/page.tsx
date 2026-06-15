import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments, positions } from '@/lib/db/schema'
import { updateEmployee } from '../../actions'

// 구성원 수정 폼 — 현재값 미리채움, updateEmployee Server Action 으로 제출.
export const dynamic = 'force-dynamic'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await getDb()
    .select({
      id: employees.id,
      name: employees.name,
      companyEmail: employees.companyEmail,
      departmentName: departments.name,
      positionName: positions.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.id, id))
    .limit(1)
  if (!rows.length) notFound()
  const e = rows[0]

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href={`/members/${id}`} className="h-sub" style={{ textDecoration: 'none' }}>← 프로필</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>구성원 수정</h1>
          <div className="h-sub">{e.name} 님의 정보를 수정해요</div>
        </div>
      </div>

      <form action={updateEmployee} className="apply-card">
        <input type="hidden" name="id" value={id} />
        <div className="form-grid">
          <div className="fg-field">
            <label>이름 *</label>
            <input name="name" required defaultValue={e.name} className="ctl-in" />
          </div>
          <div className="fg-field">
            <label>이메일</label>
            <input name="email" type="email" defaultValue={e.companyEmail ?? ''} className="ctl-in" />
          </div>
          <div className="fg-field">
            <label>부서</label>
            <input name="department" defaultValue={e.departmentName ?? ''} className="ctl-in" placeholder="부서명" />
          </div>
          <div className="fg-field">
            <label>직책</label>
            <input name="position" defaultValue={e.positionName ?? ''} className="ctl-in" placeholder="직책명" />
          </div>
        </div>
        <div className="apply-actions">
          <Link href={`/members/${id}`} className="btn btn-outline">취소</Link>
          <button type="submit" className="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  )
}
