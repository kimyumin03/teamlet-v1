import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateIssues, employees } from '@/lib/db/schema'

// 증명서 상세 — 발급된 증명서 1건. 원본 teamlet 의 /documents/certificates/[id].
export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = { EMPLOYMENT: '재직증명서', CAREER: '경력증명서' }

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await getDb()
    .select({ id: certificateIssues.id, employeeName: employees.name, type: certificateIssues.type, issueNumber: certificateIssues.issueNumber, purpose: certificateIssues.purpose, createdAt: certificateIssues.createdAt })
    .from(certificateIssues)
    .leftJoin(employees, eq(certificateIssues.employeeId, employees.id))
    .where(eq(certificateIssues.id, id))
    .limit(1)
  if (!rows.length) notFound()
  const c = rows[0]

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="pf-field"><div className="lbl">{label}</div><div className="val">{value}</div></div>
  )

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/documents/certificates" className="h-sub" style={{ textDecoration: 'none' }}>← 증명서</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>{TYPE_LABEL[c.type] ?? c.type}</h1>
          <div className="h-sub">{c.issueNumber}</div>
        </div>
      </div>

      <div className="accordion" style={{ marginBottom: 0 }}>
        <div className="accordion-b open">
          <div className="pf-grid">
            <Field label="증명서 번호" value={c.issueNumber} />
            <Field label="종류" value={TYPE_LABEL[c.type] ?? c.type} />
            <Field label="대상 직원" value={c.employeeName ?? '—'} />
            <Field label="발급 목적" value={c.purpose} />
            <Field label="발급일" value={c.createdAt ? new Date(c.createdAt).toLocaleString('ko-KR') : '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}
