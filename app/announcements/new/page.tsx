import Link from 'next/link'
import { postAnnouncement } from '../actions'

export const dynamic = 'force-dynamic'

// 공지 작성 폼 — server component, postAnnouncement Server Action 으로 직접 제출.
export default function NewAnnouncementPage() {
  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/" className="h-sub" style={{ textDecoration: 'none' }}>← 홈</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>공지 작성</h1>
          <div className="h-sub">전 구성원에게 공지를 올려요</div>
        </div>
      </div>

      <form action={postAnnouncement} className="apply-card">
        <div className="form-grid">
          <div className="fg-field full">
            <label>제목 *</label>
            <input name="title" required className="ctl-in" placeholder="공지 제목" />
          </div>
          <div className="fg-field full">
            <label>내용 *</label>
            <textarea name="content" required rows={6} className="ctl-in" placeholder="공지 내용을 입력하세요" />
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/" className="btn btn-outline">취소</Link>
          <button type="submit" className="btn btn-primary">게시</button>
        </div>
      </form>
    </div>
  )
}
