import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { roles, rolePermissions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 권한 설정 — 역할 목록 + 부여된 권한 수. 원본 teamlet 의 설정/권한.
export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = { SUPER_ADMIN: '최고관리자', DYNAMIC_ORG_HEAD: '부서장', CUSTOM: '맞춤', SYSTEM: '시스템' }

export default async function PermissionsSettingsPage() {
  const user = await getCurrentUser()
  let list: { id: string; name: string; type: string | null; permCount: number }[] = []
  try {
    const db = getDb()
    const rs = await db.select({ id: roles.id, name: roles.name, type: roles.type }).from(roles).where(eq(roles.companyId, user.companyId))
    const rp = await db.select({ roleId: rolePermissions.roleId }).from(rolePermissions).where(eq(rolePermissions.enabled, true))
    const cnt = new Map<string, number>()
    for (const r of rp) cnt.set(r.roleId, (cnt.get(r.roleId) ?? 0) + 1)
    list = rs.map((r) => ({ ...r, permCount: cnt.get(r.id) ?? 0 }))
  } catch (err) {
    console.error('[db] permissions load 실패', err)
  }

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>권한 설정</h1>
          <div className="h-sub">역할(권한 그룹)과 부여된 권한을 확인해요. 역할 배정은 구성원 상세 → 권한 탭에서.</div>
        </div>
      </div>

      <div className="sec-divider">역할<span className="ct">{list.length}</span><span className="line" /></div>
      {list.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>등록된 역할이 없어요.</span>
      ) : (
        <table className="tbl">
          <thead><tr><th>역할</th><th style={{ width: 140 }}>유형</th><th style={{ width: 120, textAlign: 'right' }}>권한 수</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td><span className="tag adm">{TYPE_LABEL[r.type ?? ''] ?? r.type ?? '맞춤'}</span></td>
                <td style={{ textAlign: 'right' }}><span className="sn">{r.permCount}개</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
