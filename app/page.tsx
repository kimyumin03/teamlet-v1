import Link from 'next/link'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { announcements, recognitions, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { PostCard, type Announcement } from './_components/post-card'
import { HomeRail } from './_components/home-rail'

export const dynamic = 'force-dynamic'

type AnnRow = {
  id: string
  company_id: string
  author: string
  role: string
  title: string
  body: string
  pinned: boolean
  created_at: string
}
type RecogRow = {
  id: string
  company_id: string
  from_name: string
  to_name: string
  message: string
  emoji: string
  created_at: string
}

function getGreeting(): string {
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours()
  if (hour < 12) return '좋은 아침이에요'
  if (hour < 18) return '좋은 오후예요'
  return '좋은 저녁이에요'
}

function toAnnouncement(r: AnnRow): Announcement {
  return {
    id: r.id,
    authorName: r.author,
    title: r.title,
    content: r.body,
    createdAt: r.created_at,
    isPinned: !!r.pinned,
  }
}

// ✅ 자체 DB(Neon)에서 공지·인정·직원수를 읽어와요. (신원은 데모 직원)
async function loadAll(): Promise<{
  me: { name?: string; email?: string } | null
  anns: AnnRow[]
  recogs: RecogRow[]
  count: number
}> {
  const user = getCurrentUser()
  try {
    const db = getDb()
    const annRows = await db
      .select({
        id: announcements.id,
        author: employees.name,
        title: announcements.title,
        body: announcements.content,
        pinned: announcements.isPinned,
        created_at: announcements.createdAt,
      })
      .from(announcements)
      .leftJoin(employees, eq(announcements.authorId, employees.id))
      .where(eq(announcements.companyId, user.companyId))
      .orderBy(desc(announcements.createdAt))
      .limit(50)
    const anns: AnnRow[] = annRows.map((r) => ({
      id: r.id,
      company_id: user.companyId,
      author: r.author ?? '',
      role: '',
      title: r.title,
      body: r.body ?? '',
      pinned: !!r.pinned,
      created_at: (r.created_at ?? new Date()).toISOString(),
    }))

    const recogRows = await db
      .select({
        id: recognitions.id,
        from_name: employees.name,
        message: recognitions.message,
        created_at: recognitions.createdAt,
      })
      .from(recognitions)
      .leftJoin(employees, eq(recognitions.senderId, employees.id))
      .where(eq(recognitions.companyId, user.companyId))
      .orderBy(desc(recognitions.createdAt))
      .limit(50)
    const recogs: RecogRow[] = recogRows.map((r) => ({
      id: r.id,
      company_id: user.companyId,
      from_name: r.from_name ?? '',
      to_name: '',
      message: r.message ?? '',
      emoji: '',
      created_at: (r.created_at ?? new Date()).toISOString(),
    }))

    const empRows = await db.select({ id: employees.id }).from(employees).where(eq(employees.companyId, user.companyId))

    return { me: { name: user.name }, anns, recogs, count: empRows.length }
  } catch (err) {
    console.error('[db] home load 실패', err)
    return { me: { name: user.name }, anns: [], recogs: [], count: 0 }
  }
}

function isThisWeek(d: string) {
  const now = new Date()
  const daysSinceMonday = (now.getDay() + 6) % 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysSinceMonday)
  weekStart.setHours(0, 0, 0, 0)
  return new Date(d) >= weekStart
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'news' || tab === 'recognition' ? tab : 'feed'
  const { me, anns, recogs, count } = await loadAll()

  const firstName = me?.name?.split(' ')[0] ?? me?.name ?? me?.email ?? ''
  const greeting = getGreeting()
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  const byDate = [...anns].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const pinned = byDate.find((a) => a.pinned)
  const feedAnnouncements = (
    pinned ? [pinned, byDate.find((a) => a.id !== pinned.id)] : byDate.slice(0, 2)
  ).filter(Boolean) as AnnRow[]
  const thisWeekCount = anns.filter((a) => isThisWeek(a.created_at)).length
  const pinnedCount = anns.filter((a) => a.pinned).length

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
            <Link href="/announcements/new" className="btn-sm">
              공지 작성
            </Link>
            <Link href="/recognitions/new" className="btn-sm btn-sm-ghost">
              인정 보내기
            </Link>
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
            {recogs.length > 0 && <span className="count">{recogs.length}</span>}
          </Link>
        </div>

        {activeTab === 'feed' && (
          <section>
            <div className="sec-divider">
              공지
              {anns.length > 0 && <span className="ct">{anns.length}</span>}
              <span className="line" />
            </div>
            {feedAnnouncements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {feedAnnouncements.map((a) => (
                  <PostCard key={a.id} item={toAnnouncement(a)} />
                ))}
              </div>
            ) : (
              <EmptyFeed />
            )}
          </section>
        )}

        {activeTab === 'news' && (
          <section>
            <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <div className="kpi">
                <span className="lbl">읽지 않은 공지</span>
                <span className="val num">
                  0<small>건</small>
                </span>
              </div>
              <div className="kpi">
                <span className="lbl">이번 주 새 글</span>
                <span className="val num">
                  {thisWeekCount}
                  <small>건</small>
                </span>
                {pinnedCount > 0 && <span className="delta">📌 필독 {pinnedCount}건</span>}
              </div>
            </div>
            {byDate.length === 0 ? (
              <EmptyNews />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byDate.map((a) => (
                  <PostCard key={a.id} item={toAnnouncement(a)} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'recognition' && (
          <section className="flex flex-col gap-3">
            <div className="sec-divider">
              인정 · 피드백<span className="line" />
            </div>
            {recogs.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-border px-5 py-12 text-center text-foreground-muted">
                <div className="mb-2 text-[26px]">💬</div>
                <div className="mb-1.5 text-[15px] font-semibold text-foreground">
                  받은 인정 · 피드백이 없어요
                </div>
                <p className="text-[12.5px] leading-relaxed">
                  동료가 나에게 보낸 인정과 피드백 메시지가 여기에 표시돼요.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recogs.map((r) => (
                  <article
                    key={r.id}
                    className="group rounded-[12px] border border-border bg-background-primary p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700">
                        {r.emoji || '⭐'} 인정
                      </span>
                      <span className="text-[12.5px] font-medium text-foreground">
                        {r.from_name}님이 보냄
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
                      {r.message}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
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

function EmptyNews() {
  return (
    <div
      style={{
        padding: '60px 20px',
        textAlign: 'center',
        border: '1px dashed var(--border)',
        borderRadius: 14,
        color: 'var(--fg-muted)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
        등록된 공지사항이 없어요
      </div>
      <div style={{ fontSize: 12.5 }}>회사 공지사항을 작성하면 전 구성원에게 전달됩니다.</div>
    </div>
  )
}
