import type { Metadata } from 'next'
import './globals.css'
import './teamlet-design.css'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/current-user'
import { isHrAdmin } from '@/lib/permissions'
import { getDb } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { Sidebar } from './_components/sidebar'
import { listNotifications, countUnreadNotifications } from '@/lib/actions/notification'
import { NotificationBell } from '@/components/notification/notification-bell'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { CommandPaletteTrigger } from '@/components/command-palette/command-palette-trigger'

export const metadata: Metadata = {
  title: 'Teamlet — 한국형 HR',
  description: '인사·조직·휴가·결재를 한 곳에서. axhub 위에서 동작하는 Teamlet HR.',
}

// 사이드바 표시용 — 실제 로그인 사용자(getCurrentUser, axhub me 연동) 이름 + 회사명.
async function loadMe(): Promise<{ name: string; email: string; companyName: string; employeeId: string; isAdmin: boolean } | null> {
  try {
    const u = await getCurrentUser()
    let companyName = 'Teamlet'
    try {
      const c = await getDb().select({ name: companies.name }).from(companies).where(eq(companies.id, u.companyId)).limit(1)
      if (c[0]?.name) companyName = c[0].name
    } catch {}
    let isAdmin = false
    try {
      isAdmin = await isHrAdmin(u.employeeId)
    } catch {}
    return { name: u.name, email: '', companyName, employeeId: u.employeeId, isAdmin }
  } catch {
    return null
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const me = await loadMe()

  // 알림 데이터 (로그인 직원 기준) — notifications 테이블 미정의로 현재는 빈 배열/0 으로 안전 degrade.
  const [notifResult, unreadCount] = me?.employeeId
    ? await Promise.all([listNotifications(me.employeeId), countUnreadNotifications(me.employeeId)])
    : [{ ok: true as const, data: [] }, 0]
  const notifications = notifResult.ok ? notifResult.data : []

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
            employeeId={me?.employeeId}
            isAdmin={me?.isAdmin ?? false}
          />
          <div className="main">
            <header className="topbar">
              {me?.employeeId && <CommandPaletteTrigger />}
              {me?.employeeId && <CommandPalette isAdmin={me.isAdmin} />}
              <div className="top-actions">
                {me?.employeeId && <NotificationBell items={notifications} unreadCount={unreadCount} />}
              </div>
            </header>
            <main style={{ minHeight: 0, overflowY: 'auto' }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
