"use server";

// 문서·증명서(document) 서버 액션 — 원본 lib/actions/document.ts + packages/modules/src/document/* 의
// 비즈니스 로직을 drizzle(Neon)로 충실히 재현해요. 모든 쓰기는 Neon.
// 컴포넌트는 ApiResponse(res.ok / res.data / res.error.message)를 읽어요.
//
// ⚠️ v1 schema.ts 미선언 컬럼(스키마 수정 금지) 때문에 일부 항목은 다르게 처리해요:
//   - certificate_templates.fileUrl / sortOrder 미선언 → 템플릿 파일 URL 을 저장/조회할 수 없어요.
//     발급 시 증명서 파일 URL 은 빈 값이 되고, 발급된 증명서는 인쇄 페이지(snapshotData 기반)로 봐요.
//   - certificate_issues.fileUrl 미선언 → 발급 파일 URL 은 보관 못 해요.
//   - company_documents.isPublic 미선언 → 모든 공용 문서를 공개로 취급해요.
//  → missingSchemaColumns 참고.

import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companyDocuments,
  certificateIssues,
  certificateTemplates,
  employees,
  departments,
  positions,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission } from "@/lib/permissions";
import {
  ok,
  err,
  errors,
  toApiResponse,
  type Result,
  type ApiResponse,
} from "@teamlet/shared";
import type {
  CompanyDocumentItem,
  CreateCompanyDocumentInput,
  IssueCertificateInput,
  CertificateTemplateItem,
  CreateCertificateTemplateInput,
} from "@/lib/modules/document";

const ARCHIVE_MANAGE = "document.company_archive.manage";
const CERTIFICATE_MANAGE = "document.certificate.manage";

function generateIssueNumber(type: string): string {
  const prefix = type === "EMPLOYMENT" ? "EMP" : "CAR";
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${ymd}-${rand}`;
}

// ─────────────────────────────────────────────────────────────
// 공용 문서함 (company_documents) — 원본 company-document.ts 재현
// ─────────────────────────────────────────────────────────────

export async function listCompanyDocumentsAction(): Promise<
  ApiResponse<CompanyDocumentItem[]>
> {
  const user = await getCurrentUser();
  return toApiResponse(await listCompanyDocuments(user.employeeId, user.companyId));
}

async function listCompanyDocuments(
  _employeeId: string,
  companyId: string,
): Promise<Result<CompanyDocumentItem[]>> {
  const db = getDb();
  // ⚠️ company_documents.isPublic 미선언 → 공개/비공개 구분 없이 회사 전체 문서를 반환해요.
  const rows = await db
    .select({
      id: companyDocuments.id,
      title: companyDocuments.title,
      category: companyDocuments.category,
      fileUrl: companyDocuments.fileUrl,
      createdAt: companyDocuments.createdAt,
      uploaderName: employees.name,
    })
    .from(companyDocuments)
    .leftJoin(employees, eq(companyDocuments.uploadedById, employees.id))
    .where(eq(companyDocuments.companyId, companyId))
    .orderBy(desc(companyDocuments.createdAt));

  return ok(
    rows.map((d) => ({
      id: d.id,
      title: d.title,
      category: (d.category ?? "GENERAL") as CompanyDocumentItem["category"],
      fileUrl: d.fileUrl ?? "",
      isPublic: true,
      uploaderName: d.uploaderName ?? "—",
      createdAt: d.createdAt ?? new Date(),
    })),
  );
}

export async function createCompanyDocumentAction(
  input: CreateCompanyDocumentInput,
): Promise<ApiResponse<{ id: string }>> {
  const user = await getCurrentUser();
  return toApiResponse(await createCompanyDocument(user.employeeId, user.companyId, input));
}

async function createCompanyDocument(
  employeeId: string,
  companyId: string,
  input: CreateCompanyDocumentInput,
): Promise<Result<{ id: string }>> {
  if (!(await hasPermission(employeeId, ARCHIVE_MANAGE)))
    return err(errors.forbidden("문서를 추가할 권한이 없어요"));

  if (!input.title.trim()) return err(errors.validation("제목을 입력해주세요"));
  if (!input.fileUrl.trim()) return err(errors.validation("파일 URL을 입력해주세요"));

  try {
    const db = getDb();
    const id = crypto.randomUUID();
    await db.insert(companyDocuments).values({
      id,
      companyId,
      uploadedById: employeeId,
      title: input.title.trim(),
      category: input.category,
      fileUrl: input.fileUrl.trim(),
      createdAt: new Date(),
    });
    return ok({ id });
  } catch (e) {
    console.error("[document] createCompanyDocument 실패", e);
    return err(errors.internal("문서를 추가하지 못했어요. 잠시 후 다시 시도해 주세요."));
  }
}

export async function deleteCompanyDocumentAction(
  documentId: string,
): Promise<ApiResponse<void>> {
  const user = await getCurrentUser();
  return toApiResponse(await deleteCompanyDocument(user.employeeId, user.companyId, documentId));
}

async function deleteCompanyDocument(
  employeeId: string,
  companyId: string,
  documentId: string,
): Promise<Result<void>> {
  if (!(await hasPermission(employeeId, ARCHIVE_MANAGE)))
    return err(errors.forbidden("문서를 삭제할 권한이 없어요"));

  const db = getDb();
  const rows = await db
    .select({ companyId: companyDocuments.companyId })
    .from(companyDocuments)
    .where(eq(companyDocuments.id, documentId))
    .limit(1);
  if (!rows.length || rows[0].companyId !== companyId)
    return err(errors.notFound("문서를 찾을 수 없어요"));

  try {
    await db.delete(companyDocuments).where(eq(companyDocuments.id, documentId));
    return ok(undefined);
  } catch (e) {
    console.error("[document] deleteCompanyDocument 실패", e);
    return err(errors.internal("문서를 삭제하지 못했어요."));
  }
}

// ─────────────────────────────────────────────────────────────
// 증명서 종류(템플릿) — 원본 certificate.ts 재현
// ⚠️ certificate_templates.fileUrl / sortOrder 미선언 → 파일 URL 저장/조회 불가, 생성순(createdAt) 정렬.
// ─────────────────────────────────────────────────────────────

export async function listCertificateTemplatesAction(): Promise<
  ApiResponse<CertificateTemplateItem[]>
> {
  const user = await getCurrentUser();
  return toApiResponse(await listCertificateTemplates(user.companyId));
}

async function listCertificateTemplates(
  companyId: string,
): Promise<Result<CertificateTemplateItem[]>> {
  const db = getDb();
  const rows = await db
    .select({
      id: certificateTemplates.id,
      name: certificateTemplates.name,
      certType: certificateTemplates.certType,
    })
    .from(certificateTemplates)
    .where(
      and(
        eq(certificateTemplates.companyId, companyId),
        eq(certificateTemplates.isActive, true),
      ),
    )
    .orderBy(asc(certificateTemplates.createdAt));

  return ok(
    rows.map((t) => ({
      id: t.id,
      name: t.name,
      certType: (t.certType ?? "EMPLOYMENT") as CertificateTemplateItem["certType"],
      fileUrl: "", // ⚠️ certificate_templates.fileUrl 미선언 — 저장/조회 불가.
    })),
  );
}

export async function createCertificateTemplateAction(
  input: CreateCertificateTemplateInput,
): Promise<ApiResponse<CertificateTemplateItem>> {
  const user = await getCurrentUser();
  return toApiResponse(await createCertificateTemplate(user.employeeId, user.companyId, input));
}

async function createCertificateTemplate(
  employeeId: string,
  companyId: string,
  input: CreateCertificateTemplateInput,
): Promise<Result<CertificateTemplateItem>> {
  if (!(await hasPermission(employeeId, CERTIFICATE_MANAGE)))
    return err(errors.forbidden("증명서 종류를 등록할 권한이 없어요"));

  if (!input.name.trim()) return err(errors.validation("종류 이름을 입력해주세요"));

  try {
    const db = getDb();
    const id = crypto.randomUUID();
    // ⚠️ fileUrl 컬럼 미선언 — 선언된 컬럼(id/companyId/name/certType/isActive/createdAt)만 insert.
    await db.insert(certificateTemplates).values({
      id,
      companyId,
      name: input.name.trim(),
      certType: input.certType,
      isActive: true,
      createdAt: new Date(),
    });
    return ok({ id, name: input.name.trim(), certType: input.certType, fileUrl: "" });
  } catch (e) {
    console.error("[document] createCertificateTemplate 실패", e);
    return err(errors.internal("증명서 종류를 등록하지 못했어요."));
  }
}

export async function deleteCertificateTemplateAction(
  templateId: string,
): Promise<ApiResponse<void>> {
  const user = await getCurrentUser();
  return toApiResponse(await deleteCertificateTemplate(user.employeeId, user.companyId, templateId));
}

async function deleteCertificateTemplate(
  employeeId: string,
  companyId: string,
  templateId: string,
): Promise<Result<void>> {
  if (!(await hasPermission(employeeId, CERTIFICATE_MANAGE)))
    return err(errors.forbidden("증명서 종류를 삭제할 권한이 없어요"));

  const db = getDb();
  const rows = await db
    .select({ companyId: certificateTemplates.companyId })
    .from(certificateTemplates)
    .where(eq(certificateTemplates.id, templateId))
    .limit(1);
  if (!rows.length || rows[0].companyId !== companyId)
    return err(errors.notFound("증명서 종류를 찾을 수 없어요"));

  try {
    // 원본과 동일하게 소프트 삭제(비활성화).
    await db
      .update(certificateTemplates)
      .set({ isActive: false })
      .where(eq(certificateTemplates.id, templateId));
    return ok(undefined);
  } catch (e) {
    console.error("[document] deleteCertificateTemplate 실패", e);
    return err(errors.internal("증명서 종류를 삭제하지 못했어요."));
  }
}

// ─────────────────────────────────────────────────────────────
// 증명서 발급 — 원본 issueCertificate 재현 (직원 스냅샷 포함)
// 본인 발급 = 권한 불필요 / 타인 발급 = document.certificate.manage 필요
// ─────────────────────────────────────────────────────────────

export async function issueCertificateAction(
  input: IssueCertificateInput,
): Promise<ApiResponse<{ id: string; issueNumber: string; fileUrl: string }>> {
  const user = await getCurrentUser();
  return toApiResponse(await issueCertificate(user.employeeId, user.companyId, input));
}

async function issueCertificate(
  issuerId: string,
  companyId: string,
  input: IssueCertificateInput,
): Promise<Result<{ id: string; issueNumber: string; fileUrl: string }>> {
  const isSelf = input.employeeId === issuerId;
  if (!isSelf && !(await hasPermission(issuerId, CERTIFICATE_MANAGE)))
    return err(errors.forbidden("다른 직원의 증명서를 발급할 권한이 없어요"));

  if (!input.purpose.trim()) return err(errors.validation("발급 목적을 입력해주세요"));

  const db = getDb();

  // 템플릿 검증 — 같은 회사 + 활성 상태
  const tplRows = await db
    .select({
      companyId: certificateTemplates.companyId,
      certType: certificateTemplates.certType,
      name: certificateTemplates.name,
      isActive: certificateTemplates.isActive,
    })
    .from(certificateTemplates)
    .where(eq(certificateTemplates.id, input.templateId))
    .limit(1);
  const template = tplRows[0];
  if (!template || template.isActive === false || template.companyId !== companyId)
    return err(errors.notFound("등록된 증명서 종류를 찾을 수 없어요. 관리자에게 문의하세요."));
  const certType = (template.certType ?? "EMPLOYMENT") as "EMPLOYMENT" | "CAREER";

  // 대상 직원 검증 — 같은 회사
  const tgtRows = await db
    .select({
      companyId: employees.companyId,
      name: employees.name,
      hireDate: employees.hireDate,
      isActive: employees.isActive,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
    })
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);
  const target = tgtRows[0];
  if (!target) return err(errors.notFound("대상 직원을 찾을 수 없어요"));
  if (target.companyId !== companyId)
    return err(errors.forbidden("같은 회사 직원만 발급할 수 있어요"));

  const [dept, pos] = await Promise.all([
    target.departmentId
      ? db
          .select({ name: departments.name })
          .from(departments)
          .where(eq(departments.id, target.departmentId))
          .limit(1)
      : Promise.resolve([] as { name: string }[]),
    target.positionId
      ? db
          .select({ name: positions.name })
          .from(positions)
          .where(eq(positions.id, target.positionId))
          .limit(1)
      : Promise.resolve([] as { name: string }[]),
  ]);

  const issueNumber = generateIssueNumber(certType);
  const snapshotData = {
    name: target.name,
    departmentName: dept[0]?.name ?? null,
    positionName: pos[0]?.name ?? null,
    hiredAt: target.hireDate ? new Date(target.hireDate).toISOString() : null,
    isActive: target.isActive ?? true,
    issuedAt: new Date().toISOString(),
    templateName: template.name,
  };

  try {
    const id = crypto.randomUUID();
    // ⚠️ certificate_issues.fileUrl 미선언 — 선언된 컬럼만 insert. 파일 URL 은 보관 못 해요.
    await db.insert(certificateIssues).values({
      id,
      employeeId: input.employeeId,
      issuerId,
      type: certType,
      issueNumber,
      purpose: input.purpose.trim(),
      snapshotData,
      createdAt: new Date(),
    });
    return ok({ id, issueNumber, fileUrl: "" });
  } catch (e) {
    console.error("[document] issueCertificate 실패", e);
    return err(errors.internal("증명서를 발급하지 못했어요. 잠시 후 다시 시도해 주세요."));
  }
}
