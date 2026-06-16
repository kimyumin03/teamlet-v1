'use server'

// 양식 템플릿(form-template) 서버 액션 — drizzle + Neon 직결. 원본 packages/modules/src/workflow/template.ts 재현.
//   - 권한: workflow.template.manage (인사관리 전용). 페이지 isHrAdmin 게이트와 함께 액션에서도 가드.
//   - form_templates 는 v1 schema.ts 에 전체 컬럼(fields jsonb 포함) 선언돼 drizzle 로 직접 다뤄요.
//   - documentCount: form_documents.templateId 로 사용 건수 집계(삭제 가드).

import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { formTemplates, formDocuments } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  ok,
  err,
  errors,
  toApiResponse,
  formTemplateCreateSchema,
  formTemplateUpdateSchema,
  type Result,
  type ApiResponse,
} from '@teamlet/shared'
import type { FormTemplateItem, FieldDef, FormDocumentKind } from '@/lib/modules/workflow'

const TEMPLATE_MANAGE = 'workflow.template.manage'

function revalidate() {
  revalidatePath('/settings/form-templates')
}

async function requireManage(): Promise<{ employeeId: string; companyId: string } | null> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, TEMPLATE_MANAGE))) return null
  return { employeeId: user.employeeId, companyId: user.companyId }
}

function rowToItem(t: typeof formTemplates.$inferSelect, documentCount: number): FormTemplateItem {
  return {
    id: t.id,
    name: t.name,
    kind: (t.kind as FormDocumentKind) ?? 'GENERAL',
    description: t.description ?? '',
    fields: Array.isArray(t.fields) ? (t.fields as FieldDef[]) : [],
    isActive: t.isActive == null ? true : t.isActive,
    documentCount,
    createdAt: t.createdAt ?? new Date(0),
  }
}

/** 회사 양식 템플릿 목록 (사용 문서 건수 포함) */
export async function listFormTemplates(_employeeId?: string): Promise<Result<FormTemplateItem[]>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const rows = await db.select().from(formTemplates).where(eq(formTemplates.companyId, user.companyId))
    if (rows.length === 0) return ok([])
    const ids = rows.map((r) => r.id)
    const docs = await db
      .select({ templateId: formDocuments.templateId })
      .from(formDocuments)
      .where(inArray(formDocuments.templateId, ids))
    const cnt = new Map<string, number>()
    for (const d of docs) if (d.templateId) cnt.set(d.templateId, (cnt.get(d.templateId) ?? 0) + 1)
    return ok(rows.map((r) => rowToItem(r, cnt.get(r.id) ?? 0)))
  } catch (e) {
    console.error('[form-template] list 실패', e)
    return ok([])
  }
}

export async function createFormTemplateAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('workflow.template.manage 권한이 필요해요'))
    const parsed = formTemplateCreateSchema.safeParse(raw)
    if (!parsed.success) return err(errors.validation(parsed.error.issues[0]?.message ?? '입력 오류'))
    try {
      const db = getDb()
      const id = crypto.randomUUID()
      await db.insert(formTemplates).values({
        id,
        companyId: ctx.companyId,
        name: parsed.data.name,
        kind: parsed.data.kind,
        description: parsed.data.description ?? '',
        fields: parsed.data.fields,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      revalidate()
      return ok({ id })
    } catch (e) {
      console.error('[form-template] create 실패', e)
      return err(errors.internal('양식 생성 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function updateFormTemplateAction(templateId: string, raw: unknown): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('workflow.template.manage 권한이 필요해요'))
    const parsed = formTemplateUpdateSchema.safeParse(raw)
    if (!parsed.success) return err(errors.validation(parsed.error.issues[0]?.message ?? '입력 오류'))
    try {
      const db = getDb()
      const existing = await db.select({ id: formTemplates.id, companyId: formTemplates.companyId }).from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1)
      if (!existing.length || existing[0].companyId !== ctx.companyId) return err(errors.notFound('양식을 찾을 수 없어요'))
      const d = parsed.data
      const patch: Record<string, unknown> = { updatedAt: new Date() }
      if (d.name !== undefined) patch.name = d.name
      if (d.kind !== undefined) patch.kind = d.kind
      if (d.description !== undefined) patch.description = d.description ?? ''
      if (d.fields !== undefined) patch.fields = d.fields
      if (d.isActive !== undefined) patch.isActive = d.isActive
      await db.update(formTemplates).set(patch).where(eq(formTemplates.id, templateId))
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[form-template] update 실패', e)
      return err(errors.internal('양식 수정 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function deleteFormTemplateAction(templateId: string): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('workflow.template.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = await db.select({ id: formTemplates.id, companyId: formTemplates.companyId }).from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1)
      if (!existing.length || existing[0].companyId !== ctx.companyId) return err(errors.notFound('양식을 찾을 수 없어요'))
      const used = await db.select({ id: formDocuments.id }).from(formDocuments).where(and(eq(formDocuments.templateId, templateId))).limit(1)
      if (used.length) return err(errors.conflict('사용된 문서가 있어 삭제할 수 없어요'))
      await db.delete(formTemplates).where(eq(formTemplates.id, templateId))
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[form-template] delete 실패', e)
      return err(errors.internal('양식 삭제 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}
