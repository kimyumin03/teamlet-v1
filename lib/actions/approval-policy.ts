'use server'

// 결재 정책(approval-policy) 서버 액션 — drizzle(neon-http) + Neon 직결. 원본 packages/modules/src/workflow/approval-policy.ts 재현.
//   - 권한: workflow.policy.manage (인사관리 전용). 페이지 isHrAdmin 게이트와 함께 액션에서도 가드.
//   ⚠️ v1 schema.ts 의 approval_policies 선언은 id/companyId/name/category/isActive 만 — description/updatedAt(REQUIRED)
//      과 approval_policy_steps 테이블이 schema 에 없어요. 원본 동작(설명·결재단계 저장)을 위해 parameterized raw SQL 로
//      실제 컬럼 전체 + steps 테이블을 다뤄요(_db-columns.md).

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { ok, err, errors, toApiResponse, type Result, type ApiResponse } from '@teamlet/shared'
import type { ApprovalPolicyItem, ApprovalPolicyCreateInput, ApprovalPolicyUpdateInput, ApproverType, FormDocumentKind } from '@/lib/modules/workflow'

const POLICY_MANAGE = 'workflow.policy.manage'

function revalidate() {
  revalidatePath('/settings/approval-policies')
}

async function requireManage(): Promise<{ employeeId: string; companyId: string } | null> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, POLICY_MANAGE))) return null
  return { employeeId: user.employeeId, companyId: user.companyId }
}

function rowsOf(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[]
  const r = (res as { rows?: unknown })?.rows
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : []
}

/** 회사 결재 정책 목록 (단계 포함) */
export async function listApprovalPolicies(): Promise<Result<ApprovalPolicyItem[]>> {
  const user = await getCurrentUser()
  try {
    const db = getDb()
    const rows = rowsOf(await db.execute(sql`select * from approval_policies where "companyId" = ${user.companyId} order by "createdAt" asc`))
    if (rows.length === 0) return ok([])
    const ids = rows.map((r) => String(r.id))
    const stepRows = rowsOf(await db.execute(
      sql`select * from approval_policy_steps where "policyId" in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) order by step asc`,
    ))
    const byPolicy = new Map<string, ApprovalPolicyItem['steps']>()
    for (const s of stepRows) {
      const pid = String(s.policyId)
      const arr = byPolicy.get(pid) ?? []
      arr.push({ step: Number(s.step), approverType: (s.approverType as ApproverType) ?? 'SPECIFIC_PERSON', approverId: (s.approverId as string | null) ?? null })
      byPolicy.set(pid, arr)
    }
    return ok(
      rows.map((p) => ({
        id: String(p.id),
        name: String(p.name ?? ''),
        category: (p.category as FormDocumentKind) ?? 'GENERAL',
        description: String(p.description ?? ''),
        isActive: p.isActive == null ? true : Boolean(p.isActive),
        steps: byPolicy.get(String(p.id)) ?? [],
        createdAt: p.createdAt ? new Date(p.createdAt as string) : new Date(0),
      })),
    )
  } catch (e) {
    console.error('[approval-policy] list 실패', e)
    return ok([])
  }
}

async function replaceSteps(policyId: string, steps: { approverType: ApproverType; approverId?: string }[]) {
  const db = getDb()
  await db.execute(sql`delete from approval_policy_steps where "policyId" = ${policyId}`)
  let step = 1
  for (const s of steps) {
    await db.execute(sql`insert into approval_policy_steps (id, "policyId", step, "approverType", "approverId") values (${crypto.randomUUID()}, ${policyId}, ${step}, ${s.approverType}, ${s.approverId ?? null})`)
    step += 1
  }
}

export async function createApprovalPolicyAction(input: ApprovalPolicyCreateInput): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('workflow.policy.manage 권한이 필요해요'))
    if (!input.name?.trim()) return err(errors.validation('정책명을 입력해 주세요'))
    if (!input.steps?.length) return err(errors.validation('결재 단계를 1개 이상 추가해 주세요'))
    try {
      const db = getDb()
      const id = crypto.randomUUID()
      await db.execute(sql`
        insert into approval_policies (id, "companyId", name, category, description, "isActive", "updatedAt")
        values (${id}, ${ctx.companyId}, ${input.name}, ${input.category ?? 'GENERAL'}, ${input.description ?? ''}, true, now())
      `)
      await replaceSteps(id, input.steps)
      revalidate()
      return ok({ id })
    } catch (e) {
      console.error('[approval-policy] create 실패', e)
      return err(errors.internal('결재 정책 생성 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function updateApprovalPolicyAction(policyId: string, input: ApprovalPolicyUpdateInput): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('workflow.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id, "companyId" from approval_policies where id = ${policyId} limit 1`))
      if (!existing.length || String(existing[0].companyId) !== ctx.companyId) return err(errors.notFound('정책을 찾을 수 없어요'))
      const sets = [sql`"updatedAt" = now()`]
      const push = (col: string, val: unknown) => sets.push(sql`${sql.raw('"' + col + '"')} = ${val as never}`)
      if (input.name !== undefined) push('name', input.name)
      if (input.description !== undefined) push('description', input.description ?? '')
      if (input.isActive !== undefined) push('isActive', input.isActive)
      await db.execute(sql`update approval_policies set ${sql.join(sets, sql`, `)} where id = ${policyId}`)
      if (input.steps !== undefined) await replaceSteps(policyId, input.steps)
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[approval-policy] update 실패', e)
      return err(errors.internal('결재 정책 수정 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}

export async function deleteApprovalPolicyAction(policyId: string): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const ctx = await requireManage()
    if (!ctx) return err(errors.forbidden('workflow.policy.manage 권한이 필요해요'))
    try {
      const db = getDb()
      const existing = rowsOf(await db.execute(sql`select id, "companyId" from approval_policies where id = ${policyId} limit 1`))
      if (!existing.length || String(existing[0].companyId) !== ctx.companyId) return err(errors.notFound('정책을 찾을 수 없어요'))
      await db.execute(sql`delete from approval_policy_steps where "policyId" = ${policyId}`)
      await db.execute(sql`delete from approval_policies where id = ${policyId}`)
      revalidate()
      return ok(undefined)
    } catch (e) {
      console.error('[approval-policy] delete 실패', e)
      return err(errors.internal('결재 정책 삭제 중 오류가 발생했어요'))
    }
  }
  return toApiResponse(await run())
}
