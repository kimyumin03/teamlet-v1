import { AxHubError, where } from '@ax-hub/sdk'
import Link from 'next/link'
import { isAxhubConfigured, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

// 구성원(직원) 디렉토리 — axhub 동적 테이블 `employees` 를 회사(company_id) 필터로 조회.
// teamlet 인사 데이터는 axhub 가 주는 테넌트 멤버십이 아니라 이 테이블이 source-of-truth
// (부서·직책·재직상태 등 풍부한 HR 필드). 로그인 사용자 세션으로 인증 (R3).
type Employee = {
  id: string
  company_id: string
  name: string
  email: string
  department: string
  position: string
  status: string
}

async function loadEmployees(): Promise<Employee[] | null> {
  if (!isAxhubConfigured()) return null
  try {
    const employees = await table<Employee>('employees')
    // 회사공유 테이블 → mass-scan guard 때문에 where 필수 (company_id = 현재 테넌트).
    const page = await employees.list({
      where: where('company_id').eq(TENANT),
      orderBy: [{ field: 'name', dir: 'asc' }],
      limit: 200,
    })
    return page.items
  } catch (err) {
    if (err instanceof AxHubError) {
      console.error('[axhub] employees.list failed', { code: err.code, category: err.category, requestId: err.requestId })
    }
    return null
  }
}

const STATUS_STYLE: Record<string, string> = {
  재직: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  휴직: 'bg-amber-50 text-amber-700',
  대기: 'bg-slate-100 text-slate-600',
}

export default async function MembersPage() {
  const employees = await loadEmployees()
  const configured = isAxhubConfigured()
  const active = employees?.filter((e) => e.status === '재직').length ?? 0
  const onLeave = employees?.filter((e) => e.status === '휴직').length ?? 0

  return (
    <main className="min-h-screen bg-[var(--bg-surface)] text-[var(--fg-default)]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]">
              ← 홈
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em]">구성원</h1>
            <p className="mt-0.5 text-sm text-[var(--fg-muted)]">회사 조직과 인사 정보를 한눈에</p>
          </div>
        </div>

        {/* KPI */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Kpi label="전체" value={employees?.length ?? 0} />
          <Kpi label="재직" value={active} />
          <Kpi label="휴직" value={onLeave} />
        </div>

        {/* 목록 */}
        {employees === null ? (
          <Empty
            text={
              configured
                ? '구성원 정보를 불러오지 못했어요. 로그인 상태를 확인해 주세요.'
                : '로컬 실행 중 — axhub 로 배포하면 구성원이 표시돼요.'
            }
          />
        ) : employees.length === 0 ? (
          <Empty text="아직 등록된 구성원이 없어요." />
        ) : (
          <ul className="divide-y divide-[var(--border-default)] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-content)]">
            {employees.map((e) => (
              <li key={e.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
                  {e.name?.trim().charAt(0) ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {e.name}
                    <span className="ml-2 text-xs font-normal text-[var(--fg-subtle)]">{e.position}</span>
                  </p>
                  <p className="truncate text-xs text-[var(--fg-muted)]">
                    {e.department} · {e.email}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    STATUS_STYLE[e.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-content)] px-4 py-3.5">
      <p className="text-xs text-[var(--fg-muted)]">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-[-0.02em]">{value}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-content)] px-6 py-12 text-center text-sm text-[var(--fg-muted)]">
      {text}
    </div>
  )
}
