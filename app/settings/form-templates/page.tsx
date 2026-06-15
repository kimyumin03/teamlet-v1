import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { formTemplates } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 양식 템플릿 — 신청/보고 양식 설계. 원본 teamlet 의 설정/양식.
export const dynamic = 'force-dynamic'

export default async function FormTemplatesSettingsPage() {
  const user = await getCurrentUser()
  let list: { id: string; name: string; kind: string | null; isActive: boolean | null }[] = []
  try {
    list = await getDb()
      .select({ id: formTemplates.id, name: formTemplates.name, kind: formTemplates.kind, isActive: formTemplates.isActive })
      .from(formTemplates)
      .where(eq(formTemplates.companyId, user.companyId))
  } catch (err) {
    console.error('[db] form-templates load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>양식 템플릿</h1>
          <div className="h-sub">신청·보고 양식을 관리해요</div>
        </div>
      </div>

      <div className="sec-divider">양식<span className="ct">{list.length}</span><span className="line" /></div>
      {list.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>등록된 양식이 없어요.</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>양식명</th><th style={{ width: 120 }}>종류</th><th style={{ width: 100 }}>상태</th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td><span className="tag">{t.kind ?? '—'}</span></td>
                <td><span className={t.isActive !== false ? 'st ok' : 'st end'}>{t.isActive !== false ? '활성' : '비활성'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
