import { notFound } from 'next/navigation'
import { and, asc, desc, eq } from 'drizzle-orm'
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
  userCompanyMemberships,
} from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { ProfileShell } from './_components/profile-shell'
import type { EmployeeDetail, EmployeeRoleAssignment, RoleType } from '@teamlet/modules/employee'
import type { DepartmentNode } from '@teamlet/modules/department'
import type { PositionItem } from '@teamlet/modules/position'
import type { AppointmentItem, AppointmentKind } from '@teamlet/modules/appointment'
import { APPOINTMENT_KIND_LABEL } from '@teamlet/modules/appointment'
import type { RoleListItem } from '@teamlet/modules/permission'
import type { LeaveRequestItem } from '@teamlet/modules/leave'
import type { CareerHistoryItem, EducationHistoryItem, FamilyMemberItem, EducationDegree, Gender } from '@teamlet/modules/employee'

// 구성원 상세 — 원본 teamlet 그대로. 데이터는 자체 DB(Neon)의 실제 테이블.
// 관리 기능(수정·비활성·초대·발령등록·권한관리)은 member.directory.manage 권한자에게만 노출(canManageEmployee).
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

  const user = await getCurrentUser()
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
      companyId: employees.companyId,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.id, id))
    .limit(1)

  if (!empRows.length || empRows[0].companyId !== user.companyId) notFound()
  const e = empRows[0]

  const canManageEmployee = await hasPermission(user.employeeId, 'member.directory.manage')

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

  // 역할(권한) — EmployeeRoleAssignment 형태
  const roleRows = await db
    .select({ userRoleId: userRoles.id, roleId: roles.id, roleName: roles.name, roleType: roles.type })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.employeeId, id), eq(userRoles.isActive, true)))
  const assignedRoles: EmployeeRoleAssignment[] = roleRows.map((r) => {
    const roleType = (r.roleType ?? 'CUSTOM') as RoleType
    return {
      userRoleId: r.userRoleId,
      roleId: r.roleId,
      roleName: r.roleName,
      roleType,
      isSystem: roleType === 'SYSTEM_SUPER_ADMIN' || roleType === 'DYNAMIC_ORG_HEAD',
      assignedAt: new Date(),
    }
  })

  // 부여 가능한 역할 목록 (권한 탭) — 관리자만 의미 있음
  const roleCatalog = await db
    .select({ id: roles.id, name: roles.name, type: roles.type })
    .from(roles)
    .where(eq(roles.companyId, user.companyId))
  const assignableRoles: RoleListItem[] = canManageEmployee
    ? roleCatalog.map((r) => {
        const type = (r.type ?? 'CUSTOM') as RoleType
        return {
          id: r.id,
          name: r.name,
          description: null,
          icon: null,
          type,
          isSystem: type === 'SYSTEM_SUPER_ADMIN' || type === 'DYNAMIC_ORG_HEAD',
          isActive: true,
          createdAt: new Date(),
          memberCount: 0,
        }
      })
    : []

  // 발령 이력
  const appts = await db
    .select()
    .from(appointments)
    .where(eq(appointments.employeeId, id))
    .orderBy(desc(appointments.effectiveDate))
  const apptItems: AppointmentItem[] = appts.map((a) => {
    const kind = (a.kind ?? 'TRANSFER') as AppointmentKind
    return {
      id: a.id,
      kind,
      kindLabel: APPOINTMENT_KIND_LABEL[kind] ?? kind,
      effectiveDate: a.effectiveDate ? new Date(a.effectiveDate) : new Date(),
      toDepartmentName: a.toDepartmentName,
      toPositionName: a.toPositionName,
      fromDepartmentName: a.fromDepartmentName,
      fromPositionName: a.fromPositionName,
      memo: a.memo,
      appointedByName: a.appointedByName,
      createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
    }
  })

  // 휴가 신청 이력
  const lhRows = await db
    .select({
      id: leaveRequests.id,
      leaveTypeName: leaveTypes.name,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(eq(leaveRequests.employeeId, id))
    .orderBy(desc(leaveRequests.createdAt))
  const leaveHistory: LeaveRequestItem[] = lhRows.map((r) => ({
    id: r.id,
    leaveTypeName: r.leaveTypeName ?? '휴가',
    startDate: r.startDate ? new Date(r.startDate) : new Date(),
    endDate: r.endDate ? new Date(r.endDate) : new Date(),
    days: Number(r.days ?? 0),
    reason: r.reason ?? '',
    status: (r.status ?? 'PENDING') as LeaveRequestItem['status'],
    reviewNote: null,
    createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
    unitType: 'FULL',
    schedule: [],
  }))

  // 경력 / 학력 / 가족 (전체 item 형태)
  const careerRows = await db
    .select()
    .from(careerHistories)
    .where(eq(careerHistories.employeeId, id))
    .orderBy(asc(careerHistories.startDate))
  const careerItems: CareerHistoryItem[] = careerRows.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    position: c.position,
    department: c.department ?? '',
    startDate: c.startDate ? new Date(c.startDate) : new Date(),
    endDate: c.endDate ? new Date(c.endDate) : null,
    description: '',
    sortOrder: 0,
  }))

  const eduRows = await db
    .select()
    .from(educationHistories)
    .where(eq(educationHistories.employeeId, id))
    .orderBy(asc(educationHistories.enrollDate))
  const educationItems: EducationHistoryItem[] = eduRows.map((ed) => ({
    id: ed.id,
    schoolName: ed.schoolName,
    major: ed.major ?? '',
    degree: (ed.degree ?? 'BACHELOR') as EducationDegree,
    enrollDate: ed.enrollDate ? new Date(ed.enrollDate) : new Date(),
    graduateDate: ed.graduateDate ? new Date(ed.graduateDate) : null,
    description: '',
    sortOrder: 0,
  }))

  const famRows = await db.select().from(familyMembers).where(eq(familyMembers.employeeId, id))
  const familyItems: FamilyMemberItem[] = famRows.map((f) => ({
    id: f.id,
    name: f.name,
    relationship: f.relationship,
    birthDate: null,
    isDependent: f.isDependent ?? false,
    gender: null as Gender | null,
    sortOrder: 0,
  }))

  // 계정 연결 여부 — user_company_memberships 에 employeeId 매핑이 있으면 연결됨
  const linked = await db
    .select({ id: userCompanyMemberships.id })
    .from(userCompanyMemberships)
    .where(eq(userCompanyMemberships.employeeId, id))
    .limit(1)
  const hasLinkedAccount = linked.length > 0

  // 부서·직책 목록 (발령 등록 셀렉트용)
  const deptRows = await db
    .select({ id: departments.id, name: departments.name, parentId: departments.parentId, sortOrder: departments.sortOrder, isActive: departments.isActive })
    .from(departments)
    .where(and(eq(departments.companyId, user.companyId), eq(departments.isActive, true)))
  const deptList: DepartmentNode[] = deptRows.map((d) => ({
    id: d.id,
    name: d.name,
    parentId: d.parentId,
    sortOrder: d.sortOrder ?? 0,
    isActive: d.isActive ?? true,
    memberCount: 0,
  }))
  const posRows = await db
    .select({ id: positions.id, name: positions.name, isOrgHead: positions.isOrgHead, sortOrder: positions.sortOrder, isActive: positions.isActive })
    .from(positions)
    .where(and(eq(positions.companyId, user.companyId), eq(positions.isActive, true)))
  const posList: PositionItem[] = posRows.map((p) => ({
    id: p.id,
    name: p.name,
    isOrgHead: p.isOrgHead ?? false,
    sortOrder: p.sortOrder ?? 0,
    isActive: p.isActive ?? true,
    memberCount: 0,
  }))

  const emp: EmployeeDetail = {
    id: e.id,
    name: e.name,
    employmentStatus: (e.employmentStatus ?? 'ACTIVE') as EmployeeDetail['employmentStatus'],
    employmentType: (e.employmentType ?? 'FULL_TIME') as EmployeeDetail['employmentType'],
    departmentName: e.departmentName ?? null,
    positionName: e.positionName ?? null,
    departmentId: e.departmentId ?? null,
    positionId: e.positionId ?? null,
    employeeNumber: e.employeeNumber ?? null,
    companyEmail: e.companyEmail ?? null,
    hireDate: e.hireDate ?? null,
    isActive: e.isActive ?? false,
    roleName: assignedRoles[0]?.roleName ?? null,
    personalEmail: e.personalEmail ?? null,
    phone: e.phone ?? null,
    birthDate: e.birthDate ?? null,
    gender: (e.gender ?? null) as Gender | null,
    probationEndDate: e.probationEndDate ?? null,
    resignedAt: e.resignedAt ?? null,
    leaveBalances: balances,
    createdAt: e.createdAt ?? new Date(),
    roles: assignedRoles,
    hasLinkedAccount,
  }

  return (
    <ProfileShell
      emp={emp}
      departments={deptList}
      positions={posList}
      leaveHistory={leaveHistory}
      workflowDocs={[]}
      assignableRoles={assignableRoles}
      appointments={apptItems}
      careerItems={careerItems}
      educationItems={educationItems}
      familyItems={familyItems}
      initialTab={initialTab}
      canManageEmployee={canManageEmployee}
    />
  )
}
