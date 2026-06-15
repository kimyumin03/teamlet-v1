"use server";

// 워크플로우(결재/문서) 서버 액션 — 원본 lib/actions/workflow.ts + packages/modules/src/workflow/* 의
// 비즈니스 로직을 drizzle(Neon) 로 충실히 재현해요. 모든 쓰기는 Neon.
// 컴포넌트는 ApiResponse(res.ok / res.data.id / res.error.message)를 읽어요.

import { and, eq, inArray, lt, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  formDocuments,
  approvalLines,
  documentCcRecipients,
  employees,
  approvalPolicies,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { ok, err, errors, toApiResponse, type Result, type ApiResponse } from "@teamlet/shared";
import type { FormDocumentKind } from "@teamlet/modules/workflow";

// ─────────────────────────────────────────────────────────────
// createDocumentAction — 문서 생성 + 결재선 + 참조자 (원본 createDocument 재현)
// ─────────────────────────────────────────────────────────────
export async function createDocumentAction(input: {
  title: string;
  kind: FormDocumentKind;
  templateId?: string;
  approverIds: string[];
  ccRecipientIds?: string[];
  formData?: Record<string, unknown>;
}): Promise<ApiResponse<{ id: string }>> {
  const user = await getCurrentUser();
  return toApiResponse(
    await createDocument({
      companyId: user.companyId,
      authorId: user.employeeId,
      title: input.title,
      kind: input.kind,
      templateId: input.templateId,
      approverIds: input.approverIds,
      ccRecipientIds: input.ccRecipientIds,
      formData: input.formData,
    }),
  );
}

async function createDocument(input: {
  companyId: string;
  authorId: string;
  title: string;
  kind: FormDocumentKind;
  templateId?: string;
  formData?: Record<string, unknown>;
  approverIds: string[];
  ccRecipientIds?: string[];
}): Promise<Result<{ id: string }>> {
  const db = getDb();

  // 결재자 미지정 시 결재 정책으로 자동 배정 (C7). 지정 시엔 그대로 사용.
  let approverIds = input.approverIds;
  if (approverIds.length === 0) {
    const resolved = await resolveApprovalSteps(input.companyId, input.kind);
    if (!resolved.ok) return resolved;
    if (!resolved.data)
      return err(
        errors.validation(
          "결재자를 지정하거나 해당 문서 종류의 결재 정책을 먼저 설정해 주세요",
        ),
      );
    approverIds = resolved.data;
  }

  if (approverIds.length === 0)
    return err(errors.validation("결재자를 한 명 이상 지정해야 해요"));

  // 결재자 중복 지정 차단
  const uniqueApprovers = [...new Set(approverIds)];
  if (uniqueApprovers.length !== approverIds.length)
    return err(errors.validation("같은 결재자를 중복 지정할 수 없어요"));

  // 결재자가 모두 같은 회사 소속인지 검증 (cross-tenant 방지)
  const approverRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(inArray(employees.id, uniqueApprovers), eq(employees.companyId, input.companyId)));
  if (approverRows.length !== uniqueApprovers.length)
    return err(errors.validation("결재자 중 회사 소속이 아닌 사람이 있어요"));

  // CC 참조자도 같은 회사 소속인지 검증 (H3)
  const uniqueCc =
    input.ccRecipientIds && input.ccRecipientIds.length > 0
      ? [...new Set(input.ccRecipientIds)]
      : [];
  if (uniqueCc.length > 0) {
    const ccRows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(inArray(employees.id, uniqueCc), eq(employees.companyId, input.companyId)));
    if (ccRows.length !== uniqueCc.length)
      return err(errors.validation("참조자 중 회사 소속이 아닌 사람이 있어요"));
  }

  try {
    const docId = crypto.randomUUID();
    await db.insert(formDocuments).values({
      id: docId,
      companyId: input.companyId,
      templateId: input.templateId ?? null,
      authorId: input.authorId,
      title: input.title,
      kind: input.kind,
      formData: (input.formData ?? {}) as Record<string, unknown>,
      status: "IN_PROGRESS",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 모든 결재선은 PENDING 으로 시작 — 순차 진행은 approve 가 step 순서로 강제
    await db.insert(approvalLines).values(
      uniqueApprovers.map((approverId, idx) => ({
        id: crypto.randomUUID(),
        documentId: docId,
        step: idx + 1,
        approverId,
        status: "PENDING" as const,
      })),
    );

    if (uniqueCc.length > 0) {
      await db.insert(documentCcRecipients).values(
        uniqueCc.map((employeeId) => ({
          id: crypto.randomUUID(),
          documentId: docId,
          employeeId,
        })),
      );
    }

    return ok({ id: docId });
  } catch (e) {
    console.error("[workflow] createDocument 실패", e);
    return err(errors.internal("문서를 만들지 못했어요. 잠시 후 다시 시도해 주세요."));
  }
}

// 결재 정책 기반 자동 결재선 해석 (C7) — SPECIFIC_PERSON step 만 재현.
// ⚠️ approval_policy_steps 테이블이 v1 schema.ts 에 미선언이라 step 목록을 읽을 수 없어요.
// 정책 헤더(approval_policies)는 읽지만 step 이 없으면 자동배정 불가 → null 반환(호출부가 직접 지정 안내).
async function resolveApprovalSteps(
  companyId: string,
  kind: FormDocumentKind,
): Promise<Result<string[] | null>> {
  const db = getDb();
  const policy = await db
    .select({ id: approvalPolicies.id })
    .from(approvalPolicies)
    .where(
      and(
        eq(approvalPolicies.companyId, companyId),
        eq(approvalPolicies.category, kind),
        eq(approvalPolicies.isActive, true),
      ),
    )
    .limit(1);

  // 정책 헤더가 없으면 폴백(null) — 직접 지정 유도.
  if (!policy.length) return ok(null);

  // 정책은 있으나 step 테이블 미선언으로 결재자를 만들 수 없어요 → 직접 지정 안내.
  return err(
    errors.validation(
      "자동 결재선을 만들 수 없어요. 결재자를 직접 지정해 주세요.",
    ),
  );
}

// ─────────────────────────────────────────────────────────────
// approveDocumentAction — 승인 (원본 approveDocument 재현)
// ─────────────────────────────────────────────────────────────
export async function approveDocumentAction(
  lineId: string,
  comment?: string,
): Promise<ApiResponse<void>> {
  const user = await getCurrentUser();
  return toApiResponse(await approveDocument(user.employeeId, lineId, comment));
}

async function approveDocument(
  actorId: string,
  lineId: string,
  _comment?: string,
): Promise<Result<void>> {
  const db = getDb();

  const lineRows = await db
    .select({
      id: approvalLines.id,
      documentId: approvalLines.documentId,
      step: approvalLines.step,
      approverId: approvalLines.approverId,
      status: approvalLines.status,
      docStatus: formDocuments.status,
    })
    .from(approvalLines)
    .leftJoin(formDocuments, eq(approvalLines.documentId, formDocuments.id))
    .where(eq(approvalLines.id, lineId))
    .limit(1);

  if (!lineRows.length) return err(errors.notFound("결재 항목을 찾을 수 없어요"));
  const line = lineRows[0];

  if (line.approverId !== actorId)
    return err(errors.forbidden("본인 결재 항목만 처리할 수 있어요"));
  if (line.status !== "PENDING")
    return err(errors.validation("대기 중인 항목만 처리할 수 있어요"));
  if (line.docStatus === "CANCELLED" || line.docStatus === "REJECTED")
    return err(errors.validation("이미 종료된 문서예요"));

  // 순차 결재 강제 — 이전 단계가 모두 승인돼야 처리 가능
  const prior = await db
    .select({ id: approvalLines.id })
    .from(approvalLines)
    .where(
      and(
        eq(approvalLines.documentId, line.documentId),
        lt(approvalLines.step, line.step ?? 0),
        ne(approvalLines.status, "APPROVED"),
      ),
    );
  if (prior.length > 0)
    return err(errors.validation("이전 단계 결재가 완료되지 않았어요"));

  try {
    await db
      .update(approvalLines)
      .set({ status: "APPROVED", approvedAt: new Date() })
      .where(eq(approvalLines.id, lineId));

    // ⚠️ 승인 코멘트(approval_actions insert)는 v1 schema.ts 에 documentId/actorId/action(REQUIRED no default)
    //    컬럼이 미선언이라 넣을 수 없어요(스키마 수정 금지·NOT NULL 위반 위험). missingSchemaColumns 참고.

    // 다음 단계가 없으면 문서 최종 승인
    const next = await db
      .select({ id: approvalLines.id })
      .from(approvalLines)
      .where(
        and(
          eq(approvalLines.documentId, line.documentId),
          eq(approvalLines.step, (line.step ?? 0) + 1),
        ),
      )
      .limit(1);

    if (!next.length) {
      await db
        .update(formDocuments)
        .set({ status: "APPROVED" })
        .where(eq(formDocuments.id, line.documentId));
    }

    return ok(undefined);
  } catch (e) {
    console.error("[workflow] approveDocument 실패", e);
    return err(errors.internal("승인 처리 중 오류가 발생했어요."));
  }
}

// ─────────────────────────────────────────────────────────────
// rejectDocumentAction — 반려 (원본 rejectDocument 재현)
// ─────────────────────────────────────────────────────────────
export async function rejectDocumentAction(
  lineId: string,
  comment?: string,
): Promise<ApiResponse<void>> {
  const user = await getCurrentUser();
  return toApiResponse(await rejectDocument(user.employeeId, lineId, comment));
}

async function rejectDocument(
  actorId: string,
  lineId: string,
  _comment?: string,
): Promise<Result<void>> {
  const db = getDb();

  const lineRows = await db
    .select({
      id: approvalLines.id,
      documentId: approvalLines.documentId,
      approverId: approvalLines.approverId,
      status: approvalLines.status,
      docStatus: formDocuments.status,
    })
    .from(approvalLines)
    .leftJoin(formDocuments, eq(approvalLines.documentId, formDocuments.id))
    .where(eq(approvalLines.id, lineId))
    .limit(1);

  if (!lineRows.length) return err(errors.notFound("결재 항목을 찾을 수 없어요"));
  const line = lineRows[0];

  if (line.approverId !== actorId)
    return err(errors.forbidden("본인 결재 항목만 처리할 수 있어요"));
  if (line.status !== "PENDING")
    return err(errors.validation("대기 중인 항목만 처리할 수 있어요"));
  if (line.docStatus === "CANCELLED" || line.docStatus === "REJECTED")
    return err(errors.validation("이미 종료된 문서예요"));

  try {
    await db
      .update(approvalLines)
      .set({ status: "REJECTED" })
      .where(eq(approvalLines.id, lineId));

    // ⚠️ 반려 코멘트(approval_actions insert)는 위 승인과 동일 사유로 생략. missingSchemaColumns 참고.

    await db
      .update(formDocuments)
      .set({ status: "REJECTED" })
      .where(eq(formDocuments.id, line.documentId));

    return ok(undefined);
  } catch (e) {
    console.error("[workflow] rejectDocument 실패", e);
    return err(errors.internal("반려 처리 중 오류가 발생했어요."));
  }
}
