import { LoginForm } from '../_components/login-form'

// 로그인 — 원본 teamlet 로그인 체제(이메일/비번 2단계 + 회원가입 + AxHub + 데모).
// 실제 인증은 axhub 세션이 처리해요.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh', padding: 24 }}>
      <div style={{ width: 380, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, background: 'var(--primary)', color: 'var(--primary-on)' }}>T</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Teamlet</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>HR for small teams</div>
          </div>
        </div>

        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-tight">로그인</h2>
          <p className="mt-1.5 text-[13.5px] text-foreground-muted">업무용 이메일과 비밀번호로 로그인하세요.</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
