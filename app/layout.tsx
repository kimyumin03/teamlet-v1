import type { Metadata } from 'next'
import './globals.css'
import './teamlet-design.css'
import { Sidebar } from './_components/sidebar'

export const metadata: Metadata = {
  title: 'Teamlet — 한국형 HR',
  description: '인사·조직·휴가·결재를 한 곳에서. axhub 위에서 동작하는 Teamlet HR.',
}

// 🔒 axhub SDK 접속 일단 제거 — 회사/계정 정보는 나중에 다시 읽어와요(읽기 보류).
//    복구 시: isAxhubConfigured() 후 makeAxhub().identity.me() 를 여기로.
async function loadMe(): Promise<{ name: string; email: string; companyName: string } | null> {
  return null
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
