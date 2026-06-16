import Link from 'next/link'
import { and, asc, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateIssues, certificateTemplates, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { IssueCertificateButton } from '@/components/document/issue-certificate-button'
import type { CertificateTemplateItem } from '@/lib/modules/document'

// 증명서 발급 — 발급 모달(템플릿 기반) + 발급 이력. 원본 teamlet 의 /documents/certificates.
export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = { EMPLOYMENT: '재직증명서', CAREER: '경력증명서' }
const TYPE_TAG: Record<string, string> = { EMPLOYMENT: 'tag ok', CAREER: 'tag wfh' }

export default async function CertificatesPage() {
  const user = await getCurrentUser()
  const canManage = await hasPermission(user.employeeId, 'document.certificate.manage')

  let issued: { id: string; employeeName: string | null; type: string; issueNumber: string; createdAt: Date | null }[] = []
  let people: { id: string; name: string }[] = []
  let templates: CertificateTemplateItem[] = []
  try {
    const db = getDb()
    issued = await db
      .select({ id: certificateIssues.id, employeeName: employees.name, type: certificateIssues.type, issueNumber: certificateIssues.issueNumber, createdAt: certificateIssues.createdAt })
      .from(certificateIssues)
      .innerJoin(employees, eq(certificateIssues.employeeId, employees.id))
      .where(eq(employees.companyId, user.companyId))
      .orderBy(desc(certificateIssues.createdAt))

    // 관리자만 타인 발급 가능 — 직원 목록을 모달에 넘겨요. 일반 직원은 본인만.
    people = canManage
      ? await db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.companyId, user.companyId)).orderBy(asc(employees.name))
      : [{ id: user.employeeId, name: user.name }]

    const tplRows = await db
      .select({ id: certificateTemplates.id, name: certificateTemplates.name, certType: certificateTemplates.certType })
      .from(certificateTemplates)
      .where(and(eq(certificateTemplates.companyId, user.companyId), eq(certificateTemplates.isActive, true)))
      .orderBy(asc(certificateTemplates.createdAt))
    templates = tplRows.map((t) => ({ id: t.id, name: t.name, certType: (t.certType ?? 'EMPLOYMENT') as CertificateTemplateItem['certType'], fileUrl: '' }))
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canManage && <Link href="/documents/certificates/settings" className="btn btn-outline">종류 설정</Link>}
          <IssueCertificateButton employees={people} selfEmployeeId={user.employeeId} templates={templates} />
        </div>
      </div>

      {canManage && templates.length === 0 && (
        <div style={{
          margin: '0 0 16px', padding: '12px 16px', borderRadius: 10,
          background: 'var(--bg-warn, #fffbeb)', border: '1px solid var(--border-warn, #fde68a)',
          fontSize: '13px', color: 'var(--fg-warn, #92400e)',
        }}>
          아직 등록된 증명서 종류가 없어요.{' '}
          <Link href="/documents/certificates/settings" style={{ fontWeight: 600, color: 'inherit' }}>종류 설정</Link>
          에서 먼저 증명서 종류를 추가해주세요.
        </div>
      )}

      <div className="sec-divider">발급 이력<span className="ct">{issued.length}</span><span className="line" /></div>
      {issued.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>발급된 증명서가 없어요. 발급 신청 버튼을 눌러 첫 증명서를 발급해 보세요.</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>증명서 번호</th><th>대상</th><th style={{ width: 120 }}>종류</th><th style={{ width: 110 }}>발급일</th><th /></tr></thead>
          <tbody>
            {issued.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/documents/certificates/${c.id}`} style={{ fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}>{c.issueNumber}</Link></td>
                <td>{c.employeeName ?? '—'}</td>
                <td><span className={TYPE_TAG[c.type] ?? 'tag'}>{TYPE_LABEL[c.type] ?? c.type}</span></td>
                <td><span className="sn">{c.createdAt ? c.createdAt.toLocaleDateString('ko-KR') : '—'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <Link href={`/documents/certificates/${c.id}`} className="btn btn-outline sm">인쇄</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
