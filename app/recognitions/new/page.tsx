import Link from 'next/link'
import { and, asc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { sendRecognition } from '../actions'

// 인정 보내기 폼 — 동료 선택 + 메시지. sendRecognition Server Action.
export const dynamic = 'force-dynamic'

export default async function NewRecognitionPage() {
  const user = await getCurrentUser()
  let people: { id: string; name: string }[] = []
  try {
    people = await getDb()
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.companyId, user.companyId), ne(employees.id, user.employeeId)))
      .orderBy(asc(employees.name))
  } catch (err) {
    console.error('[db] recognitions/new load 실패', err)
  }

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/" className="h-sub" style={{ textDecoration: 'none' }}>← 홈</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>인정 보내기</h1>
          <div className="h-sub">동료에게 고마움·인정을 전해요</div>
        </div>
      </div>

      <form action={sendRecognition} className="apply-card">
        <div className="form-grid">
          <div className="fg-field">
            <label>받는 사람 *</label>
            <select name="recipientId" required className="ctl-in" defaultValue="">
              <option value="" disabled>동료 선택</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="fg-field full">
            <label>메시지 *</label>
            <textarea name="message" required rows={4} className="ctl-in" placeholder="고마운 마음을 전해보세요" />
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/" className="btn btn-outline">취소</Link>
          <button type="submit" className="btn btn-primary">보내기</button>
        </div>
      </form>
    </div>
  )
}
