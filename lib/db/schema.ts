// ⚠️ 이 테이블들은 "기존 teamlet DB(원본이 Prisma 로 만든)"의 실제 테이블이에요.
//    아래 drizzle 정의는 그 테이블을 읽고/쓰기 위한 매핑일 뿐 — 새로 만들지 않아요.
//    🚫 drizzle-kit generate/push 금지 (스키마는 원본 teamlet 이 소유. 우린 데이터만 읽고 씀).
//    컬럼명은 실제 DB(camelCase, Prisma)와 정확히 일치해야 해요.
import { pgTable, text, date, numeric, timestamp, pgEnum, boolean, integer, jsonb } from 'drizzle-orm/pg-core'

// leave_requests.status — Prisma enum "LeaveRequestStatus"
export const leaveRequestStatus = pgEnum('LeaveRequestStatus', [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CANCEL_PENDING',
])

// 휴가 종류 (연차/병가/경조사) — 우리가 쓰는 컬럼만 매핑.
export const leaveTypes = pgTable('leave_types', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  key: text('key').notNull(), // annual / sick / condolence
  name: text('name').notNull(), // 연차 / 병가 / 경조사 휴가
})

// 휴가 신청 — 실제 테이블(우리가 쓰는 컬럼만). 나머지 컬럼은 DB 기본값이 채워줘요.
export const leaveRequests = pgTable('leave_requests', {
  id: text('id').primaryKey(), // 기본값 없음 → insert 시 직접 생성
  employeeId: text('employeeId').notNull(),
  leaveTypeId: text('leaveTypeId').notNull(),
  startDate: date('startDate', { mode: 'string' }).notNull(), // 'YYYY-MM-DD'
  endDate: date('endDate', { mode: 'string' }).notNull(),
  days: numeric('days').notNull(),
  reason: text('reason').notNull().default(''),
  status: leaveRequestStatus('status').notNull().default('PENDING'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull(), // 기본값 없음 → insert 시 직접
})

export type LeaveRequestRow = typeof leaveRequests.$inferSelect

// ── 구성원(Members) 관련 테이블 — 읽기 전용 매핑 (enum 은 라벨 text 로) ──

export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  departmentId: text('departmentId'),
  positionId: text('positionId'),
  name: text('name').notNull(),
  employeeNumber: text('employeeNumber'),
  companyEmail: text('companyEmail'),
  personalEmail: text('personalEmail'),
  phone: text('phone'),
  gender: text('gender'), // MALE/FEMALE/OTHER
  birthDate: timestamp('birthDate', { mode: 'date' }),
  employmentType: text('employmentType'), // FULL_TIME/PART_TIME/CONTRACT/INTERN/DISPATCH
  employmentStatus: text('employmentStatus'), // ACTIVE/PROBATION/ON_LEAVE/SECONDED/RESIGNED/SCHEDULED
  hireDate: timestamp('hireDate', { mode: 'date' }),
  probationEndDate: timestamp('probationEndDate', { mode: 'date' }),
  resignedAt: timestamp('resignedAt', { mode: 'date' }),
  isActive: boolean('isActive'),
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 인사 발령 이력 (denormalized — from/to 부서·직책 이름 포함)
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  employeeId: text('employeeId').notNull(),
  kind: text('kind'), // HIRE/TRANSFER/PROMOTION/LEAVE/RETURN/SECONDMENT/RESIGNATION
  effectiveDate: timestamp('effectiveDate', { mode: 'date' }),
  fromDepartmentName: text('fromDepartmentName'),
  toDepartmentName: text('toDepartmentName'),
  fromPositionName: text('fromPositionName'),
  toPositionName: text('toPositionName'),
  memo: text('memo'),
  appointedByName: text('appointedByName'),
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 휴가 잔여 (직원 × 휴가종류 × 연도)
export const leaveBalances = pgTable('leave_balances', {
  id: text('id').primaryKey(),
  employeeId: text('employeeId').notNull(),
  leaveTypeId: text('leaveTypeId').notNull(),
  year: integer('year'),
  grantedDays: numeric('grantedDays'),
  usedDays: numeric('usedDays'),
  adjustedDays: numeric('adjustedDays'),
})

// 공지사항
export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  authorId: text('authorId'),
  title: text('title').notNull(),
  content: text('content'),
  isPinned: boolean('isPinned'),
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 결재 문서 (워크플로우)
export const formDocuments = pgTable('form_documents', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  authorId: text('authorId'),
  title: text('title').notNull(),
  kind: text('kind'), // GENERAL/LEAVE_REQUEST/LEAVE_PLAN/INFO_CHANGE/ANNOUNCEMENT
  status: text('status'), // DRAFT/IN_PROGRESS/APPROVED/REJECTED/CANCELLED
  formData: jsonb('formData'),
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 결재선 (문서 × 단계 × 결재자)
export const approvalLines = pgTable('approval_lines', {
  id: text('id').primaryKey(),
  documentId: text('documentId').notNull(),
  step: integer('step'),
  approverId: text('approverId'),
  status: text('status'), // PENDING/APPROVED/REJECTED
  approvedAt: timestamp('approvedAt', { mode: 'date' }),
})

// 결재 액션 (코멘트 등)
export const approvalActions = pgTable('approval_actions', {
  id: text('id').primaryKey(),
  lineId: text('lineId').notNull(),
  comment: text('comment'),
})

// 문서 참조자
export const documentCcRecipients = pgTable('document_cc_recipients', {
  id: text('id').primaryKey(),
  documentId: text('documentId').notNull(),
  employeeId: text('employeeId').notNull(),
})

// 인정·피드백
export const recognitions = pgTable('recognitions', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  senderId: text('senderId'),
  recipientId: text('recipientId'),
  kind: text('kind'),
  message: text('message'),
  isRead: boolean('isRead'),
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 회사 정보
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  businessNumber: text('businessNumber'),
  phone: text('phone'),
  addressRoad: text('addressRoad'),
  addressDetail: text('addressDetail'),
  foundedAt: timestamp('foundedAt', { mode: 'date' }),
})

// 공용 문서함
export const companyDocuments = pgTable('company_documents', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  uploadedById: text('uploadedById'),
  title: text('title').notNull(),
  category: text('category'), // GENERAL/NOTICE/POLICY
  fileUrl: text('fileUrl'),
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 공휴일 (법정 + 회사 특별휴일)
export const companyHolidays = pgTable('company_holidays', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  date: date('date', { mode: 'string' }),
  name: text('name').notNull(),
  isNational: boolean('isNational'),
})

// 채용 공고
export const jobPostings = pgTable('job_postings', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  managerId: text('managerId'),
  title: text('title').notNull(),
  status: text('status'), // DRAFT/OPEN/CLOSED/CANCELLED
  createdAt: timestamp('createdAt', { mode: 'date' }),
})

// 감사 로그
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  occurredAt: timestamp('occurredAt', { mode: 'date' }),
  actorEmail: text('actorEmail'),
  actorName: text('actorName'),
  activityType: text('activityType'),
  eventType: text('eventType'),
  description: text('description'),
})

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  parentId: text('parentId'),
  name: text('name').notNull(),
  sortOrder: integer('sortOrder'),
  isActive: boolean('isActive'),
})

export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  name: text('name').notNull(),
  isOrgHead: boolean('isOrgHead'),
  sortOrder: integer('sortOrder'),
  isActive: boolean('isActive'),
})

export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  companyId: text('companyId').notNull(),
  name: text('name').notNull(),
  type: text('type'),
})

export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  employeeId: text('employeeId').notNull(),
  roleId: text('roleId').notNull(),
  isActive: boolean('isActive'),
})
