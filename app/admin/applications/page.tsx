import { desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companyApplications } from '@/lib/db/schema'

// 회사 등록 신청 심사 (admin) — 플랫폼 관리자용. 원본 teamlet 의 /admin/applications.
export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려', REVIEWING: '검토중' }

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default async function AdminApplicationsPage() {
  let list: { id: string; companyName: string | null; representativeName: string | null; contact: string | null; industry: string | null; status: string | null; createdAt: Date | null }[] = []
  try {
    list = await getDb()
      .select({ id: companyApplications.id, companyName: companyApplications.companyName, representativeName: companyApplications.representativeName, contact: companyApplications.contact, industry: companyApplications.industry, status: companyApplications.status, createdAt: companyApplications.createdAt })
      .from(companyApplications)
      .orderBy(desc(companyApplications.createdAt))
  } catch (err) {
    console.error('[db] admin applications load 실패', err)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">회사 등록 신청</h1>
      <p className="mt-1 text-sm text-foreground-muted">신규 회사 등록 신청 {list.length}건</p>

      {list.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-background-primary px-4 py-8 text-center text-sm text-foreground-muted">대기 중인 신청이 없어요.</p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background-secondary text-left text-xs text-foreground-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">회사명</th>
                <th className="px-4 py-2.5 font-medium">대표자</th>
                <th className="px-4 py-2.5 font-medium">연락처</th>
                <th className="px-4 py-2.5 font-medium">업종</th>
                <th className="px-4 py-2.5 font-medium">상태</th>
                <th className="px-4 py-2.5 font-medium">신청일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background-primary">
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{a.companyName ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground-muted">{a.representativeName ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground-muted">{a.contact ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground-muted">{a.industry ?? '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{STATUS_LABEL[a.status ?? ''] ?? a.status ?? '대기'}</span></td>
                  <td className="px-4 py-3 text-foreground-subtle">{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
