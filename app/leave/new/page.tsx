import Link from 'next/link'
import { requestLeave } from '../actions'

// 휴가 신청 폼 — teamlet apply-card 디자인. createEmployee 와 동일 패턴(server action).
export default function NewLeavePage() {
  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/leave" className="h-sub" style={{ textDecoration: 'none' }}>
            ← 내 휴가
          </Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>
            휴가 신청
          </h1>
          <div className="h-sub">신청 내용을 입력하세요</div>
        </div>
      </div>

      <form action={requestLeave} className="apply-card">
        <h3>휴가 신청</h3>
        <div className="form-grid">
          <div className="fg-field">
            <label>휴가 종류</label>
            <select name="leave_type" className="ctl-in" defaultValue="연차">
              <option value="연차">연차</option>
              <option value="병가">병가</option>
              <option value="경조사">경조사</option>
            </select>
          </div>
          <div className="fg-field" />
          <div className="fg-field">
            <label>시작일</label>
            <input name="start_date" type="date" required className="ctl-in" />
          </div>
          <div className="fg-field">
            <label>종료일</label>
            <input name="end_date" type="date" className="ctl-in" />
          </div>
          <div className="fg-field full">
            <label>사유</label>
            <textarea name="reason" rows={3} className="ctl-in" placeholder="휴가 사유를 입력하세요" />
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/leave" className="btn btn-outline">
            취소
          </Link>
          <button type="submit" className="btn btn-primary">
            신청
          </button>
        </div>
      </form>
    </div>
  )
}
