import Link from 'next/link'
import { createPosting } from '../actions'

// 채용 공고 작성 폼.
export const dynamic = 'force-dynamic'

export default function NewPostingPage() {
  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/recruit" className="h-sub" style={{ textDecoration: 'none' }}>← 채용</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>공고 만들기</h1>
          <div className="h-sub">새 채용 공고를 등록해요</div>
        </div>
      </div>

      <form action={createPosting} className="apply-card">
        <div className="form-grid">
          <div className="fg-field full">
            <label>공고 제목 *</label>
            <input name="title" required className="ctl-in" placeholder="예: 백엔드 엔지니어 (신입/경력)" />
          </div>
          <div className="fg-field full">
            <label>상세 설명</label>
            <textarea name="description" rows={6} className="ctl-in" placeholder="직무·자격요건·우대사항 등" />
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/recruit" className="btn btn-outline">취소</Link>
          <button type="submit" className="btn btn-primary">등록</button>
        </div>
      </form>
    </div>
  )
}
