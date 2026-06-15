import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { joinRequests, users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 가입 신청 — 회사 가입 신청 승인 대기 목록. 원본 teamlet 의 설정/가입신청.
export const dynamic = 'force-dynamic'

export default async function JoinRequestsSettingsPage() {
  const user = await getCurrentUser()
  let list: { id: string; userName: string | null; userEmail: string | null; status: string | null; createdAt: Date | null }[] = []
  try {
    list = await getDb()
      .select({ id: joinRequests.id, userName: users.name, userEmail: users.email, status: joinRequests.status, createdAt: joinRequests.createdAt })
      .from(joinRequests)
      .leftJoin(users, eq(joinRequests.userId, users.id))
      .where(and(eq(joinRequests.companyId, user.companyId), eq(joinRequests.status, 'PENDING')))
  } catch (err) {
    console.error('[db] join-requests load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>가입 신청</h1>
          <div className="h-sub">회사 가입을 신청한 사용자를 승인해요</div>
        </div>
      </div>

      <div className="sec-divider">대기 중<span className="ct">{list.length}</span><span className="line" /></div>
      {list.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 14 }}>대기 중인 가입 신청이 없어요.</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>이름</th><th>이메일</th><th style={{ width: 120 }}>신청일</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.userName ?? '—'}</td>
                <td><span className="sn">{r.userEmail ?? '—'}</span></td>
                <td><span className="sn">{r.createdAt ? r.createdAt.toLocaleDateString('ko-KR') : '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
