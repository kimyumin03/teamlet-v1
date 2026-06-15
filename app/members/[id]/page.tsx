import { notFound } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  employees,
  departments,
  positions,
  leaveBalances,
  leaveTypes,
  userRoles,
  roles,
  appointments,
  leaveRequests,
  careerHistories,
  educationHistories,
  familyMembers,
} from '@/lib/db/schema'
import { ProfileShell } from './_components/profile-shell'

// 구성원 상세 — 원본 teamlet 그대로. 데이터는 자체 DB(Neon)의 실제 테이블.
export const dynamic = 'force-dynamic'

type TabKey = 'info' | 'appointment' | 'roles'
const VALID_TABS: TabKey[] = ['info', 'appointment', 'roles']

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const initialTab: TabKey = (VALID_TABS.includes(tab as TabKey) ? tab : 'info') as TabKey

  const db = getDb()

  const empRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      employmentStatus: employees.employmentStatus,
      employmentType: employees.employmentType,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
      departmentName: departments.name,
      positionName: positions.name,
      employeeNumber: employees.employeeNumber,
      hireDate: employees.hireDate,
      gender: employees.gender,
      birthDate: employees.birthDate,
      phone: employees.phone,
      createdAt: employees.createdAt,
      companyEmail: employees.companyEmail,
      personalEmail: employees.personalEmail,
      probationEndDate: employees.probationEndDate,
      resignedAt: employees.resignedAt,
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.id, id))
    .limit(1)

  if (!empRows.length) notFound()
  const e = empRows[0]

  // 휴가 잔여 (+ 종류명)
  const balRows = await db
    .select({
      leaveTypeName: leaveTypes.name,
      granted: leaveBalances.grantedDays,
      used: leaveBalances.usedDays,
      adjusted: leaveBalances.adjustedDays,
    })
    .from(leaveBalances)
    .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(eq(leaveBalances.employeeId, id))
  const balances = balRows.map((b) => {
    const granted = Number(b.granted ?? 0)
    const used = Number(b.used ?? 0)
    const adjusted = Number(b.adjusted ?? 0)
    return { leaveTypeName: b.leaveTypeName ?? '휴가', granted, used, adjusted, remaining: granted + adjusted - used }
  })

  // 역할(권한)
  const roleRows = await db
    .select({ id: roles.id, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.employeeId, id), eq(userRoles.isActive, true)))

  // 발령 이력
  const appts = await db
    .select()
    .from(appointments)
    .where(eq(appointments.employeeId, id))
    .orderBy(desc(appointments.effectiveDate))
  const apptItems = appts.map((a) => ({
    id: a.id,
    kind: a.kind ?? '',
    toDepartmentName: a.toDepartmentName,
    toPositionName: a.toPositionName,
    fromDepartmentName: a.fromDepartmentName,
    fromPositionName: a.fromPositionName,
    effectiveDate: a.effectiveDate,
    memo: a.memo,
    appointedByName: a.appointedByName,
    createdAt: a.createdAt,
  }))

  // 휴가 신청 이력
  const lhRows = await db
    .select({
      id: leaveRequests.id,
      leaveTypeName: leaveTypes.name,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(eq(leaveRequests.employeeId, id))
    .orderBy(desc(leaveRequests.createdAt))
  const leaveHistory = lhRows.map((r) => ({
    id: r.id,
    leaveTypeName: r.leaveTypeName ?? '휴가',
    startDate: r.startDate ? new Date(r.startDate) : null,
    endDate: r.endDate ? new Date(r.endDate) : null,
    days: Number(r.days),
    status: r.status,
  }))

  const careerItems = await db
    .select({ id: careerHistories.id, companyName: careerHistories.companyName, position: careerHistories.position, startDate: careerHistories.startDate })
    .from(careerHistories)
    .where(eq(careerHistories.employeeId, id))
  const educationItems = await db
    .select({ id: educationHistories.id, schoolName: educationHistories.schoolName, major: educationHistories.major, enrollDate: educationHistories.enrollDate })
    .from(educationHistories)
    .where(eq(educationHistories.employeeId, id))
  const familyItems = await db
    .select({ id: familyMembers.id, name: familyMembers.name, relationship: familyMembers.relationship })
    .from(familyMembers)
    .where(eq(familyMembers.employeeId, id))

  const emp = {
    id: e.id,
    name: e.name,
    employmentStatus: e.employmentStatus ?? '',
    employmentType: e.employmentType ?? '',
    departmentName: e.departmentName ?? null,
    positionName: e.positionName ?? null,
    departmentId: e.departmentId ?? null,
    positionId: e.positionId ?? null,
    employeeNumber: e.employeeNumber ?? null,
    hireDate: e.hireDate ?? null,
    gender: e.gender ?? null,
    birthDate: e.birthDate ?? null,
    phone: e.phone ?? null,
    createdAt: e.createdAt ?? null,
    companyEmail: e.companyEmail ?? null,
    personalEmail: e.personalEmail ?? null,
    probationEndDate: e.probationEndDate ?? null,
    resignedAt: e.resignedAt ?? null,
    isActive: e.isActive ?? false,
    hasLinkedAccount: false, // 계정 연결 여부 — auth 이식 때 채움
    leaveBalances: balances,
    roles: roleRows,
  }

  return (
    <ProfileShell
      emp={emp}
      appointments={apptItems}
      leaveHistory={leaveHistory}
      workflowDocs={[]} // 결재 문서 — workflow 기능 이식 때 연결
      careerItems={careerItems}
      educationItems={educationItems}
      familyItems={familyItems}
      initialTab={initialTab}
    />
  )
}
