import Link from 'next/link'
import { asc, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateIssues, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { issueCertificate } from './actions'

// 증명서 발급 — 발급 폼 + 발급 이력. 원본 teamlet 의 /documents/certificates.
export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = { EMPLOYMENT: '재직증명서', CAREER: '경력증명서' }

export default async function CertificatesPage() {
  const user = await getCurrentUser()
  let issued: { id: string; employeeName: string | null; type: string; issueNumber: string; purpose: string; createdAt: Date | null }[] = []
  let people: { id: string; name: string }[] = []
  try {
    const db = getDb()
    issued = await db
      .select({ id: certificateIssues.id, employeeName: employees.name, type: certificateIssues.type, issueNumber: certificateIssues.issueNumber, purpose: certificateIssues.purpose, createdAt: certificateIssues.createdAt })
      .from(certificateIssues)
      .innerJoin(employees, eq(certificateIssues.employeeId, employees.id))
      .where(eq(employees.companyId, user.companyId))
      .orderBy(desc(certificateIssues.createdAt))
    people = await db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.companyId, user.companyId)).orderBy(asc(employees.name))
  } catch (err) {
    console.error('[db] certificates load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/documents" className="h-sub" style={{ textDecoration: 'none' }}>← 문서</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>증명서 발급</h1>
          <div className="h-sub">재직·경력 증명서를 발급해요</div>
        </div>
        <Link href="/documents/certificates/settings" className="btn btn-outline">템플릿 설정</Link>
      </div>

      {/* 발급 폼 */}
      <form action={issueCertificate} className="apply-card" style={{ marginBottom: 18 }}>
        <h3>새 증명서 발급</h3>
        <div className="form-grid">
          <div className="fg-field">
            <label>대상 직원 *</label>
            <select name="employeeId" required className="ctl-in" defaultValue="">
              <option value="" disabled>직원 선택</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="fg-field">
            <label>종류 *</label>
            <select name="type" className="ctl-in" defaultValue="EMPLOYMENT">
              <option value="EMPLOYMENT">재직증명서</option>
              <option value="CAREER">경력증명서</option>
            </select>
          </div>
          <div className="fg-field full">
            <label>발급 목적 *</label>
            <input name="purpose" required className="ctl-in" placeholder="예: 은행 제출용" />
          </div>
        </div>
        <div className="apply-actions">
          <button type="submit" className="btn btn-primary">발급</button>
        </div>
      </form>

      <div className="sec-divider">발급 이력<span className="ct">{issued.length}</span><span className="line" /></div>
      {issued.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>발급된 증명서가 없어요.</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>증명서 번호</th><th>대상</th><th style={{ width: 120 }}>종류</th><th>목적</th><th style={{ width: 110 }}>발급일</th></tr></thead>
          <tbody>
            {issued.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/documents/certificates/${c.id}`} style={{ fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}>{c.issueNumber}</Link></td>
                <td>{c.employeeName ?? '—'}</td>
                <td><span className="tag">{TYPE_LABEL[c.type] ?? c.type}</span></td>
                <td className="sn">{c.purpose}</td>
                <td><span className="sn">{c.createdAt ? c.createdAt.toLocaleDateString('ko-KR') : '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
