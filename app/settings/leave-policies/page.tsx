import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leavePolicies, leaveTypes } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 휴가 정책 — 회사 연차/휴가 정책 목록. 원본 teamlet 의 설정/휴가정책.
export const dynamic = 'force-dynamic'

export default async function LeavePoliciesSettingsPage() {
  const user = await getCurrentUser()
  let policies: { id: string; name: string; typeName: string | null; isDefault: boolean | null; isActive: boolean | null }[] = []
  try {
    policies = await getDb()
      .select({ id: leavePolicies.id, name: leavePolicies.name, typeName: leaveTypes.name, isDefault: leavePolicies.isDefault, isActive: leavePolicies.isActive })
      .from(leavePolicies)
      .leftJoin(leaveTypes, eq(leavePolicies.leaveTypeId, leaveTypes.id))
      .where(eq(leavePolicies.companyId, user.companyId))
  } catch (err) {
    console.error('[db] leave-policies load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>휴가 정책</h1>
          <div className="h-sub">연차 부여·자율 휴가 정책을 확인해요</div>
        </div>
      </div>

      <div className="sec-divider">정책<span className="ct">{policies.length}</span><span className="line" /></div>
      {policies.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 정책이 없어요.</span>
      ) : (
        <table className="tbl">
          <thead><tr><th>정책명</th><th style={{ width: 140 }}>휴가 종류</th><th style={{ width: 100 }}>기본</th><th style={{ width: 100 }}>상태</th></tr></thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.typeName ?? '—'}</td>
                <td>{p.isDefault ? <span className="st ok">기본</span> : '—'}</td>
                <td><span className={p.isActive !== false ? 'st ok' : 'st end'}>{p.isActive !== false ? '활성' : '비활성'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
