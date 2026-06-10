import Link from 'next/link'
import { createEmployee } from '../actions'

// 구성원 추가 — server component 폼. createEmployee Server Action 으로 직접 제출(R3).
export default function NewMemberPage() {
  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/members" className="h-sub" style={{ textDecoration: 'none' }}>
            ← 구성원
          </Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>
            구성원 추가
          </h1>
          <div className="h-sub">새 직원 정보를 입력하세요</div>
        </div>
      </div>

      <form action={createEmployee} className="apply-card">
        <div className="form-grid">
          <div className="fg-field">
            <label>이름 *</label>
            <input name="name" required className="ctl-in" placeholder="홍길동" />
          </div>
          <div className="fg-field">
            <label>이메일 *</label>
            <input name="email" type="email" required className="ctl-in" placeholder="hong@example.com" />
          </div>
          <div className="fg-field">
            <label>부서</label>
            <input name="department" className="ctl-in" placeholder="개발" />
          </div>
          <div className="fg-field">
            <label>직책</label>
            <input name="position" className="ctl-in" placeholder="백엔드 엔지니어" />
          </div>
          <div className="fg-field">
            <label>재직 상태</label>
            <select name="status" className="ctl-in" defaultValue="재직">
              <option value="재직">재직</option>
              <option value="휴직">휴직</option>
              <option value="퇴직">퇴직</option>
            </select>
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/members" className="btn btn-outline">
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
