'use server'

// 구성원 상세 — 경력/학력/가족 CRUD (drizzle/Neon). 원본 modules/employee/career.ts 재현.
//   - 권한: member.directory.manage (관리자 또는 본인 — 단순화해서 manage 가드)
//   - 반환형은 원본 employee-profile actions 와 동일: { ok:true; data } | { ok:false; error:{ message } }
// ⚠️ v1 스키마 한계 (missingSchemaColumns 참고):
//    career_histories.description/sortOrder, education_histories.description/sortOrder,
//    family_members.birthDate/gender/sortOrder 컬럼이 schema.ts 에 없어 저장하지 않아요.
//    (목록 표시엔 영향 없지만, 입력해도 그 값은 영속되지 않음.)

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { careerHistories, educationHistories, familyMembers } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import type {
  CareerHistoryInput,
  EducationHistoryInput,
  FamilyMemberInput,
} from '@teamlet/modules/employee'

type ProfileResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string } }

const DIRECTORY_MANAGE = 'member.directory.manage'

async function guard(): Promise<ProfileResult<true>> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
    return { ok: false, error: { message: 'member.directory.manage 권한이 필요해요' } }
  }
  return { ok: true, data: true }
}

function toDate(v?: string | null): Date | null {
  const s = (v ?? '').trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function revalidate(employeeId: string) {
  revalidatePath(`/members/${employeeId}`)
}

// ── 경력 ──────────────────────────────────────────────────────
export async function createCareerHistoryAction(
  targetEmployeeId: string,
  input: CareerHistoryInput,
): Promise<ProfileResult<{ id: string }>> {
  const g = await guard()
  if (!g.ok) return g
  if (!input.companyName?.trim()) return { ok: false, error: { message: '회사명을 입력해 주세요' } }
  if (!input.position?.trim()) return { ok: false, error: { message: '직위/직책을 입력해 주세요' } }
  const id = crypto.randomUUID()
  try {
    await getDb().insert(careerHistories).values({
      id,
      employeeId: targetEmployeeId,
      companyName: input.companyName.trim(),
      position: input.position.trim(),
      department: input.department?.trim() || null,
      startDate: toDate(input.startDate),
      endDate: toDate(input.endDate),
    })
  } catch (e) {
    console.error('[db] createCareerHistory 실패', e)
    return { ok: false, error: { message: '경력 추가 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: { id } }
}

export async function updateCareerHistoryAction(
  targetEmployeeId: string,
  careerHistoryId: string,
  input: Partial<CareerHistoryInput>,
): Promise<ProfileResult> {
  const g = await guard()
  if (!g.ok) return g
  try {
    await getDb()
      .update(careerHistories)
      .set({
        ...(input.companyName !== undefined ? { companyName: input.companyName.trim() } : {}),
        ...(input.position !== undefined ? { position: input.position.trim() } : {}),
        ...(input.department !== undefined ? { department: input.department?.trim() || null } : {}),
        ...(input.startDate !== undefined ? { startDate: toDate(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: toDate(input.endDate) } : {}),
      })
      .where(eq(careerHistories.id, careerHistoryId))
  } catch (e) {
    console.error('[db] updateCareerHistory 실패', e)
    return { ok: false, error: { message: '경력 수정 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: undefined }
}

export async function deleteCareerHistoryAction(
  targetEmployeeId: string,
  careerHistoryId: string,
): Promise<ProfileResult> {
  const g = await guard()
  if (!g.ok) return g
  try {
    await getDb().delete(careerHistories).where(eq(careerHistories.id, careerHistoryId))
  } catch (e) {
    console.error('[db] deleteCareerHistory 실패', e)
    return { ok: false, error: { message: '경력 삭제 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: undefined }
}

// ── 학력 ──────────────────────────────────────────────────────
export async function createEducationHistoryAction(
  targetEmployeeId: string,
  input: EducationHistoryInput,
): Promise<ProfileResult<{ id: string }>> {
  const g = await guard()
  if (!g.ok) return g
  if (!input.schoolName?.trim()) return { ok: false, error: { message: '학교명을 입력해 주세요' } }
  const id = crypto.randomUUID()
  try {
    await getDb().insert(educationHistories).values({
      id,
      employeeId: targetEmployeeId,
      schoolName: input.schoolName.trim(),
      major: input.major?.trim() || null,
      degree: input.degree || 'BACHELOR',
      enrollDate: toDate(input.enrollDate),
      graduateDate: toDate(input.graduateDate),
    })
  } catch (e) {
    console.error('[db] createEducationHistory 실패', e)
    return { ok: false, error: { message: '학력 추가 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: { id } }
}

export async function updateEducationHistoryAction(
  targetEmployeeId: string,
  educationHistoryId: string,
  input: Partial<EducationHistoryInput>,
): Promise<ProfileResult> {
  const g = await guard()
  if (!g.ok) return g
  try {
    await getDb()
      .update(educationHistories)
      .set({
        ...(input.schoolName !== undefined ? { schoolName: input.schoolName.trim() } : {}),
        ...(input.major !== undefined ? { major: input.major?.trim() || null } : {}),
        ...(input.degree !== undefined ? { degree: input.degree } : {}),
        ...(input.enrollDate !== undefined ? { enrollDate: toDate(input.enrollDate) } : {}),
        ...(input.graduateDate !== undefined ? { graduateDate: toDate(input.graduateDate) } : {}),
      })
      .where(eq(educationHistories.id, educationHistoryId))
  } catch (e) {
    console.error('[db] updateEducationHistory 실패', e)
    return { ok: false, error: { message: '학력 수정 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: undefined }
}

export async function deleteEducationHistoryAction(
  targetEmployeeId: string,
  educationHistoryId: string,
): Promise<ProfileResult> {
  const g = await guard()
  if (!g.ok) return g
  try {
    await getDb().delete(educationHistories).where(eq(educationHistories.id, educationHistoryId))
  } catch (e) {
    console.error('[db] deleteEducationHistory 실패', e)
    return { ok: false, error: { message: '학력 삭제 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: undefined }
}

// ── 가족 ──────────────────────────────────────────────────────
export async function createFamilyMemberAction(
  targetEmployeeId: string,
  input: FamilyMemberInput,
): Promise<ProfileResult<{ id: string }>> {
  const g = await guard()
  if (!g.ok) return g
  if (!input.name?.trim()) return { ok: false, error: { message: '이름을 입력해 주세요' } }
  if (!input.relationship?.trim()) return { ok: false, error: { message: '관계를 입력해 주세요' } }
  const id = crypto.randomUUID()
  try {
    await getDb().insert(familyMembers).values({
      id,
      employeeId: targetEmployeeId,
      name: input.name.trim(),
      relationship: input.relationship.trim(),
      isDependent: input.isDependent ?? false,
    })
  } catch (e) {
    console.error('[db] createFamilyMember 실패', e)
    return { ok: false, error: { message: '가족 추가 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: { id } }
}

export async function updateFamilyMemberAction(
  targetEmployeeId: string,
  familyMemberId: string,
  input: Partial<FamilyMemberInput>,
): Promise<ProfileResult> {
  const g = await guard()
  if (!g.ok) return g
  try {
    await getDb()
      .update(familyMembers)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.relationship !== undefined ? { relationship: input.relationship.trim() } : {}),
        ...(input.isDependent !== undefined ? { isDependent: input.isDependent } : {}),
      })
      .where(eq(familyMembers.id, familyMemberId))
  } catch (e) {
    console.error('[db] updateFamilyMember 실패', e)
    return { ok: false, error: { message: '가족 수정 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: undefined }
}

export async function deleteFamilyMemberAction(
  targetEmployeeId: string,
  familyMemberId: string,
): Promise<ProfileResult> {
  const g = await guard()
  if (!g.ok) return g
  try {
    await getDb().delete(familyMembers).where(eq(familyMembers.id, familyMemberId))
  } catch (e) {
    console.error('[db] deleteFamilyMember 실패', e)
    return { ok: false, error: { message: '가족 삭제 중 오류가 발생했어요' } }
  }
  revalidate(targetEmployeeId)
  return { ok: true, data: undefined }
}
