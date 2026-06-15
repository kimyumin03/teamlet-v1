'use client'

import { useEffect } from 'react'

// 재사용 모달(창) — 오버레이 + 중앙 카드. 원본 teamlet 의 Dialog 인터랙션 대체(경량).
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = 460,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,18,25,0.42)', display: 'grid', placeItems: 'center', padding: 20, animation: 'tlmodal-fade 120ms ease' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ width, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}
      >
        {(title || description) && (
          <div style={{ marginBottom: 16 }}>
            {title && <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{title}</h2>}
            {description && <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 4 }}>{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
