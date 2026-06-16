'use server'

// 전역 검색(커맨드 팔레트 ⌘K) 서버 액션 — drizzle + Neon 직결.
// 원본 lib/actions/search.ts 의 의미를 동일하게 재현:
//   - searchEmployeesAction: 같은 회사 활성 구성원을 이름으로 부분검색(대소문자 무시), 최대 8명.
//   - getSearchPreviewAction: 팔레트 빈 상태 미리보기(오늘의 이벤트). 홈/employee 모듈(다른 영역) 소관이라
//     여기서는 cross-area 의존을 피하려 안전한 빈 목록을 반환해요(런타임 안전). 시그니처는 원본과 동일.

import { redirect } from 'next/navigation'
import { and, asc, eq, ilike } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

export type EmployeeSearchResult = {
  id: string
  name: string
  departmentName: string | null
  positionName: string | null
  companyEmail: string | null
}

// 원본 @teamlet/modules/employee 의 HomeEventItem 와 동일 형태(미리보기용).
export type HomeEventItem = {
  id: string
  type: string
  title: string
  date: Date
  employeeName?: string | null
}

export async function searchEmployeesAction(query: string): Promise<EmployeeSearchResult[]> {
  const user = await getCurrentUser()
  if (!user?.employeeId) redirect('/login')

  if (!query.trim() || query.trim().length < 1) return []

  try {
    const rows = await getDb()
      .select({
        id: employees.id,
        name: employees.name,
        companyEmail: employees.companyEmail,
        departmentName: departments.name,
        positionName: positions.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(
        and(
          eq(employees.companyId, user.companyId),
          eq(employees.isActive, true),
          ilike(employees.name, `%${query.trim()}%`),
        ),
      )
      .orderBy(asc(employees.name))
      .limit(8)

    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      departmentName: e.departmentName ?? null,
      positionName: e.positionName ?? null,
      companyEmail: e.companyEmail ?? null,
    }))
  } catch (e) {
    console.error('[search] searchEmployeesAction 실패', e)
    return []
  }
}

/** 팔레트 열릴 때 빈 상태에 보여줄 오늘의 이벤트 — 홈 영역 소관이라 안전한 빈 목록(런타임 안전). */
export async function getSearchPreviewAction(): Promise<HomeEventItem[]> {
  return []
}
