import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { leaveTypes } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 맞춤 휴가(휴가 종류) — 회사 휴가 종류 목록. 원본 teamlet 의 설정/휴가종류.
export const dynamic = 'force-dynamic'

const KEY_LABEL: Record<string, string> = { annual: '연차', sick: '병가', condolence: '경조사', refresh: '리프레시', reward: '보상', custom: '자율' }

export default async function LeaveTypesSettingsPage() {
  const user = await getCurrentUser()
  let types: { id: string; key: string; name: string }[] = []
  try {
    types = await getDb()
      .select({ id: leaveTypes.id, key: leaveTypes.key, name: leaveTypes.name })
      .from(leaveTypes)
      .where(eq(leaveTypes.companyId, user.companyId))
      .orderBy(asc(leaveTypes.name))
  } catch (err) {
    console.error('[db] leave-types load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>맞춤 휴가</h1>
          <div className="h-sub">법정·회사 자율 휴가 종류를 관리해요</div>
        </div>
      </div>

      <div className="sec-divider">휴가 종류<span className="ct">{types.length}</span><span className="line" /></div>
      {types.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 휴가 종류가 없어요.</span>
      ) : (
        <table className="tbl">
          <thead><tr><th>이름</th><th style={{ width: 140 }}>분류</th><th style={{ width: 200 }}>키</th></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td><span className="tag">{KEY_LABEL[t.key] ?? '휴가'}</span></td>
                <td><span className="sn">{t.key}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
