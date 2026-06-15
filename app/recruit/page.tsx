import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { jobPostings, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 채용 — 공고 목록. 원본 teamlet 그대로 (읽기 전용; 공고 만들기는 쓰기 보류).
export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = { DRAFT: '초안', OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소' }
const STATUS_CLS: Record<string, string> = {
  DRAFT: 'border-border bg-background-secondary text-foreground-subtle',
  OPEN: 'border-amber-300 bg-amber-50 text-amber-700',
  CLOSED: 'border-border bg-background-secondary text-foreground-muted',
  CANCELLED: 'border-border bg-background-secondary text-foreground-subtle',
}
const STATUS_TABS = [
  { key: '', label: '전체' },
  { key: 'OPEN', label: '진행중' },
  { key: 'DRAFT', label: '초안' },
  { key: 'CLOSED', label: '마감' },
] as const

export default async function RecruitPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusFilter = '' } = await searchParams
  const user = await getCurrentUser()

  let all: { id: string; title: string; managerName: string | null; status: string }[] = []
  try {
    const db = getDb()
    const rows = await db
      .select({ id: jobPostings.id, title: jobPostings.title, managerName: employees.name, status: jobPostings.status })
      .from(jobPostings)
      .leftJoin(employees, eq(jobPostings.managerId, employees.id))
      .where(eq(jobPostings.companyId, user.companyId))
      .orderBy(desc(jobPostings.createdAt))
    all = rows.map((r) => ({ id: r.id, title: r.title, managerName: r.managerName, status: r.status ?? 'DRAFT' }))
  } catch (err) {
    console.error('[db] recruit load 실패', err)
  }
  const postings = statusFilter ? all.filter((p) => p.status === statusFilter) : all

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-7 pb-3">
        <div className="page-h" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="h-title">채용</h1>
            <p className="h-sub mt-1.5">
              공고 {all.length}건{statusFilter && ` · 필터: ${STATUS_LABEL[statusFilter] ?? statusFilter}`}
            </p>
          </div>
          <Link href="/recruit/new" className="btn btn-primary">공고 만들기</Link>
        </div>
      </div>

      <div className="shrink-0 border-b border-border px-8">
        <nav className="flex gap-0">
          {STATUS_TABS.map((tab) => {
            const count = tab.key ? all.filter((p) => p.status === tab.key).length : all.length
            const isActive = statusFilter === tab.key
            return (
              <Link
                key={tab.key}
                href={tab.key ? `/recruit?status=${tab.key}` : '/recruit'}
                className={`flex items-center gap-1.5 border-b-2 -mb-px px-4 py-2.5 text-sm font-medium transition-colors ${isActive ? 'border-foreground text-foreground' : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'}`}
              >
                {tab.label}
                <span className="rounded-full bg-background-secondary px-1.5 font-mono text-[10.5px] font-bold text-foreground">{count}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {postings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <p className="text-[14px] font-medium text-foreground">등록된 공고가 없어요</p>
            <p className="text-[12.5px] text-foreground-muted">아직 등록된 채용 공고가 없어요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {postings.map((p) => (
              <Link
                key={p.id}
                href={`/recruit/postings/${p.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[14px] border border-border bg-background-primary px-5 py-4 transition-colors hover:bg-background-secondary"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground truncate">{p.title}</p>
                  <p className="mt-0.5 text-[12px] text-foreground-muted">{p.managerName ?? '—'}</p>
                </div>
                <span className={`rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-semibold ${STATUS_CLS[p.status] ?? STATUS_CLS.DRAFT}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
