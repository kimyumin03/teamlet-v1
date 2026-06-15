import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { formDocuments, approvalLines, approvalActions, documentCcRecipients, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { ApproveDocumentButtons } from '@/components/workflow/approve-document-buttons'

// 결재 문서 상세 — 원본 teamlet 그대로. 내가 결재할 차례면 승인/반려 버튼 노출.
export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = { GENERAL: '일반', LEAVE_REQUEST: '휴가', LEAVE_PLAN: '연차 사용 계획', INFO_CHANGE: '정보변경', ANNOUNCEMENT: '공지' }
const KIND_CLS: Record<string, string> = {
  GENERAL: 'border-border bg-background-secondary text-foreground-muted',
  LEAVE_REQUEST: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  LEAVE_PLAN: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  INFO_CHANGE: 'border-destructive bg-destructive-50 text-destructive',
  ANNOUNCEMENT: 'border-primary/30 bg-primary/5 text-foreground',
}
const STATUS_LABEL: Record<string, string> = { DRAFT: '임시저장', IN_PROGRESS: '진행중', APPROVED: '승인완료', REJECTED: '반려', CANCELLED: '취소' }
const STATUS_CLS: Record<string, string> = {
  DRAFT: 'border-border bg-background-secondary text-foreground-subtle',
  IN_PROGRESS: 'border-amber-300 bg-amber-50 text-amber-700',
  APPROVED: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-destructive bg-destructive-50 text-destructive',
  CANCELLED: 'border-border bg-background-secondary text-foreground-subtle',
}

function ApprovalStepIcon({ status }: { status: string | null }) {
  if (status === 'APPROVED')
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-background-primary">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
      </span>
    )
  if (status === 'REJECTED')
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-white">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </span>
    )
  if (status === 'PENDING')
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-amber-600">
          <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8.75 4.75a.75.75 0 0 0-1.5 0v3.5c0 .414.336.75.75.75h2.25a.75.75 0 0 0 0-1.5h-1.5v-2.75Z" clipRule="evenodd" />
        </svg>
      </span>
    )
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background-secondary">
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-foreground-subtle">
        <circle cx="8" cy="8" r="3.5" />
      </svg>
    </span>
  )
}

function formatDateTime(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const LEAVE_LABEL: Record<string, string> = { leaveTypeName: '휴가 종류', startDate: '시작일', endDate: '종료일', days: '사용 일수', reason: '사유', evidenceFileUrl: '증명 자료' }

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const docRows = await db
    .select({
      id: formDocuments.id,
      kind: formDocuments.kind,
      status: formDocuments.status,
      title: formDocuments.title,
      authorName: employees.name,
      createdAt: formDocuments.createdAt,
      formData: formDocuments.formData,
    })
    .from(formDocuments)
    .leftJoin(employees, eq(formDocuments.authorId, employees.id))
    .where(eq(formDocuments.id, id))
    .limit(1)
  if (!docRows.length) notFound()
  const d = docRows[0]
  const formData = (d.formData ?? {}) as Record<string, unknown>

  const lines = await db
    .select({ id: approvalLines.id, step: approvalLines.step, approverId: approvalLines.approverId, approverName: employees.name, status: approvalLines.status, approvedAt: approvalLines.approvedAt })
    .from(approvalLines)
    .leftJoin(employees, eq(approvalLines.approverId, employees.id))
    .where(eq(approvalLines.documentId, id))
    .orderBy(asc(approvalLines.step))

  // 현재 사용자가 결재할 차례인 라인 (진행중 + 첫 PENDING 단계 + 본인)
  const user = await getCurrentUser()
  let myActionableLineId: string | null = null
  if (d.status === 'IN_PROGRESS') {
    const firstPending = lines.find((l) => l.status === 'PENDING')
    if (firstPending && firstPending.approverId === user.employeeId) myActionableLineId = firstPending.id
  }

  const lineIds = lines.map((l) => l.id)
  const actions = lineIds.length
    ? await db.select({ id: approvalActions.id, lineId: approvalActions.lineId, comment: approvalActions.comment }).from(approvalActions).where(inArray(approvalActions.lineId, lineIds))
    : []
  const actionsByLine = new Map<string, { id: string; comment: string | null }[]>()
  for (const a of actions) {
    const arr = actionsByLine.get(a.lineId) ?? []
    arr.push({ id: a.id, comment: a.comment })
    actionsByLine.set(a.lineId, arr)
  }

  const cc = await db
    .select({ employeeId: documentCcRecipients.employeeId, name: employees.name })
    .from(documentCcRecipients)
    .leftJoin(employees, eq(documentCcRecipients.employeeId, employees.id))
    .where(eq(documentCcRecipients.documentId, id))

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-7 pb-3">
        <Link href="/workflow" className="mb-3 inline-flex items-center gap-1 text-[12px] text-foreground-subtle hover:text-foreground transition-colors">
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
            <path fillRule="evenodd" d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
          </svg>
          결재 목록
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-semibold ${KIND_CLS[d.kind ?? ''] ?? KIND_CLS.GENERAL}`}>{KIND_LABEL[d.kind ?? ''] ?? d.kind}</span>
          <span className={`rounded-[5px] border px-2 py-0.5 font-mono text-[11px] font-semibold ${STATUS_CLS[d.status ?? ''] ?? STATUS_CLS.DRAFT}`}>{STATUS_LABEL[d.status ?? ''] ?? d.status}</span>
          {myActionableLineId && (
            <span className="ml-auto">
              <ApproveDocumentButtons lineId={myActionableLineId} />
            </span>
          )}
        </div>
        <h1 className="h-title">{d.title}</h1>
        <p className="h-sub mt-1.5">{d.authorName ?? '—'} · {formatDateTime(d.createdAt)}</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_300px]">
          <section>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-foreground-muted">문서 내용</p>
            <div className="rounded-[14px] border border-border bg-background-primary p-5">
              {Object.keys(formData).length === 0 ? (
                <p className="text-[13px] text-foreground-subtle">내용 없음</p>
              ) : (
                <dl className="flex flex-col gap-4">
                  {Object.entries(formData).map(([k, v]) => {
                    if (k === 'leaveTypeId') return null
                    if (k === 'evidenceFileUrl' && typeof v === 'string') {
                      const fileName = v.split('/').pop() ?? '첨부파일'
                      return (
                        <div key={k}>
                          <dt className="mb-0.5 text-[11.5px] text-foreground-subtle">{LEAVE_LABEL[k] ?? k}</dt>
                          <dd>
                            <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline">📎 {fileName}</a>
                          </dd>
                        </div>
                      )
                    }
                    return (
                      <div key={k}>
                        <dt className="mb-0.5 text-[11.5px] text-foreground-subtle">{LEAVE_LABEL[k] ?? k}</dt>
                        <dd className="text-[13px] text-foreground whitespace-pre-wrap">{String(v)}</dd>
                      </div>
                    )
                  })}
                </dl>
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <div>
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-foreground-muted">결재선</p>
              <ol className="flex flex-col">
                {lines.map((line, idx) => {
                  const isLast = idx === lines.length - 1
                  const isPending = line.status === 'PENDING'
                  const isApproved = line.status === 'APPROVED'
                  const isRejected = line.status === 'REJECTED'
                  const lineActions = actionsByLine.get(line.id) ?? []
                  return (
                    <li key={line.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <ApprovalStepIcon status={line.status} />
                        {!isLast && <div className={`my-1 w-px flex-1 ${isApproved ? 'bg-foreground' : 'bg-border'}`} style={{ minHeight: '24px' }} />}
                      </div>
                      <div className="min-w-0 flex-1 pb-5">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className={`text-[13.5px] font-semibold ${isPending ? 'text-amber-700' : isRejected ? 'text-destructive' : 'text-foreground'}`}>{line.approverName ?? '—'}</span>
                          <span className="font-mono text-[11px] text-foreground-subtle">{line.step}단계</span>
                        </div>
                        {isPending && <p className="text-[12px] text-amber-600">대기 중</p>}
                        {line.approvedAt && <p className="font-mono text-[11.5px] text-foreground-subtle">{formatDateTime(line.approvedAt)}</p>}
                        {lineActions.map((a) => (
                          <div key={a.id} className="mt-1.5">
                            {a.comment && <p className="rounded-[8px] border border-border bg-background-secondary px-3 py-2 text-[12px] text-foreground-muted">&quot;{a.comment}&quot;</p>}
                          </div>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>

            {cc.length > 0 && (
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-foreground-muted">참조</p>
                <div className="flex flex-wrap gap-1.5">
                  {cc.map((c) => (
                    <span key={c.employeeId} className="rounded-full border border-border bg-background-secondary px-2.5 py-0.5 text-[12px] text-foreground-muted">{c.name ?? '—'}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
