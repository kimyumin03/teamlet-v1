import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companyDocuments, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 문서·증명서 — 공용 문서 목록. 원본 teamlet 그대로 (읽기 전용; 추가/삭제는 쓰기 보류).
export const dynamic = 'force-dynamic'

const CATEGORY_LABEL: Record<string, string> = { GENERAL: '일반', NOTICE: '공지', POLICY: '정책' }
const CATEGORY_TAG: Record<string, string> = { GENERAL: 'tag', NOTICE: 'tag warn', POLICY: 'tag wfh' }

export default async function DocumentsPage() {
  const user = await getCurrentUser()
  let docs: { id: string; category: string | null; title: string; fileUrl: string | null; uploaderName: string | null; createdAt: Date | null }[] = []
  try {
    const db = getDb()
    docs = await db
      .select({
        id: companyDocuments.id,
        category: companyDocuments.category,
        title: companyDocuments.title,
        fileUrl: companyDocuments.fileUrl,
        uploaderName: employees.name,
        createdAt: companyDocuments.createdAt,
      })
      .from(companyDocuments)
      .leftJoin(employees, eq(companyDocuments.uploadedById, employees.id))
      .where(eq(companyDocuments.companyId, user.companyId))
      .orderBy(desc(companyDocuments.createdAt))
  } catch (err) {
    console.error('[db] documents load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">문서·증명서</h1>
          <div className="h-sub">공용 문서·공지·정책 자료를 보관하고 증명서를 발급해요</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/documents/certificates" className="btn btn-outline">증명서 발급</Link>
        </div>
      </div>

      <div className="sec-divider">
        문서 목록<span className="ct">{docs.length}</span><span className="line" />
      </div>

      {docs.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>등록된 문서가 없어요</div>
          <div style={{ fontSize: '12.5px' }}>등록된 공용 문서가 아직 없어요.</div>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>분류</th><th>제목</th><th>올린 사람</th><th>등록일</th></tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id}>
                <td><span className={CATEGORY_TAG[doc.category ?? ''] ?? 'tag'}>{CATEGORY_LABEL[doc.category ?? ''] ?? '문서'}</span></td>
                <td>
                  {doc.fileUrl ? (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}>{doc.title}</a>
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{doc.title}</span>
                  )}
                </td>
                <td><span className="sn">{doc.uploaderName ?? '—'}</span></td>
                <td><span className="sn">{doc.createdAt ? doc.createdAt.toLocaleDateString('ko-KR') : '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
