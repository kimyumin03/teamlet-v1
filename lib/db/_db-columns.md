# Neon DB 전체 컬럼 레퍼런스 (실제 teamlet DB) — insert 시 NOT NULL+default없음 컬럼은 반드시 채울 것

## announcement_comments
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - announcementId: text NOT NULL  ⟵ REQUIRED(no default)
  - authorId: text NOT NULL  ⟵ REQUIRED(no default)
  - content: text NOT NULL  ⟵ REQUIRED(no default)
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## announcements
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - authorId: text NOT NULL  ⟵ REQUIRED(no default)
  - title: text NOT NULL  ⟵ REQUIRED(no default)
  - content: text NOT NULL  ⟵ REQUIRED(no default)
  - isPinned: bool NOT NULL default=false
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## appointments
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - kind: AppointmentKind NOT NULL  ⟵ REQUIRED(no default)
  - effectiveDate: timestamp NOT NULL  ⟵ REQUIRED(no default)
  - fromDepartmentId: text null
  - fromDepartmentName: text null
  - toDepartmentId: text null
  - toDepartmentName: text null
  - fromPositionId: text null
  - fromPositionName: text null
  - toPositionId: text null
  - toPositionName: text null
  - memo: text null
  - appointedById: text null
  - appointedByName: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## approval_actions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - documentId: text NOT NULL  ⟵ REQUIRED(no default)
  - lineId: text NOT NULL  ⟵ REQUIRED(no default)
  - actorId: text NOT NULL  ⟵ REQUIRED(no default)
  - action: ApprovalActionType NOT NULL  ⟵ REQUIRED(no default)
  - comment: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## approval_lines
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - documentId: text NOT NULL  ⟵ REQUIRED(no default)
  - step: int4 NOT NULL  ⟵ REQUIRED(no default)
  - approverId: text NOT NULL  ⟵ REQUIRED(no default)
  - status: ApprovalLineStatus NOT NULL default='PENDING'::"ApprovalLineStatus"
  - approvedAt: timestamp null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## approval_policies
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - category: FormDocumentKind NOT NULL default='GENERAL'::"FormDocumentKind"
  - description: text NOT NULL default=''::text
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## approval_policy_steps
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - policyId: text NOT NULL  ⟵ REQUIRED(no default)
  - step: int4 NOT NULL  ⟵ REQUIRED(no default)
  - approverType: ApproverType NOT NULL default='SPECIFIC_PERSON'::"ApproverType"
  - approverId: text null

## audit_logs
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text null
  - occurredAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - actorUserId: text null
  - actorEmail: text null
  - actorName: text null
  - onBehalfOfUserId: text null
  - activityType: text NOT NULL  ⟵ REQUIRED(no default)
  - eventType: AuditEventType NOT NULL  ⟵ REQUIRED(no default)
  - targetType: text NOT NULL  ⟵ REQUIRED(no default)
  - targetId: text null
  - targetLabel: text null
  - description: text NOT NULL  ⟵ REQUIRED(no default)
  - beforeSnapshot: jsonb null
  - afterSnapshot: jsonb null
  - diff: jsonb null
  - ipAddress: text null
  - userAgent: text null
  - sessionId: text null
  - requestId: text null

## bulk_operation_rows
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - operationId: text NOT NULL  ⟵ REQUIRED(no default)
  - rowIndex: int4 NOT NULL  ⟵ REQUIRED(no default)
  - rawData: jsonb NOT NULL  ⟵ REQUIRED(no default)
  - status: BulkRowStatus NOT NULL default='PENDING'::"BulkRowStatus"
  - error: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## bulk_operations
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - type: BulkOperationType NOT NULL  ⟵ REQUIRED(no default)
  - status: BulkOperationStatus NOT NULL default='PENDING'::"BulkOperationStatus"
  - actorId: text NOT NULL  ⟵ REQUIRED(no default)
  - totalRows: int4 NOT NULL default=0
  - successRows: int4 NOT NULL default=0
  - failedRows: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## candidates
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - postingId: text NOT NULL  ⟵ REQUIRED(no default)
  - managerId: text null
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - email: text NOT NULL  ⟵ REQUIRED(no default)
  - phone: text null
  - currentStageId: text null
  - result: CandidateResult NOT NULL default='IN_PROGRESS'::"CandidateResult"
  - answers: jsonb NOT NULL default='{}'::jsonb
  - appliedAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## career_histories
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - companyName: text NOT NULL  ⟵ REQUIRED(no default)
  - position: text NOT NULL  ⟵ REQUIRED(no default)
  - department: text NOT NULL default=''::text
  - startDate: timestamp NOT NULL  ⟵ REQUIRED(no default)
  - endDate: timestamp null
  - description: text NOT NULL default=''::text
  - sortOrder: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## certificate_issues
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - issuerId: text NOT NULL  ⟵ REQUIRED(no default)
  - type: CertificateType NOT NULL  ⟵ REQUIRED(no default)
  - issueNumber: text NOT NULL  ⟵ REQUIRED(no default)
  - purpose: text NOT NULL  ⟵ REQUIRED(no default)
  - snapshotData: jsonb NOT NULL  ⟵ REQUIRED(no default)
  - fileUrl: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## certificate_templates
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - certType: CertificateType NOT NULL  ⟵ REQUIRED(no default)
  - fileUrl: text NOT NULL  ⟵ REQUIRED(no default)
  - isActive: bool NOT NULL default=true
  - sortOrder: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## companies
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - businessNumber: text NOT NULL  ⟵ REQUIRED(no default)
  - corporateNumber: text null
  - phone: text null
  - foundedAt: timestamp null
  - addressRoad: text null
  - addressDetail: text null
  - logoUrl: text null
  - coverUrl: text null
  - companyCode: text NOT NULL  ⟵ REQUIRED(no default)
  - companyCodeActive: bool NOT NULL default=true
  - joinPolicy: CompanyJoinPolicy NOT NULL default='REQUIRE_APPROVAL'::"CompanyJoinPolicy"
  - visionMission: text null
  - isSetupCompleted: bool NOT NULL default=false
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## company_applications
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - applicantUserId: text NOT NULL  ⟵ REQUIRED(no default)
  - companyName: text NOT NULL  ⟵ REQUIRED(no default)
  - businessNumber: text NOT NULL  ⟵ REQUIRED(no default)
  - representativeName: text NOT NULL  ⟵ REQUIRED(no default)
  - contact: text NOT NULL  ⟵ REQUIRED(no default)
  - companySize: text NOT NULL  ⟵ REQUIRED(no default)
  - industry: text NOT NULL  ⟵ REQUIRED(no default)
  - memo: text null
  - documentUrl: text null
  - status: ApplicationStatus NOT NULL default='PENDING'::"ApplicationStatus"
  - reviewerUserId: text null
  - reviewedAt: timestamp null
  - reviewMemo: text null
  - createdCompanyId: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## company_documents
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - uploadedById: text NOT NULL  ⟵ REQUIRED(no default)
  - title: text NOT NULL  ⟵ REQUIRED(no default)
  - category: CompanyDocumentCategory NOT NULL default='GENERAL'::"CompanyDocumentCategory"
  - fileUrl: text NOT NULL  ⟵ REQUIRED(no default)
  - isPublic: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## company_holidays
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - date: date NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - isNational: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## company_leave_settings
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - retirementAdjustMode: RetirementAdjustMode NOT NULL default='EMPLOYEE_FAVORABLE'::"RetirementAdjustM
  - promotionApproverEmployeeId: text null
  - promotionCcEmployeeIds: _text null default=ARRAY[]::text[]
  - memberRemindEnabled: bool NOT NULL default=false
  - adminRemindEnabled: bool NOT NULL default=false
  - planNoticeDaysBefore: int4 NOT NULL default=10
  - annualPromotionMonthsBefore: int4 NOT NULL default=6
  - annualPromotionOffsetDays: int4 NOT NULL default=0
  - monthly1stPromotionMonthsBefore: int4 NOT NULL default=3
  - monthly1stPromotionOffsetDays: int4 NOT NULL default=0
  - monthly2ndPromotionMonthsBefore: int4 NOT NULL default=1
  - monthly2ndPromotionOffsetDays: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## company_login_policies
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - minLength: int4 NOT NULL default=8
  - requireAlpha: bool NOT NULL default=true
  - requireDigit: bool NOT NULL default=true
  - requireSpecial: bool NOT NULL default=true
  - blockWeakPasswords: bool NOT NULL default=true
  - blockPersonalInfo: bool NOT NULL default=true
  - preventReuseCount: int4 NOT NULL default=3
  - passwordExpiryDays: int4 null
  - maxLoginAttempts: int4 NOT NULL default=5
  - pcSessionMaxAgeHours: int4 NOT NULL default=168
  - mobileSessionMaxAgeHours: int4 NOT NULL default=720
  - allowLeaveOfAbsenceLogin: bool NOT NULL default=true

## company_security_policies
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - mfaEnabled: bool NOT NULL default=false
  - mfaMethod: MfaMethod NOT NULL default='OTP'::"MfaMethod"
  - mfaExemptIps: _text null default=ARRAY[]::text[]
  - ipRestrictionEnabled: bool NOT NULL default=false
  - allowedIps: _text null default=ARRAY[]::text[]
  - applyToSuperAdmin: bool NOT NULL default=false
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## departments
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - parentId: text null
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - sortOrder: int4 NOT NULL default=0
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## document_cc_recipients
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - documentId: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## education_histories
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - schoolName: text NOT NULL  ⟵ REQUIRED(no default)
  - major: text NOT NULL default=''::text
  - degree: EducationDegree NOT NULL default='BACHELOR'::"EducationDegree"
  - enrollDate: timestamp NOT NULL  ⟵ REQUIRED(no default)
  - graduateDate: timestamp null
  - description: text NOT NULL default=''::text
  - sortOrder: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## employee_invites
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - inviterUserId: text NOT NULL  ⟵ REQUIRED(no default)
  - email: text NOT NULL  ⟵ REQUIRED(no default)
  - tokenHash: text NOT NULL  ⟵ REQUIRED(no default)
  - expiresAt: timestamp NOT NULL  ⟵ REQUIRED(no default)
  - prefilledData: jsonb null
  - used: bool NOT NULL default=false
  - usedAt: timestamp null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## employees
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - departmentId: text null
  - positionId: text null
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeNumber: text null
  - companyEmail: text null
  - personalEmail: text null
  - phone: text null
  - birthDate: timestamp null
  - gender: Gender null
  - hireDate: timestamp null
  - employmentType: EmploymentType NOT NULL default='FULL_TIME'::"EmploymentType"
  - probationEndDate: timestamp null
  - resignedAt: timestamp null
  - employmentStatus: EmploymentStatus NOT NULL default='ACTIVE'::"EmploymentStatus"
  - dataSource: DataSource NOT NULL default='MANUAL'::"DataSource"
  - axhubExternalId: text null
  - lastSyncedAt: timestamp null
  - syncLockedFields: _text null default=ARRAY[]::text[]
  - bulkImportRowId: text null
  - isActive: bool NOT NULL default=true
  - lastAnnouncementReadAt: timestamp null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## family_members
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - relationship: text NOT NULL  ⟵ REQUIRED(no default)
  - birthDate: timestamp null
  - isDependent: bool NOT NULL default=false
  - gender: Gender null
  - sortOrder: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## form_documents
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - templateId: text null
  - authorId: text NOT NULL  ⟵ REQUIRED(no default)
  - title: text NOT NULL  ⟵ REQUIRED(no default)
  - kind: FormDocumentKind NOT NULL default='GENERAL'::"FormDocumentKind"
  - formData: jsonb NOT NULL default='{}'::jsonb
  - status: FormDocumentStatus NOT NULL default='DRAFT'::"FormDocumentStatus"
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## form_templates
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - kind: FormDocumentKind NOT NULL default='GENERAL'::"FormDocumentKind"
  - description: text NOT NULL default=''::text
  - fields: jsonb NOT NULL default='[]'::jsonb
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## job_postings
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - managerId: text NOT NULL  ⟵ REQUIRED(no default)
  - title: text NOT NULL  ⟵ REQUIRED(no default)
  - description: text NOT NULL default=''::text
  - status: JobPostingStatus NOT NULL default='DRAFT'::"JobPostingStatus"
  - sortOrder: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## job_stages
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - postingId: text NOT NULL  ⟵ REQUIRED(no default)
  - order: int4 NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## join_requests
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - userId: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - usedCompanyCode: text NOT NULL  ⟵ REQUIRED(no default)
  - payload: jsonb null
  - status: ApplicationStatus NOT NULL default='PENDING'::"ApplicationStatus"
  - reviewerUserId: text null
  - reviewedAt: timestamp null
  - reviewMemo: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## leave_balances
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - leaveTypeId: text NOT NULL  ⟵ REQUIRED(no default)
  - year: int4 NOT NULL  ⟵ REQUIRED(no default)
  - grantedDays: numeric NOT NULL default=0
  - usedDays: numeric NOT NULL default=0
  - adjustedDays: numeric NOT NULL default=0
  - expiryProcessedAt: timestamp null
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## leave_policies
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - leaveTypeId: text NOT NULL  ⟵ REQUIRED(no default)
  - grantMode: LeavePolicyGrantMode NOT NULL default='FISCAL_YEAR'::"LeavePolicyGrantMode"
  - fiscalStartMonth: int4 NOT NULL default=1
  - monthlyGrantRule: MonthlyGrantRule NOT NULL default='MONTHLY_ON_ATTENDANCE'::"MonthlyGrantRu
  - annualFirstYearRule: AnnualFirstYearRule NOT NULL default='PRORATED_ON_FIRST_FISCAL'::"AnnualFirst
  - decimalRule: DecimalRule NOT NULL default='ROUND_UP_DAY'::"DecimalRule"
  - expiryMonths: int4 NOT NULL default=12
  - carryoverMaxDays: numeric null
  - grantStartDate: date null
  - useUnit: LeaveUseUnit NOT NULL default='HALF_DAY'::"LeaveUseUnit"
  - hourUnitMinutes: int4 null
  - overdraftEnabled: bool NOT NULL default=false
  - overdraftMaxDays: int4 null
  - monthlyExpiryMode: MonthlyExpiryMode NOT NULL default='HIRE_DATE_1Y'::"MonthlyExpiryMode"
  - monthlyGraceMonths: int4 null
  - annualExpiryMode: AnnualExpiryMode NOT NULL default='GRANT_DATE_1Y'::"AnnualExpiryMode"
  - annualGraceMonths: int4 null
  - approveOnRegister: bool NOT NULL default=true
  - approveOnCancel: bool NOT NULL default=false
  - approverEmployeeId: text null
  - ccEmployeeIds: _text null default=ARRAY[]::text[]
  - smartPromotionEnabled: bool NOT NULL default=false
  - isDefault: bool NOT NULL default=false
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## leave_policy_assignments
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - policyId: text NOT NULL  ⟵ REQUIRED(no default)
  - effectiveDate: date NOT NULL  ⟵ REQUIRED(no default)
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## leave_promotion_plan_dates
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - promotionId: text NOT NULL  ⟵ REQUIRED(no default)
  - planDate: date NOT NULL  ⟵ REQUIRED(no default)
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## leave_promotions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - year: int4 NOT NULL  ⟵ REQUIRED(no default)
  - promotionType: LeavePromotionType NOT NULL  ⟵ REQUIRED(no default)
  - targetDays: numeric NOT NULL  ⟵ REQUIRED(no default)
  - expiryDate: date NOT NULL  ⟵ REQUIRED(no default)
  - status: LeavePromotionStatus NOT NULL default='REQUESTED'::"LeavePromotionStatus"
  - requestedAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - submittedAt: timestamp null
  - approvedAt: timestamp null
  - formDocumentId: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## leave_requests
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - leaveTypeId: text NOT NULL  ⟵ REQUIRED(no default)
  - startDate: date NOT NULL  ⟵ REQUIRED(no default)
  - endDate: date NOT NULL  ⟵ REQUIRED(no default)
  - days: numeric NOT NULL  ⟵ REQUIRED(no default)
  - reason: text NOT NULL default=''::text
  - unitType: text NOT NULL default='FULL'::text
  - startTime: text null
  - endTime: text null
  - schedule: jsonb NOT NULL default='[]'::jsonb
  - evidenceFileUrl: text null
  - status: LeaveRequestStatus NOT NULL default='PENDING'::"LeaveRequestStatus"
  - reviewNote: text null
  - reviewedAt: timestamp null
  - reviewedBy: text null
  - formDocumentId: text null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## leave_transactions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - leaveTypeId: text NOT NULL  ⟵ REQUIRED(no default)
  - occurredAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - category: LeaveTxCategory NOT NULL  ⟵ REQUIRED(no default)
  - txType: LeaveTxType NOT NULL  ⟵ REQUIRED(no default)
  - days: numeric NOT NULL  ⟵ REQUIRED(no default)
  - reason: text NOT NULL default=''::text
  - note: text null
  - actorId: text null
  - leaveRequestId: text null
  - usableFrom: date null
  - usableUntil: date null

## leave_types
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - key: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - description: text NOT NULL default=''::text
  - isSystem: bool NOT NULL default=false
  - isRequired: bool NOT NULL default=false
  - isActive: bool NOT NULL default=true
  - grantMethod: LeaveGrantMethod NOT NULL default='ON_REQUEST'::"LeaveGrantMethod"
  - grantUnit: LeaveGrantUnit NOT NULL default='DAY'::"LeaveGrantUnit"
  - grantAmount: numeric null
  - paymentType: LeavePaymentType NOT NULL default='PAID'::"LeavePaymentType"
  - genderRestriction: LeaveGenderRestriction NOT NULL default='ALL'::"LeaveGenderRestriction"
  - evidenceRequirement: LeaveEvidenceRequirement NOT NULL default='NONE'::"LeaveEvidenceRequirement"
  - useUnit: LeaveUseUnit NOT NULL default='DAY'::"LeaveUseUnit"
  - hourUnitMinutes: int4 null
  - partialPayPercent: int4 null
  - partialPayDays: int4 null
  - deductOnHoliday: bool NOT NULL default=false
  - periodicCycle: text null
  - tenureYears: int4 null
  - excludedEmploymentTypes: _text null default=ARRAY[]::text[]
  - excludedDepartmentIds: _text null default=ARRAY[]::text[]
  - approverEmployeeId: text null
  - ccEmployeeIds: _text null default=ARRAY[]::text[]
  - approveOnRegister: bool NOT NULL default=true
  - approveOnCancel: bool NOT NULL default=false
  - sortOrder: int4 NOT NULL default=0
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## login_attempts
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - email: text NOT NULL  ⟵ REQUIRED(no default)
  - userId: text null
  - attemptedAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - ip: text null
  - userAgent: text null
  - success: bool NOT NULL  ⟵ REQUIRED(no default)
  - failReason: text null

## notifications
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - recipientEmployeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - category: NotificationCategory NOT NULL  ⟵ REQUIRED(no default)
  - eventKey: text NOT NULL  ⟵ REQUIRED(no default)
  - title: text NOT NULL  ⟵ REQUIRED(no default)
  - body: text NOT NULL  ⟵ REQUIRED(no default)
  - deepLink: text null
  - relatedTargetType: text null
  - relatedTargetId: text null
  - isRead: bool NOT NULL default=false
  - readAt: timestamp null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - expiresAt: timestamp null

## permissions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - key: text NOT NULL  ⟵ REQUIRED(no default)
  - category: text NOT NULL  ⟵ REQUIRED(no default)
  - domain: text NOT NULL  ⟵ REQUIRED(no default)
  - action: PermissionAction NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - description: text null
  - sensitivity: PermissionSensitivity NOT NULL default='NORMAL'::"PermissionSensitivity"
  - hasScope: bool NOT NULL default=false
  - dependsOnPermissionKeys: _text null default=ARRAY[]::text[]
  - warningText: text null

## positions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - isOrgHead: bool NOT NULL default=false
  - sortOrder: int4 NOT NULL default=0
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## recognitions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - senderId: text NOT NULL  ⟵ REQUIRED(no default)
  - recipientId: text NOT NULL  ⟵ REQUIRED(no default)
  - kind: RecognitionKind NOT NULL default='RECOGNITION'::"RecognitionKind"
  - message: text NOT NULL  ⟵ REQUIRED(no default)
  - isRead: bool NOT NULL default=false
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## role_permissions
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - roleId: text NOT NULL  ⟵ REQUIRED(no default)
  - permissionId: text NOT NULL  ⟵ REQUIRED(no default)
  - enabled: bool NOT NULL default=true
  - scopeType: ScopeType null
  - departmentIds: _text null default=ARRAY[]::text[]
  - includeSubDepartments: bool NOT NULL default=false

## roles
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - description: text null
  - icon: text null
  - type: RoleType NOT NULL  ⟵ REQUIRED(no default)
  - isSystem: bool NOT NULL default=false
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP

## user_company_memberships
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - userId: text NOT NULL  ⟵ REQUIRED(no default)
  - companyId: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text null
  - status: MembershipStatus NOT NULL default='PENDING'::"MembershipStatus"
  - joinPath: JoinPath NOT NULL  ⟵ REQUIRED(no default)
  - appliedAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - activatedAt: timestamp null
  - approvedByUserId: text null
  - isActive: bool NOT NULL default=true

## user_mfa
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - userId: text NOT NULL  ⟵ REQUIRED(no default)
  - secret: text NOT NULL  ⟵ REQUIRED(no default)
  - isEnabled: bool NOT NULL default=false
  - enabledAt: timestamp null
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

## user_roles
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - employeeId: text NOT NULL  ⟵ REQUIRED(no default)
  - roleId: text NOT NULL  ⟵ REQUIRED(no default)
  - assignedAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - assignedByUserId: text null
  - isActive: bool NOT NULL default=true

## users
  - id: text NOT NULL  ⟵ REQUIRED(no default)
  - email: text NOT NULL  ⟵ REQUIRED(no default)
  - passwordHash: text null
  - name: text NOT NULL  ⟵ REQUIRED(no default)
  - phone: text null
  - googleId: text null
  - axhubUserId: text null
  - emailVerified: bool NOT NULL default=false
  - verifiedAt: timestamp null
  - lastLoginAt: timestamp null
  - isActive: bool NOT NULL default=true
  - createdAt: timestamp NOT NULL default=CURRENT_TIMESTAMP
  - updatedAt: timestamp NOT NULL  ⟵ REQUIRED(no default)

