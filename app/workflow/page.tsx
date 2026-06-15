import Link from 'next/link'
import { and, asc, desc, eq, inArray, lt, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { formDocuments, approvalLines, documentCcRecipients, employees, formTemplates } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import type {
  DocumentListItem,
  PendingApprovalItem,
  CcDocumentItem,
  FormDocumentKind,
  FormDocumentStatus,
  FormTemplateItem,
} from '@teamlet/modules/workflow'
import type { EmployeeListItem } from '@teamlet/modules/employee'
import { CreateDocumentButton } from '@/components/workflow/create-document-button'
import { WorkflowClient } from './_components/workflow-client'

export const dynamic = 'force-dynamic'

type EmpItem = Pick<EmployeeListItem, 'id' | 'name' | 'departmentName'>

function daysSince(d: Date) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

// 내가 기안한 문서 + 결재선 단계 집계
async function loadMyDocuments(employeeId: string): Promise<DocumentListItem[]> {
  const db = getDb()
  const docs = await db
    .select({
      id: formDocuments.id,
      title: formDocuments.title,
      kind: formDocuments.kind,
      status: formDocuments.status,
      authorName: employees.name,
      createdAt: formDocuments.createdAt,
    })
    .from(formDocuments)
    .leftJoin(employees, eq(formDocuments.authorId, employees.id))
    .where(eq(formDocuments.authorId, employeeId))
    .orderBy(desc(formDocuments.createdAt))
  if (!docs.length) return []
  const docIds = docs.map((d) => d.id)
  const lines = await db
    .select({ documentId: approvalLines.documentId, step: approvalLines.step, status: approvalLines.status })
    .from(approvalLines)
    .where(inArray(approvalLines.documentId, docIds))
  const byDoc = new Map<string, { step: number; status: string }[]>()
  for (const l of lines) {
    const arr = byDoc.get(l.documentId) ?? []
    arr.push({ step: l.step ?? 0, status: l.status ?? 'PENDING' })
    byDoc.set(l.documentId, arr)
  }
  return docs.map((d) => {
    const ls = (byDoc.get(d.id) ?? []).sort((a, b) => a.step - b.step)
    const pendingLine = ls.find((l) => l.status === 'PENDING')
    return {
      id: d.id,
      title: d.title,
      kind: (d.kind ?? 'GENERAL') as FormDocumentKind,
      status: (d.status ?? 'DRAFT') as FormDocumentStatus,
      authorName: d.authorName ?? '—',
      createdAt: d.createdAt ?? new Date(),
      currentStep: pendingLine?.step ?? null,
      totalSteps: ls.length,
    }
  })
}

// 내가 결재해야 할 대기 항목 — 진행 중 문서의 PENDING 결재선, 이전 단계 모두 승인된 것만
async function loadPendingApprovals(employeeId: string): Promise<PendingApprovalItem[]> {
  const db = getDb()
  const lines = await db
    .select({
      id: approvalLines.id,
      documentId: approvalLines.documentId,
      step: approvalLines.step,
      documentTitle: formDocuments.title,
      documentKind: formDocuments.kind,
      authorName: employees.name,
      createdAt: formDocuments.createdAt,
    })
    .from(approvalLines)
    .innerJoin(formDocuments, eq(approvalLines.documentId, formDocuments.id))
    .leftJoin(employees, eq(formDocuments.authorId, employees.id))
    .where(
      and(
        eq(approvalLines.approverId, employeeId),
        eq(approvalLines.status, 'PENDING'),
        eq(formDocuments.status, 'IN_PROGRESS'),
      ),
    )
  if (!lines.length) return []
  const items: PendingApprovalItem[] = []
  for (const line of lines) {
    const docId = line.documentId
    const myStep = line.step ?? 0
    const total = await db.select({ id: approvalLines.id }).from(approvalLines).where(eq(approvalLines.documentId, docId))
    const priorUnapproved = await db
      .select({ id: approvalLines.id })
      .from(approvalLines)
      .where(and(eq(approvalLines.documentId, docId), lt(approvalLines.step, myStep), ne(approvalLines.status, 'APPROVED')))
    if (priorUnapproved.length > 0) continue
    items.push({
      id: line.id,
      documentId: docId,
      documentTitle: line.documentTitle ?? '—',
      documentKind: (line.documentKind ?? 'GENERAL') as FormDocumentKind,
      authorName: line.authorName ?? '—',
      step: myStep,
      totalSteps: total.length,
      createdAt: line.createdAt ?? new Date(),
    })
  }
  return items
}

// 내가 참조자로 지정된 문서
async function loadCcDocuments(employeeId: string): Promise<CcDocumentItem[]> {
  const db = getDb()
  const rows = await db
    .select({
      documentId: documentCcRecipients.documentId,
      title: formDocuments.title,
      kind: formDocuments.kind,
      status: formDocuments.status,
      authorName: employees.name,
      createdAt: formDocuments.createdAt,
    })
    .from(documentCcRecipients)
    .innerJoin(formDocuments, eq(documentCcRecipients.documentId, formDocuments.id))
    .leftJoin(employees, eq(formDocuments.authorId, employees.id))
    .where(eq(documentCcRecipients.employeeId, employeeId))
    .orderBy(desc(formDocuments.createdAt))
  if (!rows.length) return []
  const docIds = rows.map((r) => r.documentId)
  const lines = await db
    .select({ documentId: approvalLines.documentId, step: approvalLines.step })
    .from(approvalLines)
    .where(inArray(approvalLines.documentId, docIds))
  const stepsByDoc = new Map<string, number>()
  for (const l of lines) stepsByDoc.set(l.documentId, Math.max(stepsByDoc.get(l.documentId) ?? 0, l.step ?? 0))
  return rows.map((r) => ({
    id: r.documentId,
    title: r.title,
    kind: (r.kind ?? 'GENERAL') as FormDocumentKind,
    status: (r.status ?? 'DRAFT') as FormDocumentStatus,
    authorName: r.authorName ?? '—',
    createdAt: r.createdAt ?? new Date(),
    totalSteps: stepsByDoc.get(r.documentId) ?? 0,
  }))
}

// 회사 활성 직원 (결재자/참조자 선택용)
async function loadEmployees(companyId: string, selfId: string): Promise<EmpItem[]> {
  const db = getDb()
  const rows = await db
    .select({ id: employees.id, name: employees.name, employmentStatus: employees.employmentStatus })
    .from(employees)
    .where(eq(employees.companyId, companyId))
    .orderBy(asc(employees.name))
  return rows
    .filter((e) => e.id !== selfId && (e.employmentStatus ?? 'ACTIVE') === 'ACTIVE')
    .map((e) => ({ id: e.id, name: e.name, departmentName: null }))
}

// 회사 활성 양식 템플릿
async function loadTemplates(companyId: string): Promise<FormTemplateItem[]> {
  const db = getDb()
  const rows = await db
    .select({ id: formTemplates.id, name: formTemplates.name, kind: formTemplates.kind, isActive: formTemplates.isActive })
    .from(formTemplates)
    .where(eq(formTemplates.companyId, companyId))
  // ⚠️ form_templates.description/fields/createdAt 은 v1 schema 미선언 → 빈 값으로 채워요.
  return rows
    .filter((t) => t.isActive !== false)
    .map((t) => ({
      id: t.id,
      name: t.name,
      kind: (t.kind ?? 'GENERAL') as FormDocumentKind,
      description: '',
      fields: [],
      isActive: t.isActive ?? true,
      documentCount: 0,
      createdAt: new Date(),
    }))
}

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
  const user = await getCurrentUser()
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
