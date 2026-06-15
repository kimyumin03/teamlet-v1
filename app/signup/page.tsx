import { SignupForm } from '../_components/signup-form'

// 회원가입 — 원본 teamlet 가입 체제. 실제 인증은 axhub 세션.
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh', padding: 24 }}>
      <div style={{ width: 380, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, background: 'var(--primary)', color: 'var(--primary-on)' }}>T</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Teamlet</div>
        </div>
        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-tight">계정 만들기</h2>
          <p className="mt-1.5 text-[13.5px] text-foreground-muted">5초면 시작할 수 있어요. 회사는 다음 단계에서 선택합니다.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
