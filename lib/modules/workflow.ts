// 워크플로우(결재/문서) 모듈 타입 — 원본 packages/modules/src/workflow/{types,template,approval-policy}.ts 에서
// 타입만 추출해 정의해요. Prisma enum 은 평범한 string 유니온으로 대체.
// 비즈니스 로직(read/insert)은 v1 에선 lib/actions/workflow.ts (drizzle) 와 페이지에서 직접 구현해요.

export type FormDocumentKind =
  | "GENERAL"
  | "LEAVE_REQUEST"
  | "LEAVE_PLAN"
  | "INFO_CHANGE"
  | "ANNOUNCEMENT";

export type FormDocumentStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type ApprovalLineStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

export type ApproverType =
  | "SPECIFIC_PERSON"
  | "DIRECT_MANAGER"
  | "DEPARTMENT_HEAD"
  | "ORG_HEAD";

// ── 양식 필드 (form_templates.fields jsonb) ──────────────────────
export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export type FieldDef = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

// ── 문서 생성 입력 ───────────────────────────────────────────────
export type CreateDocumentInput = {
  companyId: string;
  authorId: string;
  title: string;
  kind: FormDocumentKind;
  templateId?: string;
  formData?: Record<string, unknown>;
  approverIds: string[];
  ccRecipientIds?: string[];
};

// ── 목록/카드 아이템 ─────────────────────────────────────────────
export type CcDocumentItem = {
  id: string;
  title: string;
  kind: FormDocumentKind;
  status: FormDocumentStatus;
  authorName: string;
  createdAt: Date;
  totalSteps: number;
};

export type DocumentListItem = {
  id: string;
  title: string;
  kind: FormDocumentKind;
  status: FormDocumentStatus;
  authorName: string;
  createdAt: Date;
  currentStep: number | null;
  totalSteps: number;
};

export type PendingApprovalItem = {
  id: string;
  documentId: string;
  documentTitle: string;
  documentKind: FormDocumentKind;
  authorName: string;
  step: number;
  totalSteps: number;
  createdAt: Date;
};

// ── 문서 상세 ────────────────────────────────────────────────────
export type DocumentDetail = {
  id: string;
  title: string;
  kind: FormDocumentKind;
  status: FormDocumentStatus;
  formData: Record<string, unknown>;
  templateFields: FieldDef[] | null;
  authorName: string;
  createdAt: Date;
  ccRecipients: { employeeId: string; name: string }[];
  approvalLines: {
    id: string;
    step: number;
    approverId: string;
    approverName: string;
    status: ApprovalLineStatus;
    approvedAt: Date | null;
    actions: {
      id: string;
      actorName: string;
      action: string;
      comment: string | null;
      createdAt: Date;
    }[];
  }[];
};

// ── 양식 템플릿 ──────────────────────────────────────────────────
export type FormTemplateItem = {
  id: string;
  name: string;
  kind: FormDocumentKind;
  description: string;
  fields: FieldDef[];
  isActive: boolean;
  documentCount: number;
  createdAt: Date;
};

export type FormTemplateCreateInput = {
  name: string;
  kind: FormDocumentKind;
  description?: string;
  fields: FieldDef[];
};

export type FormTemplateUpdateInput = Partial<FormTemplateCreateInput> & { isActive?: boolean };

// ── 결재 정책 ────────────────────────────────────────────────────
export type ApprovalPolicyStepItem = {
  step: number;
  approverType: ApproverType;
  approverId: string | null;
  approverName?: string | null;
};

export type ApprovalPolicyItem = {
  id: string;
  name: string;
  category: FormDocumentKind;
  description: string;
  isActive: boolean;
  steps: ApprovalPolicyStepItem[];
  createdAt: Date;
};

export type ApprovalPolicyCreateInput = {
  name: string;
  category?: FormDocumentKind;
  description?: string;
  steps: { approverType: ApproverType; approverId?: string }[];
};

export type ApprovalPolicyUpdateInput = Partial<Omit<ApprovalPolicyCreateInput, "category">> & {
  isActive?: boolean;
};
