// 현재 로그인 사용자 — axhub 세션(me())으로 실제 로그인 사용자를 받아 employee 로 매핑해요.
// 매핑 경로: axhub me().email → users.email → user_company_memberships → employeeId/companyId
//   - axhub 미설정(로컬) 또는 me() 실패: 데모 직원으로 폴백
//   - me() 성공했지만 매핑되는 직원이 없으면: 데모 폴백
// ⚠️ 여기서만 axhub identity(me) 를 다시 써요. 데이터(구성원/회사) 읽기는 여전히 Neon 직결이에요.
import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { isAxhubConfigured, makeAxhub } from './axhub-server'
import { getDb } from './db'
import { users, userCompanyMemberships } from './db/schema'

export type CurrentUser = { employeeId: string; name: string; companyId: string }

// 데모 기본값 (로컬·미인증·매핑 실패 시 폴백). 김민준 / 회사 cmq7v3cyy...
const DEMO: CurrentUser = {
  employeeId: 'cmq7v3e96001mwer06ubk0vtc',
  name: '김민준',
  companyId: 'cmq7v3cyy000swer045bbwytj',
}

// React cache(): 같은 요청 안에서 여러 번 불러도 me() 는 한 번만 (layout + 페이지 중복 제거).
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  if (!isAxhubConfigured()) return DEMO
  try {
    const me = await (await makeAxhub()).identity.me()
    const email = me?.email
    if (!email) return DEMO

    const db = getDb()
    const u = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1)
    if (!u.length) return DEMO

    const mem = await db
      .select({ employeeId: userCompanyMemberships.employeeId, companyId: userCompanyMemberships.companyId })
      .from(userCompanyMemberships)
      .where(eq(userCompanyMemberships.userId, u[0].id))
      .limit(1)
    if (!mem.length || !mem[0].employeeId) return DEMO

    return { employeeId: mem[0].employeeId, companyId: mem[0].companyId, name: me?.name ?? u[0].name ?? '사용자' }
  } catch (err) {
    console.error('[auth] getCurrentUser 실패 — 데모로 폴백', err)
    return DEMO
  }
})
