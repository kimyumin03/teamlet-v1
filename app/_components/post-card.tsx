'use client'

import { useState } from 'react'

// teamlet feed-tab.tsx 의 PostCard 그대로 (lucide → 인라인 SVG, 시각 동일).
const MONTH_KO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export type Announcement = {
  id: string
  authorName: string
  title: string
  content: string
  createdAt: string
  isPinned: boolean
}

function formatRelative(d: Date) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 60) return `${diff}분 전`
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
  return `${Math.floor(diff / 1440)}일 전`
}

const IconThumbsUp = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
)
const IconHeart = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)
const IconPin = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1Z" />
  </svg>
)

const REACTIONS = [
  { key: 'clap', icon: IconThumbsUp },
  { key: 'heart', icon: IconHeart },
] as const

export function PostCard({ item }: { item: Announcement }) {
  const date = new Date(item.createdAt)
  const [counts, setCounts] = useState<Record<string, number>>({ clap: 0, heart: 0 })
  const [active, setActive] = useState<Record<string, boolean>>({})

  function toggle(key: string) {
    const on = !active[key]
    setActive((p) => ({ ...p, [key]: on }))
    setCounts((p) => ({ ...p, [key]: Math.max(0, (p[key] ?? 0) + (on ? 1 : -1)) }))
  }

  return (
    <article className="post">
      <div className="post-h">
        <div className="av">{item.authorName?.slice(-2) ?? '??'}</div>
        <div className="who-block">
          <div className="who">
            {item.authorName} <span className="role">· 공지사항</span>
          </div>
          <div className="meta">{formatRelative(date)}</div>
        </div>
        {item.isPinned && (
          <span className="pin">{IconPin} 고정</span>
        )}
      </div>
      <div className="post-b">
        <h3>{item.title}</h3>
        <div className="text">{item.content}</div>
      </div>
      <div className="post-f">
        {REACTIONS.map(({ key, icon }) => (
          <button
            key={key}
            className="react"
            onClick={() => toggle(key)}
            style={active[key] ? { background: 'var(--primary-soft)', color: 'var(--primary)' } : {}}
          >
            {icon} {(counts[key] ?? 0) > 0 && <b>{counts[key]}</b>}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--fg-subtle)' }}>
          {MONTH_KO[date.getMonth()]} {date.getDate()}
        </span>
      </div>
    </article>
  )
}
