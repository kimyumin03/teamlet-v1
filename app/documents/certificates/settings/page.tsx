import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateTemplates } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 증명서 템플릿 설정 — 회사 증명서 양식 목록. 원본 teamlet 의 certificates/settings.
export const dynamic = 'force-dynamic'

const CERT_LABEL: Record<string, string> = { EMPLOYMENT: '재직증명서', CAREER: '경력증명서' }

export default async function CertificateTemplatesPage() {
  const user = await getCurrentUser()
  let list: { id: string; name: string; certType: string | null; isActive: boolean | null }[] = []
  try {
    list = await getDb()
      .select({ id: certificateTemplates.id, name: certificateTemplates.name, certType: certificateTemplates.certType, isActive: certificateTemplates.isActive })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.companyId, user.companyId))
  } catch (err) {
    console.error('[db] cert templates load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/documents/certificates" className="h-sub" style={{ textDecoration: 'none' }}>← 증명서</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>증명서 템플릿</h1>
          <div className="h-sub">증명서 양식을 관리해요</div>
        </div>
      </div>

      <div className="sec-divider">템플릿<span className="ct">{list.length}</span><span className="line" /></div>
      {list.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>등록된 템플릿이 없어요. (기본 양식으로 발급돼요)</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>이름</th><th style={{ width: 140 }}>종류</th><th style={{ width: 100 }}>상태</th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td><span className="tag">{CERT_LABEL[t.certType ?? ''] ?? t.certType ?? '—'}</span></td>
                <td><span className={t.isActive !== false ? 'st ok' : 'st end'}>{t.isActive !== false ? '활성' : '비활성'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
