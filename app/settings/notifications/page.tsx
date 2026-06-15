import Link from 'next/link'

// 알림 설정 — 알림 종류별 수신 현황. 원본 teamlet 의 설정/알림.
export const dynamic = 'force-dynamic'

const CATEGORIES = [
  { key: 'leave', label: '휴가', desc: '휴가 신청·승인·반려 알림' },
  { key: 'workflow', label: '결재', desc: '결재 요청·완료 알림' },
  { key: 'announcement', label: '공지', desc: '회사 공지 알림' },
  { key: 'recognition', label: '인정', desc: '받은 인정·피드백 알림' },
  { key: 'member', label: '구성원', desc: '발령·인사 변경 알림' },
]

export default function NotificationsSettingsPage() {
  return (
    <div className="page-body" style={{ maxWidth: 720 }}>
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>알림</h1>
          <div className="h-sub">알림 종류별 수신 설정이에요</div>
        </div>
      </div>

      <div className="sec-divider">알림 종류<span className="ct">{CATEGORIES.length}</span><span className="line" /></div>
      {CATEGORIES.map((c) => (
        <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-primary)', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 2 }}>{c.desc}</div>
          </div>
          <span className="st ok">켜짐</span>
        </div>
      ))}
    </div>
  )
}
