// 문서·증명서(document) 모듈 타입 — 원본 packages/modules/src/document/types.ts 에서 타입만 추출.
// Prisma enum(@teamlet/db 의 CompanyDocumentCategory / CertificateType)은 평범한 string 유니온으로 대체.
// 클라이언트 컴포넌트(add/delete/issue + 템플릿 매니저)와 서버 액션이 이 타입을 공유해요.

// ── enum 대체 (원본 @teamlet/db 의 Prisma enum → 평범한 유니온) ──
export type CompanyDocumentCategory = "GENERAL" | "NOTICE" | "POLICY";
export type CertificateType = "EMPLOYMENT" | "CAREER";

export type CompanyDocumentItem = {
  id: string;
  title: string;
  category: CompanyDocumentCategory;
  fileUrl: string;
  isPublic: boolean;
  uploaderName: string;
  createdAt: Date;
};

export type CertificateIssueItem = {
  id: string;
  type: CertificateType;
  issueNumber: string;
  purpose: string;
  createdAt: Date;
  employeeName: string;
  issuerName: string;
  fileUrl: string | null;
};

export type CertificateDetail = CertificateIssueItem & {
  snapshotData: Record<string, unknown>;
};

export type CreateCompanyDocumentInput = {
  title: string;
  category: CompanyDocumentCategory;
  fileUrl: string;
  isPublic?: boolean;
};

export type IssueCertificateInput = {
  employeeId: string;
  templateId: string;
  purpose: string;
};

export type CertificateTemplateItem = {
  id: string;
  name: string;
  certType: CertificateType;
  fileUrl: string;
};

export type CreateCertificateTemplateInput = {
  name: string;
  certType: CertificateType;
  fileUrl: string;
};
