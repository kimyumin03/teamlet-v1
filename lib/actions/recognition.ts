'use server'

// 인정·피드백(recognition) 서버 액션 — drizzle/Neon. 원본 lib/actions/recognition.ts +
// modules/recognition/index.ts 의 비즈니스 의미를 동일하게 재현. 반환형은 원본 ApiResponse<T>.
//   - 보내기: 같은 회사 소속 수신자만(멀티테넌시 격리), 본인 제외, 메시지 필수
//   - 삭제: 수신자 본인 또는 member.directory.manage 권한
//   - 읽음 처리: 받은 메시지 isRead=true (탭 진입 시)

import { revalidatePath } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { recognitions, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import {
  toApiResponse,
  ok,
  err,
  errors,
  type ApiResponse,
  type Result,
} from '@teamlet/shared'
import type {
  RecognitionKindValue,
  ReceivedRecognition,
} from '@/lib/modules/recognition'

const DIRECTORY_MANAGE = 'member.directory.manage'

async function requireEmployee(): Promise<{ employeeId: string; companyId: string }> {
  const user = await getCurrentUser()
  return { employeeId: user.employeeId, companyId: user.companyId }
}

export async function sendRecognitionAction(input: {
  recipientId: string
  kind: RecognitionKindValue
  message: string
}): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const { employeeId: senderId, companyId } = await requireEmployee()
    if (!input.message.trim()) return err(errors.validation('메시지를 입력해 주세요'))
    if (input.recipientId === senderId)
      return err(errors.validation('본인에게는 보낼 수 없어요'))

    const db = getDb()
    // 수신자가 같은 회사 소속·활성인지 검증 (멀티테넌시 격리)
    const recipient = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, input.recipientId),
          eq(employees.companyId, companyId),
          eq(employees.isActive, true),
        ),
      )
      .limit(1)
    if (!recipient.length) return err(errors.notFound('받는 구성원을 찾을 수 없어요'))

    const id = crypto.randomUUID()
    try {
      await db.insert(recognitions).values({
        id,
        companyId,
        senderId,
        recipientId: input.recipientId,
        kind: input.kind,
        message: input.message.trim(),
        isRead: false,
      })
    } catch (e) {
      console.error('[db] sendRecognition 실패', e)
      return err(errors.internal('보내는 중 오류가 발생했어요'))
    }
    return ok({ id })
  }
  const res = await run()
  if (res.ok) revalidatePath('/')
  return toApiResponse(res)
}

/** 내가 받은 인정·피드백 (개인). 최대 50건 최근순. 보낸 사람 이름 조인.
 *  ⚠️ 신규 데이터 — 실패 시 빈 배열로 degrade. */
export async function listReceivedRecognitions(
  employeeId?: string,
): Promise<ReceivedRecognition[]> {
  try {
    const { employeeId: meId } = await requireEmployee()
    const recipientId = employeeId ?? meId
    const db = getDb()
    const rows = await db
      .select({
        id: recognitions.id,
        kind: recognitions.kind,
        message: recognitions.message,
        senderName: employees.name,
        isRead: recognitions.isRead,
        createdAt: recognitions.createdAt,
      })
      .from(recognitions)
      .leftJoin(employees, eq(recognitions.senderId, employees.id))
      .where(eq(recognitions.recipientId, recipientId))
      .orderBy(desc(recognitions.createdAt))
      .limit(50)

    return rows.map((r) => ({
      id: r.id,
      kind: (r.kind as RecognitionKindValue) ?? 'RECOGNITION',
      message: r.message ?? '',
      senderName: r.senderName ?? '',
      isRead: !!r.isRead,
      createdAt: r.createdAt ?? new Date(),
    }))
  } catch (e) {
    console.error('[db] listReceivedRecognitions 실패', e)
    return []
  }
}

/** 받은 인정·피드백 읽음 처리 (탭 진입 시). */
export async function markRecognitionsReadAction(): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const { employeeId } = await requireEmployee()
    try {
      await getDb()
        .update(recognitions)
        .set({ isRead: true })
        .where(and(eq(recognitions.recipientId, employeeId), eq(recognitions.isRead, false)))
    } catch (e) {
      console.error('[db] markRecognitionsRead 실패', e)
      // 무동작 degrade
    }
    return ok(undefined)
  }
  return toApiResponse(await run())
}

/** 받은 인정·피드백 삭제 — 수신자 본인 또는 member.directory.manage 권한자만. */
export async function deleteRecognitionAction(
  recognitionId: string,
): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const { employeeId, companyId } = await requireEmployee()
    const db = getDb()
    const cur = await db
      .select({ recipientId: recognitions.recipientId, companyId: recognitions.companyId })
      .from(recognitions)
      .where(eq(recognitions.id, recognitionId))
      .limit(1)
    if (!cur.length) return err(errors.notFound('메시지를 찾을 수 없어요'))
    if (cur[0].companyId !== companyId) return err(errors.forbidden('권한이 없어요'))

    const isRecipient = cur[0].recipientId === employeeId
    const isAdmin = await hasPermission(employeeId, DIRECTORY_MANAGE)
    if (!isRecipient && !isAdmin)
      return err(errors.forbidden('수신자 본인 또는 관리자만 삭제할 수 있어요'))

    try {
      await db.delete(recognitions).where(eq(recognitions.id, recognitionId))
    } catch (e) {
      console.error('[db] deleteRecognition 실패', e)
      return err(errors.internal('삭제 중 오류가 발생했어요'))
    }
    return ok(undefined)
  }
  const res = await run()
  if (res.ok) revalidatePath('/')
  return toApiResponse(res)
}
