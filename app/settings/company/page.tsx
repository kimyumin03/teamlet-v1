import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { updateCompany } from './actions'

// 회사 정보 수정 — 현재값 미리채움 폼.
export const dynamic = 'force-dynamic'

export default async function CompanySettingsPage() {
  const user = await getCurrentUser()
  let c: { name: string; businessNumber: string | null; phone: string | null; addressRoad: string | null; addressDetail: string | null } = {
    name: '',
    businessNumber: null,
    phone: null,
    addressRoad: null,
    addressDetail: null,
  }
  try {
    const rows = await getDb()
      .select({ name: companies.name, businessNumber: companies.businessNumber, phone: companies.phone, addressRoad: companies.addressRoad, addressDetail: companies.addressDetail })
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1)
    if (rows[0]) c = rows[0]
  } catch (err) {
    console.error('[db] company load 실패', err)
  }

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>
      <div className="page-h">
        <div>
          <Link href="/settings" className="h-sub" style={{ textDecoration: 'none' }}>← 설정</Link>
          <h1 className="h-title" style={{ marginTop: 4 }}>회사 정보 수정</h1>
          <div className="h-sub">회사 기본 정보를 수정해요</div>
        </div>
      </div>

      <form action={updateCompany} className="apply-card">
        <div className="form-grid">
          <div className="fg-field">
            <label>회사명 *</label>
            <input name="name" required defaultValue={c.name} className="ctl-in" />
          </div>
          <div className="fg-field">
            <label>사업자번호</label>
            <input name="businessNumber" defaultValue={c.businessNumber ?? ''} className="ctl-in" placeholder="000-00-00000" />
          </div>
          <div className="fg-field">
            <label>연락처</label>
            <input name="phone" defaultValue={c.phone ?? ''} className="ctl-in" placeholder="02-0000-0000" />
          </div>
          <div className="fg-field" />
          <div className="fg-field">
            <label>주소 (도로명)</label>
            <input name="addressRoad" defaultValue={c.addressRoad ?? ''} className="ctl-in" placeholder="서울특별시 ..." />
          </div>
          <div className="fg-field">
            <label>상세 주소</label>
            <input name="addressDetail" defaultValue={c.addressDetail ?? ''} className="ctl-in" placeholder="0층 0호" />
          </div>
        </div>
        <div className="apply-actions">
          <Link href="/settings" className="btn btn-outline">취소</Link>
          <button type="submit" className="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  )
}
