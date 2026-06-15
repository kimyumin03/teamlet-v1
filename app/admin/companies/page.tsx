import { getDb } from '@/lib/db'
import { companies, employees } from '@/lib/db/schema'

// 회사 목록 (admin) — 플랫폼 전체 회사. 원본 teamlet 그대로 (읽기 전용).
export const dynamic = 'force-dynamic'

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default async function AdminCompaniesPage() {
  let list: { id: string; name: string; businessNumber: string | null; companyCode: string | null; isActive: boolean | null; createdAt: Date | null; employeeCount: number }[] = []
  try {
    const db = getDb()
    const cs = await db.select({ id: companies.id, name: companies.name, businessNumber: companies.businessNumber, companyCode: companies.companyCode, isActive: companies.isActive, createdAt: companies.createdAt }).from(companies)
    const emps = await db.select({ companyId: employees.companyId }).from(employees)
    const cnt = new Map<string, number>()
    for (const e of emps) if (e.companyId) cnt.set(e.companyId, (cnt.get(e.companyId) ?? 0) + 1)
    list = cs.map((c) => ({ ...c, employeeCount: cnt.get(c.id) ?? 0 }))
  } catch (err) {
    console.error('[db] admin companies load 실패', err)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">회사 목록</h1>
      <p className="mt-1 text-sm text-foreground-muted">플랫폼에 등록된 전체 회사 {list.length}개</p>

      {list.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-background-primary px-4 py-8 text-center text-sm text-foreground-muted">아직 등록된 회사가 없어요.</p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background-secondary text-left text-xs text-foreground-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">회사명</th>
                <th className="px-4 py-2.5 font-medium">사업자번호</th>
                <th className="px-4 py-2.5 font-medium">회사코드</th>
                <th className="px-4 py-2.5 font-medium">직원</th>
                <th className="px-4 py-2.5 font-medium">상태</th>
                <th className="px-4 py-2.5 font-medium">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background-primary">
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-foreground-muted">{c.businessNumber ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-muted">{c.companyCode ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground-muted">{c.employeeCount}명</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${c.isActive !== false ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-border bg-background-secondary text-foreground-subtle'}`}>
                      {c.isActive !== false ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground-subtle">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
