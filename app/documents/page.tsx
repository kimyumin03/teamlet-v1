import Link from 'next/link'
import { AxHubError, where } from '@ax-hub/sdk'
import { isAxhubConfigured, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'
import { DeleteDocumentButton } from './delete-button'

// 문서함 — 회사 공용 문서·공지·정책 자료를 동적 테이블 `documents` 에서 조회.
// employees/approvals 와 동일하게 company_id 회사필터(공유 테이블)로 읽어요.
export const dynamic = 'force-dynamic'

type CompanyDocument = {
  id: string
  company_id: string
  title: string
  category: string
  file_url: string
  uploader_name: string
  created_at: string
}

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: '일반',
  NOTICE: '공지',
  POLICY: '정책',
}
const CATEGORY_TAG: Record<string, string> = {
  GENERAL: 'tag',
  NOTICE: 'tag warn',
  POLICY: 'tag wfh',
}

async function loadDocuments(): Promise<CompanyDocument[] | null> {
  if (!isAxhubConfigured()) return null
  try {
    const docs = await table<CompanyDocument>('documents')
    const page = await docs.list({
      where: where('company_id').eq(TENANT),
      orderBy: [{ field: 'created_at', dir: 'desc' }],
      limit: 200,
    })
    return page.items
  } catch (err) {
    if (err instanceof AxHubError) {
      console.error('[axhub] documents.list failed', { code: err.code, requestId: err.requestId })
    }
    return null
  }
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ko-KR')
}

export default async function DocumentsPage() {
  const documents = await loadDocuments()
  const configured = isAxhubConfigured()
  const list = documents ?? []

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">문서·증명서</h1>
          <div className="h-sub">공용 문서·공지·정책 자료를 보관하고 공유해요</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/documents/new" className="btn btn-primary">
            문서 추가
          </Link>
        </div>
      </div>

      <div className="sec-divider">
        문서 목록<span className="ct">{list.length}</span>
        <span className="line" />
      </div>

      {documents === null ? (
        <Empty
          text={
            configured
              ? '문서를 불러오지 못했어요. 로그인 상태를 확인해 주세요.'
              : '로컬 실행 중 — axhub 로 배포하면 문서가 표시돼요.'
          }
        />
      ) : list.length === 0 ? (
        <Empty text="등록된 문서가 없어요. 문서 추가 버튼으로 첫 자료를 올려보세요." />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>분류</th>
              <th>제목</th>
              <th>올린 사람</th>
              <th>등록일</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <span className={CATEGORY_TAG[doc.category] ?? 'tag'}>
                    {CATEGORY_LABEL[doc.category] ?? doc.category}
                  </span>
                </td>
                <td>
                  {doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}
                    >
                      {doc.title}
                    </a>
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{doc.title}</span>
                  )}
                </td>
                <td>
                  <span className="sn">{doc.uploader_name || '—'}</span>
                </td>
                <td>
                  <span className="sn">{fmtDate(doc.created_at)}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <DeleteDocumentButton id={doc.id} title={doc.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border)',
        borderRadius: 14,
        background: 'var(--bg-primary)',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--fg-muted)',
        fontSize: 13,
      }}
    >
      {text}
    </div>
  )
}
