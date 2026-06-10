'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// teamlet 디자인(design.css)의 .side / .nav-item / .me 클래스 사용.
// 인사관리 그룹은 권한 연동 전이라 일단 전체 노출 (추후 me 권한으로 게이트).

type NavItem = { href: string; label: string; icon: keyof typeof ICON }

const NAV_WORKSPACE: NavItem[] = [
  { href: '/', label: '홈', icon: 'home' },
  { href: '/leave', label: '휴가', icon: 'calendar' },
  { href: '/documents', label: '문서·증명서', icon: 'folder' },
]
const NAV_ADMIN: NavItem[] = [
  { href: '/members', label: '구성원', icon: 'users' },
  { href: '/workflow', label: '워크플로우', icon: 'workflow' },
]
const NAV_SETTINGS: NavItem[] = [{ href: '/settings', label: '설정', icon: 'settings' }]

export function Sidebar({
  userName,
  userEmail,
  companyName,
}: {
  userName: string
  userEmail: string
  companyName: string
}) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  const item = (it: NavItem) => (
    <Link key={it.href} href={it.href} className={`nav-item${isActive(it.href) ? ' active' : ''}`}>
      {ICON[it.icon]}
      <span>{it.label}</span>
    </Link>
  )

  return (
    <aside className="side">
      {/* 조직 */}
      <div className="org">
        <div className="org-logo">{(companyName || 'T').trim().charAt(0).toUpperCase()}</div>
        <div className="org-name">
          {companyName || 'Teamlet'}
          <small>한국형 HR</small>
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-label">워크스페이스</div>
        {NAV_WORKSPACE.map(item)}
      </div>

      <div className="nav-group">
        <div className="nav-label">인사 관리</div>
        {NAV_ADMIN.map(item)}
      </div>

      <div className="nav-group">
        <div className="nav-label">설정</div>
        {NAV_SETTINGS.map(item)}
      </div>

      {/* 내 계정 */}
      <div className="me">
        <div className="av">{(userName || userEmail || '?').trim().charAt(0).toUpperCase()}</div>
        <div className="meta">
          <div className="name">{userName || '게스트'}</div>
          <div className="role">{userEmail || '로그인 필요'}</div>
        </div>
      </div>
    </aside>
  )
}

// Lucide 스타일 인라인 아이콘 (design.css 의 .nav-item svg 스타일 적용)
const ICON = {
  home: (
    <svg viewBox="0 0 24 24"><path d="M3 9.5 12 3l9 6.5V21H3z" /><path d="M9 21v-7h6v7" /></svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M21 20c0-2.6-1.5-4.2-3.5-4.7" /></svg>
  ),
  workflow: (
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><path d="M10 6.5h5a2 2 0 0 1 2 2V14" /></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.3-1.3L13.8 2h-3.6l-.4 2.5a7 7 0 0 0-2.3 1.3l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.3 1.3l.4 2.5h3.6l.4-2.5a7 7 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5A7 7 0 0 0 19 12z" /></svg>
  ),
} as const
