import type { Metadata } from 'next'
import './globals.css'
import './teamlet-design.css'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { Sidebar } from './_components/sidebar'

export const metadata: Metadata = {
  title: 'Teamlet — 한국형 HR',
  description: '인사·조직·휴가·결재를 한 곳에서. axhub 위에서 동작하는 Teamlet HR.',
}

// 사이드바 표시용 — 실제 로그인 사용자(getCurrentUser, axhub me 연동) 이름 + 회사명.
async function loadMe(): Promise<{ name: string; email: string; companyName: string } | null> {
  try {
    const u = await getCurrentUser()
    let companyName = 'Teamlet'
    try {
      const c = await getDb().select({ name: companies.name }).from(companies).where(eq(companies.id, u.companyId)).limit(1)
      if (c[0]?.name) companyName = c[0].name
    } catch {}
    return { name: u.name, email: '', companyName }
  } catch {
    return null
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const me = await loadMe()

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        <div className="app">
          <Sidebar
            userName={me?.name ?? ''}
            userEmail={me?.email ?? ''}
            companyName={me?.companyName ?? 'Teamlet'}
          />
          <div className="main">
            <header className="topbar">
              <div className="topbar-search">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span className="ph">검색…</span>
                <span className="kbd-s">⌘K</span>
              </div>
              <div className="top-actions" />
            </header>
            <main style={{ minHeight: 0, overflowY: 'auto' }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
