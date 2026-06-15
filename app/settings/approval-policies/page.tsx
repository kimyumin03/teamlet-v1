import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { approvalPolicies } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 결재 정책 — 문서 유형별 결재선 정책. 원본 teamlet 의 설정/결재정책.
export const dynamic = 'force-dynamic'

const CAT_LABEL: Record<string, string> = { LEAVE: '휴가', EXPENSE: '경비', GENERAL: '일반', HR: '인사' }

export default async function ApprovalPoliciesSettingsPage() {
  const user = await getCurrentUser()
  let list: { id: string; name: string; category: string | null; isActive: boolean | null }[] = []
  try {
    list = await getDb()
      .select({ id: approvalPolicies.id, name: approvalPolicies.name, category: approvalPolicies.category, isActive: approvalPolicies.isActive })
      .from(approvalPolicies)
      .where(eq(approvalPolicies.companyId, user.companyId))
  } catch (err) {
    console.error('[db] approval-policies load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>결재 정책</h1>
          <div className="h-sub">문서 유형별 결재선 정책을 관리해요</div>
        </div>
      </div>

      <div className="sec-divider">정책<span className="ct">{list.length}</span><span className="line" /></div>
      {list.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>등록된 결재 정책이 없어요.</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>정책명</th><th style={{ width: 120 }}>유형</th><th style={{ width: 100 }}>상태</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td><span className="tag">{CAT_LABEL[p.category ?? ''] ?? p.category ?? '—'}</span></td>
                <td><span className={p.isActive !== false ? 'st ok' : 'st end'}>{p.isActive !== false ? '활성' : '비활성'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
