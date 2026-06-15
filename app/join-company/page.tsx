import Link from 'next/link'

// 회사 참여 — 회사 코드로 기존 회사에 참여. (실제 가입 처리는 관리자 승인 흐름)
export const dynamic = 'force-dynamic'

export default function JoinCompanyPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <div style={{ width: 420, maxWidth: '90vw', padding: 28, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-primary)' }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>회사 참여</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18, lineHeight: 1.6, textAlign: 'center' }}>
          회사 코드를 입력하면 가입 신청이 접수돼요. 관리자 승인 후 이용할 수 있어요.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input placeholder="회사 코드 (예: ABCD-1234)" className="ctl-in" style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary" disabled style={{ opacity: 0.6 }}>참여 신청</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link href="/" className="h-sub" style={{ textDecoration: 'none', fontSize: 12 }}>← 홈으로</Link>
        </div>
      </div>
    </div>
  )
}
