import Link from 'next/link'
import { createDocument } from '../actions'

// 문서 추가 — server component 폼. createDocument Server Action 으로 직접 제출(R3).
// members/new 와 동일한 apply-card 디자인.
export default function NewDocumentPage() {
  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/documents" className="h-sub" style={{ textDecoration: 'none' }}>
            ← 문서·증명서
          </Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>
            문서 추가
          </h1>
          <div className="h-sub">회사 공용 문서·공지·정책 자료를 등록하세요</div>
        </div>
      </div>

      <form action={createDocument} className="apply-card">
        <div className="form-grid">
          <div className="fg-field" style={{ gridColumn: '1 / -1' }}>
            <label>제목 *</label>
            <input name="title" required className="ctl-in" placeholder="2026년 취업규칙" />
          </div>
          <div className="fg-field">
            <label>분류</label>
            <select name="category" className="ctl-in" defaultValue="GENERAL">
              <option value="GENERAL">일반</option>
              <option value="NOTICE">공지</option>
              <option value="POLICY">정책</option>
            </select>
          </div>
          <div className="fg-field" style={{ gridColumn: '1 / -1' }}>
            <label>파일 링크 (URL)</label>
            <input name="file_url" type="url" className="ctl-in" placeholder="https://..." />
            <div className="h-sub" style={{ marginTop: 6, fontSize: 12 }}>
              문서를 올린 클라우드(드라이브 등) 공유 링크를 붙여넣으세요. 비워두면 제목만 등록돼요.
            </div>
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/documents" className="btn btn-outline">
            취소
          </Link>
          <button type="submit" className="btn btn-primary">
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
