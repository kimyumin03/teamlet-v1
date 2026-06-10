import Link from 'next/link'
import { AxHubError, where, type MeResponse } from '@ax-hub/sdk'
import { isAxhubConfigured, makeAxhub, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

async function loadMe(): Promise<MeResponse | null> {
  if (!isAxhubConfigured()) return null
  try {
    return await (await makeAxhub()).identity.me()
  } catch (err) {
    if (err instanceof AxHubError) console.error('[axhub] /me failed', { code: err.code })
    return null
  }
}

async function memberCount(): Promise<number | null> {
  if (!isAxhubConfigured()) return null
  try {
    const employees = await table<{ id: string; company_id: string }>('employees')
    return await employees.count({ where: where('company_id').eq(TENANT) })
  } catch {
    return null
  }
}

export default async function Home() {
  const [me, count] = await Promise.all([loadMe(), memberCount()])
  const name = me?.name ?? me?.email ?? '게스트'

  return (
    <div className="page-body">
      <div className="page-h">
        <div>
          <h1 className="h-title-h">
            안녕하세요, {name}님 <span className="wave">👋</span>
          </h1>
          <div className="h-sub-h">
            {me?.tenants?.[0]?.tenantSlug ?? 'Teamlet'} · 오늘도 좋은 하루 되세요
            <span className="ping">
              <i /> axhub 연결됨
            </span>
          </div>
        </div>
      </div>

      <div className="kpis">
        <Link href="/members" className="kpi">
          <span className="lbl">구성원</span>
          <span className="val">
            {count ?? '—'}
            <small>명</small>
          </span>
          <span className="delta">회사 전체 인원</span>
        </Link>
        <Link href="/leave" className="kpi">
          <span className="lbl">휴가</span>
          <span className="val">—</span>
          <span className="delta">곧 이식 예정</span>
        </Link>
        <Link href="/workflow" className="kpi">
          <span className="lbl">결재 대기</span>
          <span className="val">—</span>
          <span className="delta">곧 이식 예정</span>
        </Link>
        <Link href="/documents" className="kpi">
          <span className="lbl">문서·증명서</span>
          <span className="val">—</span>
          <span className="delta">곧 이식 예정</span>
        </Link>
      </div>

      <div className="sec-divider">
        바로가기 <span className="line" />
      </div>
      <div className="kpis" style={{ marginBottom: 0 }}>
        <Link href="/members" className="kpi">
          <span className="lbl">구성원 관리</span>
          <span className="val" style={{ fontSize: 16 }}>
            조직·인사 →
          </span>
        </Link>
        <Link href="/leave" className="kpi">
          <span className="lbl">휴가</span>
          <span className="val" style={{ fontSize: 16 }}>
            연차·신청 →
          </span>
        </Link>
        <Link href="/workflow" className="kpi">
          <span className="lbl">워크플로우</span>
          <span className="val" style={{ fontSize: 16 }}>
            결재·공지 →
          </span>
        </Link>
        <Link href="/settings" className="kpi">
          <span className="lbl">설정</span>
          <span className="val" style={{ fontSize: 16 }}>
            회사·개인 →
          </span>
        </Link>
      </div>
    </div>
  )
}
