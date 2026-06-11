import Link from 'next/link'
import { AxHubError, where } from '@ax-hub/sdk'
import { isAxhubConfigured, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

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

async function load(): Promise<Approval[]> {
  if (!isAxhubConfigured()) return []
  try {
    const t = await table<Approval>('approvals')
    const page = await t.list({ where: where('company_id').eq(TENANT), limit: 200 })
    return page.items ?? []
  } catch (err) {
    if (err instanceof AxHubError) console.error('[axhub] approvals', { code: err.code })
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
