// 아직 이식 전 모듈의 자리표시 페이지 (teamlet design.css 사용).
export function Coming({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">{title}</h1>
          <div className="h-sub">{sub}</div>
        </div>
      </div>
      <div
        style={{
          border: '1px dashed var(--border)',
          borderRadius: 14,
          background: 'var(--bg-primary)',
          padding: '56px 24px',
          textAlign: 'center',
          color: 'var(--fg-muted)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>곧 이식 예정이에요</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>
          teamlet 의 이 모듈을 axhub 위로 옮기는 작업이 진행 중이에요.
        </div>
      </div>
    </div>
  )
}
