import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companySecurityPolicies } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 보안 — 2단계 인증·IP 접근 제한 정책 현황. 원본 teamlet 의 설정/보안.
export const dynamic = 'force-dynamic'

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser()
  let policy: { mfaEnabled: boolean | null; ipRestrictionEnabled: boolean | null } | null = null
  try {
    const rows = await getDb()
      .select({ mfaEnabled: companySecurityPolicies.mfaEnabled, ipRestrictionEnabled: companySecurityPolicies.ipRestrictionEnabled })
      .from(companySecurityPolicies)
      .where(eq(companySecurityPolicies.companyId, user.companyId))
      .limit(1)
    policy = rows[0] ?? null
  } catch (err) {
    console.error('[db] security load 실패', err)
  }

  const Row = ({ label, on, desc }: { label: string; on: boolean; desc: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-primary)', marginBottom: 10 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <span className={on ? 'st ok' : 'st end'}>{on ? '사용' : '미사용'}</span>
    </div>
  )

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>보안</h1>
          <div className="h-sub">2단계 인증 및 IP 접근 제한 정책</div>
        </div>
      </div>

      <Row label="2단계 인증(MFA)" on={!!policy?.mfaEnabled} desc="로그인 시 추가 인증을 요구해요." />
      <Row label="IP 접근 제한" on={!!policy?.ipRestrictionEnabled} desc="허용된 IP에서만 접속을 허용해요." />
    </div>
  )
}
