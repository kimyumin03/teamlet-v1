'use client'

import { useState } from 'react'
import Link from 'next/link'

// 원본 teamlet ProfileShell 그대로 이식 (디자인·마크업 유지).
// ⚠️ 쓰기/권한 기능(수정·비활성·초대·발령등록·권한관리)은 로그인·권한 보류라
//    canManageEmployee=false 로 숨겨요(원본도 동일 동작). 경력/학력/가족 탭은 읽기 전용 인라인.

type LeaveBalance = { leaveTypeName: string; granted: number; used: number; adjusted: number; remaining: number }
type RoleItem = { id: string; name: string }
export type EmployeeDetail = {
  id: string
  name: string
  employmentStatus: string
  employmentType: string
  departmentName: string | null
  positionName: string | null
  departmentId: string | null
  positionId: string | null
  employeeNumber: string | null
  hireDate: Date | null
  gender: string | null
  birthDate: Date | null
  phone: string | null
  createdAt: Date | null
  companyEmail: string | null
  personalEmail: string | null
  probationEndDate: Date | null
  resignedAt: Date | null
  isActive: boolean
  hasLinkedAccount: boolean
  leaveBalances: LeaveBalance[]
  roles: RoleItem[]
}
type AppointmentItem = {
  id: string
  kind: string
  toDepartmentName: string | null
  toPositionName: string | null
  fromDepartmentName: string | null
  fromPositionName: string | null
  effectiveDate: Date | null
  memo: string | null
  appointedByName: string | null
  createdAt: Date | null
}
type LeaveRequestItem = { id: string; leaveTypeName: string; startDate: Date | null; endDate: Date | null; days: number; status: string }
type DocumentListItem = { id: string; title: string; currentStep: number | null; totalSteps: number; createdAt: Date | null; status: string }

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '재직', PROBATION: '수습', ON_LEAVE: '휴직', SECONDED: '파견', RESIGNED: '퇴직', SCHEDULED: '입사예정',
}
const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: '정규직', PART_TIME: '파트타임', CONTRACT: '계약직', INTERN: '인턴', DISPATCH: '파견',
}
const GENDER_LABEL: Record<string, string> = { MALE: '남성', FEMALE: '여성', OTHER: '기타' }
const APPT_KIND_LABEL: Record<string, string> = {
  HIRE: '입사', TRANSFER: '부서 이동', PROMOTION: '직책 변경', LEAVE: '휴직', RETURN: '복직', SECONDMENT: '파견', RESIGNATION: '퇴직',
}
const LEAVE_STATUS_LABEL: Record<string, string> = {
  DRAFT: '임시저장', PENDING: '검토 중', APPROVED: '승인', REJECTED: '반려', CANCELLED: '취소',
}

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function PfField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="pf-field">
      <div className="lbl">{label}</div>
      <div className="val">{value || '—'}</div>
    </div>
  )
}

function Accordion({ title, count, children, defaultOpen = false }: {
  title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="accordion">
      <div className={`accordion-h${open ? ' open' : ''}`} onClick={() => setOpen((p) => !p)}>
        <span className="ttl">
          {title}
          {count !== undefined && <span className="cnt">{count}</span>}
        </span>
        <span className="arr">▾</span>
      </div>
      <div className={`accordion-b${open ? ' open' : ''}`}>{children}</div>
    </div>
  )
}

function ProgressBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0
  const remaining = total - used
  const color = remaining <= 0 ? 'var(--destructive)' : remaining <= 3 ? 'var(--warn)' : 'var(--primary)'
  return (
    <div style={{ marginTop: 6, height: 5, width: '100%', background: 'var(--bg-tertiary)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
    </div>
  )
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
function avatarBg(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? '#94A3B8'
}

function EmptyLine({ text }: { text: string }) {
  return <p style={{ padding: '12px 0', fontSize: 13, color: 'var(--fg-muted)' }}>{text}</p>
}

type TabKey = 'info' | 'appointment' | 'roles'

export function ProfileShell({
  emp, appointments, leaveHistory, workflowDocs,
  careerItems, educationItems, familyItems, initialTab,
}: {
  emp: EmployeeDetail
  appointments: AppointmentItem[]
  leaveHistory: LeaveRequestItem[]
  workflowDocs: DocumentListItem[]
  careerItems: unknown[]
  educationItems: unknown[]
  familyItems: unknown[]
  initialTab: TabKey
}) {
  const [tab, setTab] = useState<TabKey>(initialTab)
  const annualBalance = emp.leaveBalances.find((b) => b.leaveTypeName.includes('연차'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── 히어로 ── */}
      <div className="profile-hero">
        <div className="profile-av" style={{ background: `${avatarBg(emp.name)}22`, color: avatarBg(emp.name) }}>
          {emp.name.slice(-2)}
        </div>
        <div className="profile-meta">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 className="profile-name">
                {emp.name}
                <span className="st ok" style={{ fontSize: '12px' }}>{STATUS_LABEL[emp.employmentStatus] ?? emp.employmentStatus}</span>
              </h1>
              <p className="profile-sub">
                {[emp.departmentName, emp.positionName, EMP_TYPE_LABEL[emp.employmentType]].filter(Boolean).join(' · ')}
              </p>
              <div className="profile-chips">
                {emp.employeeNumber && (
                  <span className="profile-chip"><span className="ck">사번</span><span className="cv">{emp.employeeNumber}</span></span>
                )}
                {emp.hireDate && (
                  <span className="profile-chip"><span className="ck">입사</span><span className="cv">{fmt(emp.hireDate)}</span></span>
                )}
                {annualBalance && (
                  <span className="profile-chip"><span className="ck">연차</span><span className="cv">{annualBalance.remaining}일 잔여</span></span>
                )}
                {emp.companyEmail && (
                  <span className="profile-chip"><span className="cv">{emp.companyEmail}</span></span>
                )}
                <span className="profile-chip">
                  <span className="ck">계정</span>
                  <span className="cv" style={{ color: emp.hasLinkedAccount ? 'var(--success)' : 'var(--fg-muted)' }}>
                    {emp.hasLinkedAccount ? '연결됨' : '미연결'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div className="profile-tabs">
        {([
          { key: 'info', label: '기본 정보' },
          { key: 'appointment', label: '발령 이력' },
          { key: 'roles', label: '권한' },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button key={t.key} className={`profile-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <Link href="/members" style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12, color: 'var(--fg-subtle)', textDecoration: 'none' }}>← 목록</Link>
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 40px' }}>
        {tab === 'info' && (
          <div>
            <Accordion title="기본 정보" defaultOpen>
              <div className="pf-grid">
                <PfField label="사번" value={emp.employeeNumber} />
                <PfField label="입사일" value={fmt(emp.hireDate)} />
                <PfField label="성별" value={emp.gender ? GENDER_LABEL[emp.gender] : null} />
                <PfField label="생년월일" value={fmt(emp.birthDate)} />
                <PfField label="연락처" value={emp.phone} />
                <PfField label="등록일" value={fmt(emp.createdAt)} />
                <PfField label="회사 이메일" value={emp.companyEmail} />
                <PfField label="개인 이메일" value={emp.personalEmail} />
              </div>
            </Accordion>

            <Accordion title="인사 정보" defaultOpen>
              <div className="pf-grid">
                <PfField label="부서" value={emp.departmentName ?? '미배정'} />
                <PfField label="직책" value={emp.positionName ?? '미지정'} />
                <PfField label="고용 형태" value={EMP_TYPE_LABEL[emp.employmentType]} />
                <PfField label="재직 상태" value={STATUS_LABEL[emp.employmentStatus] ?? emp.employmentStatus} />
                {emp.probationEndDate && <PfField label="수습 종료일" value={fmt(emp.probationEndDate)} />}
                {emp.resignedAt && <PfField label="퇴직일" value={fmt(emp.resignedAt)} />}
              </div>
            </Accordion>

            <Accordion title="휴가 잔여" count={emp.leaveBalances.length}>
              {emp.leaveBalances.length === 0 ? (
                <EmptyLine text="배정된 휴가가 없어요." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 14 }}>
                  {emp.leaveBalances.map((lb) => {
                    const total = lb.granted + lb.adjusted
                    return (
                      <div key={lb.leaveTypeName} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-secondary)' }}>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{lb.leaveTypeName}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                          {lb.remaining}<small style={{ fontSize: 12, fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 4 }}>/ {total}일</small>
                        </div>
                        <ProgressBar used={lb.used} total={total} />
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>사용 {lb.used}일</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Accordion>

            <Accordion title="휴가 신청 이력" count={leaveHistory.length}>
              {leaveHistory.length === 0 ? (
                <EmptyLine text="신청 이력이 없어요." />
              ) : (
                <table className="tbl" style={{ marginTop: 14 }}>
                  <thead><tr><th>유형</th><th>기간</th><th>일수</th><th>상태</th></tr></thead>
                  <tbody>
                    {leaveHistory.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.leaveTypeName}</td>
                        <td><span className="sn">{fmt(r.startDate)} ~ {fmt(r.endDate)}</span></td>
                        <td><span className="sn">{r.days}일</span></td>
                        <td><span className="st">{LEAVE_STATUS_LABEL[r.status] ?? r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Accordion>

            <Accordion title="결재 문서" count={workflowDocs.length}>
              {workflowDocs.length === 0 ? (
                <EmptyLine text="기안한 문서가 없어요." />
              ) : (
                <table className="tbl" style={{ marginTop: 14 }}>
                  <thead><tr><th>제목</th><th>단계</th><th>신청일</th><th>상태</th></tr></thead>
                  <tbody>
                    {workflowDocs.map((d) => (
                      <tr key={d.id}>
                        <td><Link href={`/workflow/documents/${d.id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--fg)' }}>{d.title}</Link></td>
                        <td><span className="sn">{d.currentStep != null ? `${d.currentStep}/${d.totalSteps}` : d.totalSteps}</span></td>
                        <td><span className="sn">{fmt(d.createdAt)}</span></td>
                        <td><span className="st">{d.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Accordion>

            <Accordion title="경력 · 학력" count={careerItems.length + educationItems.length}>
              <EmptyLine text="등록된 경력·학력이 없어요." />
            </Accordion>

            <Accordion title="가족 정보" count={familyItems.length}>
              <EmptyLine text="등록된 가족 정보가 없어요." />
            </Accordion>
          </div>
        )}

        {tab === 'appointment' && (
          <div className="accordion" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>인사 발령 이력</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                  현재 · {emp.departmentName ?? '미배정'} {emp.positionName ? `/ ${emp.positionName}` : ''}
                </div>
              </div>
            </div>
            {appointments.length === 0 ? (
              <p style={{ padding: '32px 18px', fontSize: 13, color: 'var(--fg-muted)' }}>발령 이력이 없어요.</p>
            ) : (
              <div>
                {appointments.map((a, i) => (
                  <div key={a.id} style={{ padding: '14px 18px', borderBottom: i < appointments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="tag">{APPT_KIND_LABEL[a.kind] ?? a.kind}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {a.toDepartmentName && <>{a.toDepartmentName}</>}
                          {a.toPositionName && <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}> / {a.toPositionName}</span>}
                        </span>
                      </div>
                      <span className="sn">{fmt(a.effectiveDate)}</span>
                    </div>
                    {(a.fromDepartmentName !== a.toDepartmentName || a.fromPositionName !== a.toPositionName) && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fg-subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {a.fromDepartmentName !== a.toDepartmentName && (
                          <span>{a.fromDepartmentName ?? '미배정'} → {a.toDepartmentName ?? '미배정'}</span>
                        )}
                        {a.fromPositionName !== a.toPositionName && (
                          <span>{a.fromPositionName ?? '미지정'} → {a.toPositionName ?? '미지정'}</span>
                        )}
                      </div>
                    )}
                    {a.memo && <p style={{ marginTop: 4, fontSize: 12, color: 'var(--fg-subtle)' }}>{a.memo}</p>}
                    <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--fg-subtle)' }}>{a.appointedByName} · {fmt(a.createdAt)} 등록</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'roles' && (
          <div className="accordion" style={{ marginBottom: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13.5, fontWeight: 600 }}>부여된 권한</div>
            {emp.roles.length === 0 ? (
              <p style={{ padding: '32px 18px', fontSize: 13, color: 'var(--fg-muted)' }}>부여된 역할이 없어요.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '18px' }}>
                {emp.roles.map((r) => (
                  <span key={r.id} className="tag adm">{r.name}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
