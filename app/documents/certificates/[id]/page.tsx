import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateIssues, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { PrintButton } from './print-button'

// 증명서 인쇄 — 발급된 증명서 1건을 snapshotData 기반으로 인쇄 가능한 양식으로 보여줘요.
// 원본 teamlet 의 /documents/certificates/[id]. 같은 회사 + (본인 또는 발급자) 조회 허용.
export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = { EMPLOYMENT: '재직증명서', CAREER: '경력증명서' }

export default async function CertificatePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()

  const rows = await getDb()
    .select({
      id: certificateIssues.id,
      employeeId: certificateIssues.employeeId,
      issuerId: certificateIssues.issuerId,
      type: certificateIssues.type,
      issueNumber: certificateIssues.issueNumber,
      purpose: certificateIssues.purpose,
      snapshotData: certificateIssues.snapshotData,
      createdAt: certificateIssues.createdAt,
      issuerName: employees.name,
      companyId: employees.companyId,
    })
    .from(certificateIssues)
    .leftJoin(employees, eq(certificateIssues.issuerId, employees.id))
    .where(eq(certificateIssues.id, id))
    .limit(1)
  if (!rows.length) notFound()
  const cert = rows[0]

  // 같은 회사 소속 발급 건만 (cross-tenant 방지). 본인/발급자 조회 허용은 회사 스코프로 갈음.
  if (cert.companyId && cert.companyId !== user.companyId) notFound()

  const snap = (cert.snapshotData ?? {}) as Record<string, unknown>
  const hiredAt = snap.hiredAt ? new Date(snap.hiredAt as string).toLocaleDateString('ko-KR') : '-'
  const issuedAt = cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('ko-KR') : '-'

  return (
    <div className="min-h-screen bg-background-secondary px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl rounded-[14px] border border-border bg-background-primary p-10 print:border-none print:shadow-none">
        {/* 인쇄 버튼 */}
        <div className="mb-8 flex justify-end print:hidden">
          <PrintButton />
        </div>

        {/* 증명서 본문 */}
        <div className="space-y-8 text-foreground">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wide">{TYPE_LABEL[cert.type] ?? cert.type}</h1>
          </div>

          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr className="border border-border">
                <th className="w-1/3 bg-background-secondary px-4 py-3 text-left font-medium">성명</th>
                <td className="px-4 py-3">{String(snap.name ?? '-')}</td>
              </tr>
              <tr className="border border-border">
                <th className="bg-background-secondary px-4 py-3 text-left font-medium">소속 부서</th>
                <td className="px-4 py-3">{String(snap.departmentName ?? '-')}</td>
              </tr>
              <tr className="border border-border">
                <th className="bg-background-secondary px-4 py-3 text-left font-medium">직책</th>
                <td className="px-4 py-3">{String(snap.positionName ?? '-')}</td>
              </tr>
              <tr className="border border-border">
                <th className="bg-background-secondary px-4 py-3 text-left font-medium">입사일</th>
                <td className="px-4 py-3">{hiredAt}</td>
              </tr>
              <tr className="border border-border">
                <th className="bg-background-secondary px-4 py-3 text-left font-medium">재직 상태</th>
                <td className="px-4 py-3">{snap.isActive ? '재직중' : '퇴직'}</td>
              </tr>
              <tr className="border border-border">
                <th className="bg-background-secondary px-4 py-3 text-left font-medium">발급 목적</th>
                <td className="px-4 py-3">{cert.purpose}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-center text-[13px] text-foreground-muted">위 사실을 증명합니다.</p>

          <div className="text-center">
            <p className="text-[13px] text-foreground-muted">{issuedAt}</p>
          </div>

          <div className="mt-6 border-t border-border pt-6 text-center">
            <p className="text-[13px] font-medium text-foreground">Teamlet</p>
          </div>
        </div>

        {/* 발급 정보 */}
        <div className="mt-8 rounded-[14px] bg-background-secondary px-4 py-3 font-mono text-[11px] text-foreground-subtle print:hidden">
          발급번호: {cert.issueNumber} · 발급자: {cert.issuerName ?? '—'} · {issuedAt}
        </div>
      </div>
    </div>
  )
}
