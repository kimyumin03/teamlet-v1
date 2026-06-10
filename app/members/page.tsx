import { AxHubError, where } from '@ax-hub/sdk'
import Link from 'next/link'
import { isAxhubConfigured, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

// 구성원 디렉토리 — axhub 동적 테이블 `employees` 를 회사(company_id) 필터로 조회.
// teamlet design.css 의 .page-body / .kpis / .tbl / .ppl 디자인 적용.
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
    const page = await employees.list({
      where: where('company_id').eq(TENANT),
      orderBy: [{ field: 'name', dir: 'asc' }],
      limit: 200,
    })
    return page.items
  } catch (err) {
    if (err instanceof AxHubError) {
      console.error('[axhub] employees.list failed', { code: err.code, requestId: err.requestId })
    }
    return null
  }
}

function statusClass(status: string): string {
  if (status === '재직') return 'st ok'
  if (status === '휴직') return 'st wait'
  if (status === '퇴직') return 'st end'
  return 'st'
}

export default async function MembersPage() {
  const employees = await loadEmployees()
  const configured = isAxhubConfigured()
  const list = employees ?? []
  const active = list.filter((e) => e.status === '재직').length
  const onLeave = list.filter((e) => e.status === '휴직').length
  const deptCount = new Set(list.map((e) => e.department).filter(Boolean)).size

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title">구성원</h1>
          <div className="h-sub">회사 조직과 인사 정보를 한눈에</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/members/new" className="btn btn-primary">
            구성원 추가
          </Link>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="lbl">전체</span>
          <span className="val">
            {list.length}
            <small>명</small>
          </span>
        </div>
        <div className="kpi">
          <span className="lbl">재직</span>
          <span className="val">
            {active}
            <small>명</small>
          </span>
        </div>
        <div className="kpi">
          <span className="lbl">휴직</span>
          <span className="val">
            {onLeave}
            <small>명</small>
          </span>
        </div>
        <div className="kpi">
          <span className="lbl">부서</span>
          <span className="val">
            {deptCount}
            <small>개</small>
          </span>
        </div>
      </div>

      {employees === null ? (
        <Empty
          text={
            configured
              ? '구성원 정보를 불러오지 못했어요. 로그인 상태를 확인해 주세요.'
              : '로컬 실행 중 — axhub 로 배포하면 구성원이 표시돼요.'
          }
        />
      ) : list.length === 0 ? (
        <Empty text="아직 등록된 구성원이 없어요." />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>이름</th>
              <th>부서</th>
              <th>직책</th>
              <th>이메일</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="ppl">
                    <div className="av">{e.name?.trim().charAt(0) ?? '?'}</div>
                    <div>
                      <div className="n">{e.name}</div>
                      <div className="m">{e.email}</div>
                    </div>
                  </div>
                </td>
                <td>{e.department || '—'}</td>
                <td>{e.position || '—'}</td>
                <td className="sn">{e.email}</td>
                <td>
                  <span className={statusClass(e.status)}>{e.status || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border)',
        borderRadius: 14,
        background: 'var(--bg-primary)',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--fg-muted)',
        fontSize: 13,
      }}
    >
      {text}
    </div>
  )
}
