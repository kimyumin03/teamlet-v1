import Link from 'next/link'

// 가입 승인 대기 — 회사 가입 신청 후 관리자 승인 대기 화면.
export const dynamic = 'force-dynamic'

export default function PendingApprovalPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <div style={{ width: 420, maxWidth: '90vw', padding: 28, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-primary)', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>가입 승인 대기 중</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          회사 가입 신청이 접수됐어요. 관리자가 승인하면 바로 이용할 수 있어요.
        </p>
        <Link href="/" className="btn btn-outline">홈으로</Link>
      </div>
    </div>
  )
}
