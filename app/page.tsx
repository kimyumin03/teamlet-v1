import Link from 'next/link'
import { and, asc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { listAnnouncements, getUnreadAnnouncementCount } from '@/lib/actions/announcement'
import { listReceivedRecognitions } from '@/lib/actions/recognition'
import type { AnnouncementItem } from '@/lib/modules/announcement'
import { PostCard } from './_components/post-card'
import { HomeRail } from './_components/home-rail'
import { NewsTab } from './_components/news-tab'
import { RecognitionTab } from './_components/recognition-tab'
import { SendToColleagueButton } from '@/components/home/send-to-colleague-button'
import type { PickerEmployee, PickerDepartment } from '@/components/common/recipient-picker'

export const dynamic = 'force-dynamic'

function getGreeting(): string {
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours()
  if (hour < 12) return '좋은 아침이에요'
  if (hour < 18) return '좋은 오후예요'
  return '좋은 저녁이에요'
}

// ✅ 자체 DB(Neon) + 새 서버액션으로 공지·인정·구성원/부서·권한을 읽어와요. (신원은 현재 로그인 사용자)
async function loadAll() {
  const user = await getCurrentUser()

  const annRes = await listAnnouncements(user.employeeId)
  const announcements: AnnouncementItem[] = annRes.ok ? annRes.data : []
  const received = await listReceivedRecognitions(user.employeeId)
  const unreadCount = await getUnreadAnnouncementCount(user.employeeId)
  const canAnnounce = await hasPermission(user.employeeId, 'company.announcement.manage')

  // 인정 보내기 피커용 — 같은 회사 활성 구성원(본인 제외) + 부서
  let pickerEmployees: PickerEmployee[] = []
  let pickerDepartments: PickerDepartment[] = []
  let count = 0
  try {
    const db = getDb()
    const empRows = await db
      .select({
        id: employees.id,
        name: employees.name,
        departmentId: employees.departmentId,
        isActive: employees.isActive,
      })
      .from(employees)
      .where(and(eq(employees.companyId, user.companyId), ne(employees.id, user.employeeId)))
      .orderBy(asc(employees.name))

    const deptRows = await db
      .select({ id: departments.id, name: departments.name, parentId: departments.parentId })
      .from(departments)
      .where(eq(departments.companyId, user.companyId))

    const deptName = new Map(deptRows.map((d) => [d.id, d.name]))
    pickerEmployees = empRows
      .filter((e) => e.isActive !== false)
      .map((e) => ({
        id: e.id,
        name: e.name,
        departmentId: e.departmentId ?? null,
        departmentName: e.departmentId ? deptName.get(e.departmentId) ?? null : null,
      }))
    pickerDepartments = deptRows.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId ?? null }))

    const allEmp = await db.select({ id: employees.id }).from(employees).where(eq(employees.companyId, user.companyId))
    count = allEmp.length
  } catch (err) {
    console.error('[db] home picker/count load 실패', err)
  }

  return {
    me: { name: user.name },
    employeeId: user.employeeId,
    announcements,
    received,
    unreadCount,
    canAnnounce,
    pickerEmployees,
    pickerDepartments,
    count,
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'news' || tab === 'recognition' ? tab : 'feed'
  const {
    me,
    employeeId,
    announcements,
    received,
    unreadCount,
    canAnnounce,
    pickerEmployees,
    pickerDepartments,
    count,
  } = await loadAll()

  const firstName = me?.name?.split(' ')[0] ?? me?.name ?? ''
  const greeting = getGreeting()
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  // 홈 피드 공지: 필독 있으면 필독1 + 최신1, 없으면 최신2 (최대 2개)
  const byDate = [...announcements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const pinned = byDate.find((a) => a.isPinned)
  const feedAnnouncements = (
    pinned ? [pinned, byDate.find((a) => a.id !== pinned.id)] : byDate.slice(0, 2)
  ).filter(Boolean) as AnnouncementItem[]

  const recogUnread = received.filter((r) => !r.isRead).length

  return (
    <div className="work">
      <main className="feed">
        {/* 인사말 헤더 */}
        <div className="feed-head">
          <div>
            <h1 className="h-title-h">
              {greeting}, {firstName}님 <span className="wave">👋</span>
            </h1>
            <div className="h-sub-h">
              {today}
              <span className="ping">
                <i />
                출근 {count} · 휴가 0
              </span>
            </div>
          </div>
          <div className="feed-actions">
            <Link href="/leave" className="btn-sm btn-sm-ghost">
              휴가 신청
            </Link>
            <SendToColleagueButton
              canAnnounce={canAnnounce}
              employees={pickerEmployees}
              departments={pickerDepartments}
            />
          </div>
        </div>

        {/* 탭 */}
        <div className="tabs">
          <Link href="/?tab=feed" className={`tab${activeTab === 'feed' ? ' active' : ''}`}>
            홈 피드
          </Link>
          <Link href="/?tab=news" className={`tab${activeTab === 'news' ? ' active' : ''}`}>
            회사 소식
          </Link>
          <Link href="/?tab=recognition" className={`tab${activeTab === 'recognition' ? ' active' : ''}`}>
            인정·피드백
            {recogUnread > 0 && <span className="count">{recogUnread}</span>}
          </Link>
        </div>

        {activeTab === 'feed' && (
          <section>
            <div className="sec-divider">
              공지
              {announcements.length > 0 && <span className="ct">{announcements.length}</span>}
              <span className="line" />
            </div>
            {feedAnnouncements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {feedAnnouncements.map((a) => (
                  <PostCard
                    key={a.id}
                    item={{
                      id: a.id,
                      authorName: a.authorName,
                      title: a.title,
                      content: a.content,
                      createdAt: a.createdAt.toISOString(),
                      isPinned: a.isPinned,
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyFeed />
            )}
          </section>
        )}

        {activeTab === 'news' && (
          <NewsTab announcements={byDate} currentEmployeeId={employeeId} unreadCount={unreadCount} />
        )}

        {activeTab === 'recognition' && <RecognitionTab items={received} />}
      </main>

      <HomeRail activeCount={count} />
    </div>
  )
}

function EmptyFeed() {
  return (
    <div
      style={{
        padding: '48px 20px',
        textAlign: 'center',
        border: '1px dashed var(--border)',
        borderRadius: 14,
        color: 'var(--fg-muted)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
        등록된 공지사항이 없어요
      </div>
      <div style={{ fontSize: 12.5 }}>팀의 소식을 공유해 보세요.</div>
    </div>
  )
}
