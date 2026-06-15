import Link from 'next/link'
import { getDb } from '@/lib/db'
import { companies, users } from '@/lib/db/schema'

// 운영 대시보드 — 플랫폼 전체 현황. 원본 teamlet 그대로 (읽기 전용; 권한 게이트 보류).
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  let totalCompanies = 0
  let activeCompanies = 0
  let totalUsers = 0
  try {
    const db = getDb()
    const cs = await db.select({ isActive: companies.isActive }).from(companies)
    totalCompanies = cs.length
    activeCompanies = cs.filter((c) => c.isActive !== false).length
    const us = await db.select({ id: users.id }).from(users)
    totalUsers = us.length
  } catch (err) {
    console.error('[db] admin dashboard load 실패', err)
  }
  const pendingApplications = 0

  const cards = [
    { label: '대기 중 신청', value: pendingApplications, href: '/admin/applications', accent: pendingApplications > 0, desc: '승인 검토 필요' },
    { label: '전체 회사', value: totalCompanies, href: '/admin/companies', accent: false, desc: `활성 ${activeCompanies}개` },
    { label: '전체 사용자', value: totalUsers, href: '/admin/users', accent: false, desc: '플랫폼 가입 계정' },
  ]

  return (
    <div className="page-body">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">운영 대시보드</h1>
        <p className="mt-1 text-sm text-foreground-muted">Teamlet 플랫폼 전체 현황</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group block">
            <div className={`rounded-lg border p-5 transition-shadow hover:shadow-sm ${c.accent ? 'border-amber-200 bg-amber-50' : 'border-border bg-background-primary'}`}>
              <p className={`text-xs font-medium ${c.accent ? 'text-amber-600' : 'text-foreground-muted'}`}>{c.label}</p>
              <p className={`mt-2 text-3xl font-semibold tabular-nums ${c.accent ? 'text-amber-700' : 'text-foreground'}`}>{c.value.toLocaleString()}</p>
              <p className={`mt-1 text-xs ${c.accent ? 'text-amber-500' : 'text-foreground-subtle'}`}>{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">빠른 이동</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { label: '회사 목록', href: '/admin/companies', desc: '활성 회사 현황 조회' },
            { label: '사용자 관리', href: '/admin/users', desc: '플랫폼 전체 사용자 조회' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg border border-border bg-background-primary px-4 py-3 transition-colors hover:bg-background-secondary">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-foreground-subtle">{item.desc}</p>
              </div>
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 text-foreground-subtle">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
