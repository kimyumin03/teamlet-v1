import Link from 'next/link'
import { registerCompanyAction } from '@/lib/actions/auth'

// 회사 등록 — 새 회사 등록 신청 폼(원본 체제). 실제 처리는 플랫폼 관리자 심사.
export const dynamic = 'force-dynamic'

const inputCls =
  'w-full px-3.5 py-2.5 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-primary)] text-[14px] placeholder:text-[var(--fg-subtle)] focus:outline-none focus:border-[var(--primary)] transition-colors'

export default function RegisterCompanyPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh', padding: 24 }}>
      <div style={{ width: 420, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-tight">회사 등록</h2>
          <p className="mt-1.5 text-[13.5px] text-foreground-muted">회사 정보를 입력하면 등록 신청이 접수돼요. 승인 후 최고 관리자 계정이 생성됩니다.</p>
        </div>
        <form action={registerCompanyAction} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">회사명</label>
            <input name="companyName" required placeholder="(주)팀렛" className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">사업자번호</label>
            <input name="businessNumber" placeholder="000-00-00000" className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">대표자명</label>
            <input name="representativeName" placeholder="홍길동" className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--fg-muted)] mb-1.5">연락처</label>
            <input name="contact" placeholder="02-0000-0000" className={inputCls} />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[color:var(--primary-on)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors">등록 신청</button>
          <div className="text-center text-[12.5px] text-[var(--fg-muted)]">
            <Link href="/login" className="text-[var(--primary)] font-medium">← 로그인으로</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
