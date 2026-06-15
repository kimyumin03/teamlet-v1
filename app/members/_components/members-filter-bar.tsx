'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// 원본 teamlet MembersFilterBar 그대로 — 상태/근로유형 드롭다운 + 검색(URL 쿼리로 페이지 필터).
function FilterDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const selected = value ? options.find((o) => o.value === value) : null

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          height: 32, display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0 10px 0 12px', borderRadius: 999,
          border: `1px solid ${open ? 'var(--border-strong)' : 'var(--border)'}`,
          background: 'var(--bg-primary)', cursor: 'pointer',
          fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: 'inherit',
          whiteSpace: 'nowrap', transition: 'border-color 120ms',
        }}
      >
        {selected ? <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{selected.label}</span> : placeholder}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', color: 'var(--fg-subtle)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
          minWidth: 160, padding: '4px 0', overflow: 'hidden',
        }}>
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 14px', fontSize: 13, cursor: 'pointer',
              background: value === '' ? 'var(--primary-soft)' : 'none',
              color: value === '' ? 'var(--primary)' : 'var(--fg-muted)',
              fontWeight: value === '' ? 600 : 400, border: 'none', fontFamily: 'inherit',
            }}
          >
            {placeholder}
          </button>
          {options.filter((o) => o.value !== '').map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                background: value === opt.value ? 'var(--primary-soft)' : 'none',
                color: value === opt.value ? 'var(--primary)' : 'var(--fg)',
                fontWeight: value === opt.value ? 600 : 400, border: 'none', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
              onMouseLeave={(e) => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MembersFilterBar({ initialQ }: { initialQ: string }) {
  const params = useSearchParams()
  const router = useRouter()

  function navigate(overrides: Record<string, string>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.push(`/members?${next.toString()}`)
  }

  const dept = params.get('department') ?? ''
  const status = params.get('status') ?? ''
  const empType = params.get('empType') ?? ''

  const statusOptions = [
    { value: '', label: '재직 상태 · 전체' },
    { value: 'ACTIVE', label: '재직' },
    { value: 'PROBATION', label: '수습' },
    { value: 'ON_LEAVE', label: '휴직' },
    { value: 'SECONDED', label: '파견' },
    { value: 'SCHEDULED', label: '입사예정' },
    { value: 'RESIGNED', label: '퇴직' },
  ]
  const empTypeOptions = [
    { value: '', label: '근로유형 · 전체' },
    { value: 'FULL_TIME', label: '정규' },
    { value: 'PART_TIME', label: '파트' },
    { value: 'CONTRACT', label: '계약' },
    { value: 'INTERN', label: '인턴' },
    { value: 'DISPATCH', label: '파견' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <FilterDropdown value={status} onChange={(v) => navigate({ department: dept, status: v, empType })} options={statusOptions} placeholder="재직 상태" />
      <FilterDropdown value={empType} onChange={(v) => navigate({ department: dept, status, empType: v })} options={empTypeOptions} placeholder="근로유형" />

      <div style={{ flex: 1 }} />

      <div style={{ position: 'relative', width: 200 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--fg-subtle)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          defaultValue={initialQ}
          placeholder="이름 · 사번 · 이메일"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate({ department: dept, status, empType, q: (e.target as HTMLInputElement).value })
            }
          }}
          style={{
            height: 32, width: '100%', borderRadius: 999,
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
            paddingLeft: 30, paddingRight: 10, fontSize: 12.5,
            color: 'var(--fg)', fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}
