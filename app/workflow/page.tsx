import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { formDocuments, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

export const dynamic = 'force-dynamic'

type Approval = {
  id: string
  doc_kind: string
  doc_no: string
  title: string
  requester_name: string
  requester_email: string
  amount: string
  status: string
  step: string
  created_at: string
}

const KIND: Record<string, { label: string; cls: string }> = {
  leave: { label: '휴가', cls: 'leave' },
  expense: { label: '경비', cls: 'expense' },
  training: { label: '교육', cls: 'training' },
  wfh: { label: '재택', cls: 'wfh' },
  hr: { label: '인사', cls: 'hr' },
}

// ✅ 자체 DB(Neon)의 실제 결재 문서(form_documents)를 읽어와요.
const KIND_FROM_REAL: Record<string, string> = { LEAVE_REQUEST: 'leave', LEAVE_PLAN: 'leave' }
const STATUS_KO: Record<string, string> = {
  DRAFT: '작성중', IN_PROGRESS: '진행', APPROVED: '승인', REJECTED: '반려', CANCELLED: '취소',
}

async function load(): Promise<Approval[]> {
  const user = getCurrentUser()
  try {
    const db = getDb()
    const rows = await db
      .select({
        id: formDocuments.id,
        title: formDocuments.title,
        kind: formDocuments.kind,
        status: formDocuments.status,
        requester_name: employees.name,
        created_at: formDocuments.createdAt,
      })
      .from(formDocuments)
      .leftJoin(employees, eq(formDocuments.authorId, employees.id))
      .where(eq(formDocuments.companyId, user.companyId))
      .orderBy(desc(formDocuments.createdAt))
    return rows.map((r) => ({
      id: r.id,
      doc_kind: KIND_FROM_REAL[r.kind ?? ''] ?? '',
      doc_no: r.id.slice(-6).toUpperCase(),
      title: r.title,
      requester_name: r.requester_name ?? '',
      requester_email: '',
      amount: '',
      status: STATUS_KO[r.status ?? ''] ?? (r.status ?? ''),
      step: '',
      created_at: (r.created_at ?? new Date()).toISOString(),
    }))
  } catch (err) {
    console.error('[db] workflow load 실패', err)
    return []
  }
}

function Aline({ status }: { status: string }) {
  // 기안 → 결재 → 완료. status 로 단계 표시.
  const drafted = true
  const reviewing = status === '대기' || status === '진행'
  const approved = status === '승인'
  const rejected = status === '반려'
  return (
    <div className="aline">
      <div className="step done">기안</div>
      <span className="arr">›</span>
      <div className={`step${reviewing ? ' now' : drafted && (approved || rejected) ? ' done' : ''}${rejected ? ' rej' : ''}`}>
        결재
      </div>
      <span className="arr">›</span>
      <div className={`step${approved ? ' done' : rejected ? ' rej' : ''}`}>완료</div>
    </div>
  )
}

function dueClass(status: string) {
  if (status === '승인') return 'doc-due ok'
  if (status === '반려') return 'doc-due rej'
  if (status === '대기') return 'doc-due urg'
  return 'doc-due soon'
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filter = 'all' } = await searchParams
  const docs = await load()

  const pending = docs.filter((d) => d.status === '대기' || d.status === '진행')
  const now = new Date()
  const doneThisMonth = docs.filter(
    (d) =>
      (d.status === '승인' || d.status === '반려') &&
      new Date(d.created_at).getMonth() === now.getMonth(),
  )

  const sorted = [...docs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const shown =
    filter === 'active'
      ? sorted.filter((d) => d.status === '대기' || d.status === '진행')
      : filter === 'done'
        ? sorted.filter((d) => d.status === '승인' || d.status === '반려')
        : sorted

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">워크플로우</h1>
          <div className="h-sub">진행 중 결재 {pending.length}건 · 전체 {docs.length}건</div>
        </div>
      </div>

      <div className="kpis">
        <div className={`kpi${pending.length > 0 ? ' cta' : ''}`}>
          <span className="lbl">결재 대기</span>
          <span className="val num">
            {pending.length}
            <small>건</small>
          </span>
          <span className="delta">{pending.length > 0 ? '처리 필요' : '처리할 결재 없음'}</span>
        </div>
        <div className="kpi">
          <span className="lbl">이번달 처리</span>
          <span className="val num">
            {doneThisMonth.length}
            <small>건</small>
          </span>
          <span className="delta">
            승인 {doneThisMonth.filter((d) => d.status === '승인').length} · 반려{' '}
            {doneThisMonth.filter((d) => d.status === '반려').length}
          </span>
        </div>
        <div className="kpi">
          <span className="lbl">전체 문서</span>
          <span className="val num">
            {docs.length}
            <small>건</small>
          </span>
          <span className="delta">회사 결재 문서</span>
        </div>
        <div className="kpi">
          <span className="lbl">승인율</span>
          <span className="val num">
            {docs.length > 0
              ? Math.round((docs.filter((d) => d.status === '승인').length / docs.length) * 100)
              : 0}
            <small>%</small>
          </span>
          <span className="delta">전체 기준</span>
        </div>
      </div>

      {/* 상태 필터 탭 */}
      <div className="tabs">
        <Link href="/workflow" className={`tab${filter === 'all' ? ' active' : ''}`}>
          전체<span className="count">{docs.length}</span>
        </Link>
        <Link href="/workflow?status=active" className={`tab${filter === 'active' ? ' active' : ''}`}>
          진행 중<span className="count">{pending.length}</span>
        </Link>
        <Link href="/workflow?status=done" className={`tab${filter === 'done' ? ' active' : ''}`}>
          완료
          <span className="count">{docs.length - pending.length}</span>
        </Link>
      </div>

      {/* 문서 목록 */}
      {shown.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 14,
            padding: '48px 20px',
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontSize: 13,
          }}
        >
          해당 문서가 없어요.
        </div>
      ) : (
        shown.map((d) => {
          const kind = KIND[d.doc_kind] ?? { label: '문서', cls: '' }
          return (
            <div key={d.id} className={`doc${d.status === '대기' ? ' urg' : ''}`}>
              <div className="doc-kind">
                <span className={`k ${kind.cls}`}>{kind.label}</span>
                <span className="d">{d.doc_no}</span>
              </div>
              <div className="doc-body">
                <div className="t">{d.title}</div>
                <div className="m">
                  <span className="who">
                    <span className="av-mini">{d.requester_name?.slice(-2)}</span>
                    {d.requester_name}
                  </span>
                  <span className="sep">·</span>
                  <span>{fmt(d.created_at)}</span>
                  {d.amount && (
                    <>
                      <span className="sep">·</span>
                      <span className="amt">{d.amount}</span>
                    </>
                  )}
                </div>
                <Aline status={d.status} />
              </div>
              <div className="doc-actions">
                <span className={dueClass(d.status)}>{d.status}</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
