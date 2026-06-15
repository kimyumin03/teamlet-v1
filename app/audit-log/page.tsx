import Link from 'next/link'
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 감사 로그 — 회사 내 활동 이력. 원본 teamlet 그대로 (읽기 전용 조회).
export const dynamic = 'force-dynamic'

const EVENT_LABEL: Record<string, string> = { CREATE: '생성', READ: '조회', UPDATE: '수정', DELETE: '삭제', DOWNLOAD: '다운로드' }
const EVENT_CLASS: Record<string, string> = {
  CREATE: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  READ: 'border-border bg-background-secondary text-foreground-muted',
  UPDATE: 'border-blue-300 bg-blue-50 text-blue-700',
  DELETE: 'border-destructive/40 bg-destructive/5 text-destructive',
  DOWNLOAD: 'border-amber-300 bg-amber-50 text-amber-700',
}
const ACTIVITY_LABEL: Record<string, string> = { auth: '인증', tenancy: '회사', member: '구성원', leave: '휴가', workflow: '워크플로우', security: '보안', role: '권한' }
const ACTIVITY_CLASS: Record<string, string> = {
  auth: 'border-purple-300 bg-purple-50 text-purple-700',
  tenancy: 'border-blue-300 bg-blue-50 text-blue-700',
  member: 'border-teal-300 bg-teal-50 text-teal-700',
  leave: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  workflow: 'border-amber-300 bg-amber-50 text-amber-700',
  security: 'border-destructive/40 bg-destructive/5 text-destructive',
  role: 'border-border bg-background-secondary text-foreground-muted',
}
const ACTIVITY_TYPES = [
  { value: '', label: '전체' }, { value: 'auth', label: '인증' }, { value: 'tenancy', label: '회사' }, { value: 'member', label: '구성원' },
  { value: 'leave', label: '휴가' }, { value: 'workflow', label: '워크플로우' }, { value: 'security', label: '보안' }, { value: 'role', label: '권한' },
]
const EVENT_TYPES = [
  { value: '', label: '전체' }, { value: 'CREATE', label: '생성' }, { value: 'READ', label: '조회' },
  { value: 'UPDATE', label: '수정' }, { value: 'DELETE', label: '삭제' }, { value: 'DOWNLOAD', label: '다운로드' },
]

function buildHref(base: Record<string, string>, override: Record<string, string>) {
  const p = new URLSearchParams({ ...base, ...override })
  if (!override.page) p.delete('page')
  for (const [k, v] of Array.from(p.entries())) if (!v) p.delete(k)
  const qs = p.toString()
  return `/audit-log${qs ? `?${qs}` : ''}`
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; type?: string; event?: string }>
}) {
  const user = getCurrentUser()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1'))
  const q = params.q?.trim() ?? ''
  const activityType = params.type ?? ''
  const eventType = params.event ?? ''
  const limit = 50
  const offset = (page - 1) * limit

  let items: { id: string; occurredAt: Date | null; eventType: string | null; activityType: string | null; description: string | null; actorName: string | null; actorEmail: string | null }[] = []
  let total = 0
  try {
    const db = getDb()
    const conds: SQL[] = [eq(auditLogs.companyId, user.companyId)]
    if (activityType) conds.push(eq(auditLogs.activityType, activityType))
    if (eventType) conds.push(eq(auditLogs.eventType, eventType))
    if (q) conds.push(or(ilike(auditLogs.description, `%${q}%`), ilike(auditLogs.actorName, `%${q}%`)) as SQL)
    const where = and(...conds)
    items = await db
      .select({
        id: auditLogs.id,
        occurredAt: auditLogs.occurredAt,
        eventType: auditLogs.eventType,
        activityType: auditLogs.activityType,
        description: auditLogs.description,
        actorName: auditLogs.actorName,
        actorEmail: auditLogs.actorEmail,
      })
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.occurredAt))
      .limit(limit)
      .offset(offset)
    const totalRows = await db.select({ c: count() }).from(auditLogs).where(where)
    total = totalRows[0]?.c ?? 0
  } catch (err) {
    console.error('[db] audit-log load 실패', err)
  }

  const totalPages = Math.ceil(total / limit)
  const baseParams = { q, type: activityType, event: eventType }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-7 pb-3">
        <h1 className="h-title">감사 로그</h1>
        <p className="h-sub mt-1.5">회사 내 활동 이력 · 총 {total.toLocaleString()}건</p>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-10">
        <div className="mb-4 flex flex-wrap gap-2">
          <form method="get" action="/audit-log" className="flex">
            <input type="hidden" name="type" value={activityType} />
            <input type="hidden" name="event" value={eventType} />
            <input name="q" defaultValue={q} placeholder="설명·담당자 검색" className="h-9 w-52 rounded-[8px] border border-border bg-background-primary px-3 text-[13px] text-foreground placeholder:text-foreground-subtle focus-visible:outline-none" />
          </form>

          <div className="flex gap-1 rounded-lg border border-border bg-background-secondary p-0.5">
            {ACTIVITY_TYPES.map((t) => (
              <Link key={t.value} href={buildHref(baseParams, { type: t.value })} className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${activityType === t.value ? 'bg-background-primary font-medium text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-1 rounded-lg border border-border bg-background-secondary p-0.5">
            {EVENT_TYPES.map((t) => (
              <Link key={t.value} href={buildHref(baseParams, { event: t.value })} className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${eventType === t.value ? 'bg-background-primary font-medium text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'}`}>
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <p className="text-[14px] font-medium text-foreground">
              {q || activityType || eventType ? '검색 결과가 없어요.' : '기록된 감사 로그가 없어요.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border text-[13px]">
            <div className="grid grid-cols-[155px_72px_80px_1fr_110px] gap-3 border-b border-border bg-background-secondary px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              <span>시각</span><span>이벤트</span><span>유형</span><span>내용</span><span className="text-right">담당자</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((log) => (
                <div key={log.id} className="grid grid-cols-[155px_72px_80px_1fr_110px] items-center gap-3 px-4 py-2.5 hover:bg-background-secondary">
                  <span className="font-mono text-[11px] tabular-nums text-foreground-subtle">
                    {log.occurredAt ? log.occurredAt.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </span>
                  <span className={`inline-flex justify-center rounded-[5px] border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${EVENT_CLASS[log.eventType ?? ''] ?? 'border-border bg-background-secondary text-foreground-muted'}`}>
                    {EVENT_LABEL[log.eventType ?? ''] ?? log.eventType}
                  </span>
                  <span className={`inline-flex justify-center rounded-[5px] border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${ACTIVITY_CLASS[log.activityType ?? ''] ?? 'border-border bg-background-secondary text-foreground-muted'}`}>
                    {ACTIVITY_LABEL[log.activityType ?? ''] ?? log.activityType}
                  </span>
                  <span className="truncate text-[13px] text-foreground">{log.description}</span>
                  <span className="truncate text-right text-[11px] text-foreground-subtle">{log.actorName ?? log.actorEmail ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={buildHref(baseParams, { page: String(page - 1) })} className="rounded-[8px] border border-border px-3 py-1.5 text-[13px] hover:bg-background-secondary transition-colors">이전</Link>
            )}
            <span className="px-3 py-1.5 text-[13px] text-foreground-muted">{page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={buildHref(baseParams, { page: String(page + 1) })} className="rounded-[8px] border border-border px-3 py-1.5 text-[13px] hover:bg-background-secondary transition-colors">다음</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
