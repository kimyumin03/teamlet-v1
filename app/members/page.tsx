import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments, positions, roles, userRoles } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { DepartmentSidebar, type DepartmentNode } from './_components/department-sidebar'
import { OrgTree } from './_components/org-tree'

// 구성원 디렉토리 — 원본 teamlet 그대로. 데이터는 자체 DB(Neon)의 실제 employees.
export const dynamic = 'force-dynamic'

const UNASSIGNED = '__none__'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '재직',
  PROBATION: '수습',
  ON_LEAVE: '휴직',
  SECONDED: '파견',
  RESIGNED: '퇴직',
  SCHEDULED: '입사예정',
}
const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'ok',
  PROBATION: 'wait',
  ON_LEAVE: 'end',
  SECONDED: 'run',
  RESIGNED: 'end',
  SCHEDULED: 'wait',
}
const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: '정규',
  PART_TIME: '파트',
  CONTRACT: '계약',
  INTERN: '인턴',
  DISPATCH: '파견',
}

function formatHireDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

type Emp = {
  id: string
  name: string
  employeeNumber: string | null
  companyEmail: string | null
  departmentId: string | null
  departmentName: string | null
  positionName: string | null
  hireDate: Date | null
  employmentType: string | null
  employmentStatus: string | null
  isActive: boolean | null
  roleName: string | null
}

async function loadMembers(companyId: string): Promise<{ emps: Emp[]; depts: DepartmentNode[] }> {
  const db = getDb()

  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeNumber: employees.employeeNumber,
      companyEmail: employees.companyEmail,
      departmentId: employees.departmentId,
      departmentName: departments.name,
      positionName: positions.name,
      hireDate: employees.hireDate,
      employmentType: employees.employmentType,
      employmentStatus: employees.employmentStatus,
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.companyId, companyId))
    .orderBy(employees.name)

  // 역할(권한): user_roles → roles, employeeId 별 첫 역할명
  const roleRows = await db
    .select({ employeeId: userRoles.employeeId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.isActive, true), eq(roles.companyId, companyId)))
  const roleMap = new Map<string, string>()
  for (const r of roleRows) if (!roleMap.has(r.employeeId)) roleMap.set(r.employeeId, r.roleName)

  const emps: Emp[] = rows.map((r) => ({ ...r, roleName: roleMap.get(r.id) ?? null }))

  // 부서 목록 + 부서별 인원수 (사이드바)
  const deptRows = await db
    .select({ id: departments.id, parentId: departments.parentId, name: departments.name, sortOrder: departments.sortOrder })
    .from(departments)
    .where(and(eq(departments.companyId, companyId), eq(departments.isActive, true)))
  const count = new Map<string, number>()
  for (const e of emps) if (e.departmentId) count.set(e.departmentId, (count.get(e.departmentId) ?? 0) + 1)
  const depts: DepartmentNode[] = deptRows.map((d) => ({
    id: d.id,
    parentId: d.parentId,
    name: d.name,
    sortOrder: d.sortOrder ?? 0,
    memberCount: count.get(d.id) ?? 0,
  }))

  return { emps, depts }
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; q?: string; status?: string; empType?: string; view?: string }>
}) {
  const params = await searchParams
  const selected = params.department ?? null
  const query = (params.q ?? '').trim().toLowerCase()
  const statusFilter = params.status ?? ''
  const empTypeFilter = params.empType ?? ''
  const view = params.view === 'org' ? 'org' : 'list'

  const user = getCurrentUser()
  const { emps: allEmployees, depts } = await loadMembers(user.companyId)

  // 헤더 요약 통계
  const employedCount = allEmployees.filter(
    (e) => e.employmentStatus === 'ACTIVE' || e.employmentStatus === 'PROBATION' || e.employmentStatus === 'SECONDED',
  ).length
  const onLeaveCount = allEmployees.filter((e) => e.employmentStatus === 'ON_LEAVE').length
  const scheduledCount = allEmployees.filter((e) => e.employmentStatus === 'SCHEDULED').length
  const unassignedCount = allEmployees.filter((e) => !e.departmentId).length

  const filtered = allEmployees.filter((e) => {
    if (selected === UNASSIGNED && e.departmentId) return false
    if (selected && selected !== UNASSIGNED && e.departmentId !== selected) return false
    if (statusFilter && e.employmentStatus !== statusFilter) return false
    if (empTypeFilter && e.employmentType !== empTypeFilter) return false
    if (!query) return true
    return (
      e.name.toLowerCase().includes(query) ||
      (e.employeeNumber?.toLowerCase().includes(query) ?? false) ||
      (e.companyEmail?.toLowerCase().includes(query) ?? false)
    )
  })

  const makeViewHref = (v: string) => {
    const sp = new URLSearchParams()
    if (selected) sp.set('department', selected)
    if (query) sp.set('q', query)
    if (statusFilter) sp.set('status', statusFilter)
    if (empTypeFilter) sp.set('empType', empTypeFilter)
    if (v !== 'list') sp.set('view', v)
    const qs = sp.toString()
    return `/members${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mbr-wrap">
      <DepartmentSidebar
        departments={depts}
        selected={selected}
        totalCount={allEmployees.length}
        unassignedCount={unassignedCount}
      />

      <div className="mbr-main">
        {/* 헤더 */}
        <div className="shrink-0 px-8 pt-7 pb-3">
          <div className="page-h" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="h-title">구성원</h1>
              <div className="h-sub">
                전체 {allEmployees.length}명
                {employedCount > 0 && ` · 재직 ${employedCount}`}
                {onLeaveCount > 0 && ` · 휴직 ${onLeaveCount}`}
                {scheduledCount > 0 && ` · 입사예정 ${scheduledCount}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="vtog">
                <Link href={makeViewHref('list')} className={`v${view === 'list' ? ' active' : ''}`}>
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                  리스트
                </Link>
                <Link href={makeViewHref('org')} className={`v${view === 'org' ? ' active' : ''}`}>
                  <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-2h12v2" /></svg>
                  조직도
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-auto px-8 pb-10">
          {view === 'org' ? (
            depts.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>등록된 부서가 없어요</div>
                <div style={{ fontSize: '12.5px' }}>부서를 먼저 추가해 주세요.</div>
              </div>
            ) : (
              <OrgTree
                departments={depts}
                employees={allEmployees
                  .filter((e) => e.isActive !== false && e.employmentStatus !== 'RESIGNED')
                  .map((e) => ({ id: e.id, name: e.name, positionName: e.positionName, departmentId: e.departmentId }))}
              />
            )
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>
                {query ? '검색 결과가 없어요' : '구성원이 없어요'}
              </div>
              <div style={{ fontSize: '12.5px' }}>
                {query ? '다른 키워드로 검색해 보세요.' : '구성원을 등록해 주세요.'}
              </div>
            </div>
          ) : (
            <>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}><span className="cb-box" /></th>
                    <th style={{ width: '22%' }}>이름</th>
                    <th>사번</th>
                    <th>이메일</th>
                    <th>조직 · 직책</th>
                    <th>입사일</th>
                    <th>근로유형</th>
                    <th>상태</th>
                    <th>권한</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr key={emp.id} style={emp.employmentStatus === 'RESIGNED' ? { opacity: 0.5 } : undefined}>
                      <td><span className="cb-box" /></td>
                      <td>
                        <Link href={`/members/${emp.id}`} className="ppl" style={{ textDecoration: 'none' }}>
                          <div className="av">{emp.name.slice(-2)}</div>
                          <div>
                            <div className="n">{emp.name}</div>
                            <div className="m" style={{ fontSize: '11.5px' }}>{emp.companyEmail ?? emp.departmentName ?? '—'}</div>
                          </div>
                        </Link>
                      </td>
                      <td><span className="sn">{emp.employeeNumber ?? '—'}</span></td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--fg-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {emp.companyEmail ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="role-cell">
                          <div className="r">{emp.departmentName ?? '—'}</div>
                          {emp.positionName && <div className="o">{emp.positionName}</div>}
                        </div>
                      </td>
                      <td><span className="sn">{formatHireDate(emp.hireDate)}</span></td>
                      <td><span className="tag">{EMP_TYPE_LABEL[emp.employmentType ?? ''] ?? '—'}</span></td>
                      <td><span className={`st ${STATUS_CLS[emp.employmentStatus ?? ''] ?? ''}`}>{STATUS_LABEL[emp.employmentStatus ?? ''] ?? '—'}</span></td>
                      <td>
                        {emp.roleName ? (
                          <span className="tag adm">{emp.roleName}</span>
                        ) : (
                          <span className="tag" style={{ color: 'var(--fg-subtle)' }}>일반</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>{filtered.length}명 표시{filtered.length !== allEmployees.length && ` (전체 ${allEmployees.length}명)`}</span>
                <span>1 – {filtered.length}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
