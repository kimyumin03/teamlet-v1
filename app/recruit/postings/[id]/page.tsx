import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { jobPostings, candidates, jobStages, employees } from '@/lib/db/schema'

// 채용 공고 상세 — 공고 + 전형 단계 + 지원자. 원본 teamlet 의 /recruit/postings/[id].
export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = { DRAFT: '초안', OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소' }

export default async function PostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const rows = await db
    .select({ id: jobPostings.id, title: jobPostings.title, description: jobPostings.description, status: jobPostings.status, managerName: employees.name, createdAt: jobPostings.createdAt })
    .from(jobPostings)
    .leftJoin(employees, eq(jobPostings.managerId, employees.id))
    .where(eq(jobPostings.id, id))
    .limit(1)
  if (!rows.length) notFound()
  const p = rows[0]

  const stages = await db.select({ id: jobStages.id, order: jobStages.order, name: jobStages.name }).from(jobStages).where(eq(jobStages.postingId, id)).orderBy(asc(jobStages.order))
  const cands = await db
    .select({ id: candidates.id, name: candidates.name, email: candidates.email, result: candidates.result })
    .from(candidates)
    .where(eq(candidates.postingId, id))

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/recruit" className="h-sub" style={{ textDecoration: 'none' }}>← 채용</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>{p.title}</h1>
          <div className="h-sub">{p.managerName ?? '—'} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ko-KR') : '—'}</div>
        </div>
        <span className="tag adm">{STATUS_LABEL[p.status ?? ''] ?? p.status ?? '초안'}</span>
      </div>

      {p.description && (
        <div style={{ padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-primary)', marginBottom: 18, whiteSpace: 'pre-wrap', fontSize: 13.5 }}>{p.description}</div>
      )}

      {stages.length > 0 && (
        <>
          <div className="sec-divider">전형 단계<span className="ct">{stages.length}</span><span className="line" /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {stages.map((s, i) => <span key={s.id} className="tag">{i + 1}. {s.name}</span>)}
          </div>
        </>
      )}

      <div className="sec-divider">지원자<span className="ct">{cands.length}</span><span className="line" /></div>
      {cands.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>아직 지원자가 없어요.</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>이름</th><th>이메일</th><th style={{ width: 100 }}>결과</th></tr></thead>
          <tbody>
            {cands.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td><span className="sn">{c.email}</span></td>
                <td><span className="tag">{c.result ?? '진행'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
