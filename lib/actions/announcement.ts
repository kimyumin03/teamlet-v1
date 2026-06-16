'use server'

// 공지(announcement) 서버 액션 — drizzle/Neon. 원본 lib/actions/announcement.ts +
// modules/announcement(announcement.ts, comment.ts) 의 비즈니스 의미를 동일하게 재현.
// 반환형은 원본과 동일한 ApiResponse<T>.
//   - 작성: company.announcement.manage 권한 필요 (없으면 FORBIDDEN)
//   - 수정/삭제: 작성자 본인만
//   - 댓글 삭제: 본인 또는 company.announcement.manage
//
// ⚠️ 스키마 한계(보고됨):
//   - announcement_comments 테이블이 schema.ts 에 없음 → 댓글 액션은 빈 결과/검증오류로 안전 degrade.
//   - employees.lastAnnouncementReadAt 컬럼이 schema.ts 에 없음 → 읽음 처리는 no-op, 안 읽은 수는 0.

import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { announcements, employees } from '@/lib/db/schema'
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
import type { AnnouncementItem, CommentItem } from '@/lib/modules/announcement'

const ANNOUNCEMENT_MANAGE = 'company.announcement.manage'

async function requireEmployee(): Promise<{ employeeId: string; companyId: string }> {
  const user = await getCurrentUser()
  return { employeeId: user.employeeId, companyId: user.companyId }
}

/** 회사 공지 목록 (고정 우선 → 최신순). 작성자 이름 조인. 댓글 수는 0(테이블 없음). */
export async function listAnnouncements(
  _employeeId?: string,
): Promise<ApiResponse<AnnouncementItem[]>> {
  const run = async (): Promise<Result<AnnouncementItem[]>> => {
    const { companyId } = await requireEmployee()
    const db = getDb()
    const rows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        authorId: announcements.authorId,
        authorName: employees.name,
        isPinned: announcements.isPinned,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .leftJoin(employees, eq(announcements.authorId, employees.id))
      .where(eq(announcements.companyId, companyId))
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))

    return ok(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content ?? '',
        authorId: r.authorId ?? '',
        authorName: r.authorName ?? '',
        isPinned: !!r.isPinned,
        createdAt: r.createdAt ?? new Date(),
        commentCount: 0,
      })),
    )
  }
  return toApiResponse(await run())
}

/** 안 읽은 공지 수 — lastAnnouncementReadAt 컬럼이 없어 0 으로 안전 degrade. */
export async function getUnreadAnnouncementCount(_employeeId?: string): Promise<number> {
  return 0
}

/** 공지 확인 처리 — lastAnnouncementReadAt 컬럼이 없어 no-op. */
export async function markAnnouncementsReadAction(): Promise<ApiResponse<void>> {
  return toApiResponse(ok(undefined))
}

export async function createAnnouncementAction(input: {
  title: string
  content: string
  isPinned?: boolean
}): Promise<ApiResponse<{ id: string }>> {
  const run = async (): Promise<Result<{ id: string }>> => {
    const { employeeId, companyId } = await requireEmployee()
    // 공지 작성 권한 보유자만 (원본 H5 — 전 직원 작성 차단)
    if (!(await hasPermission(employeeId, ANNOUNCEMENT_MANAGE))) {
      return err(errors.forbidden('company.announcement.manage 권한이 필요해요'))
    }
    const title = input.title.trim()
    const content = input.content.trim()
    if (!title) return err(errors.validation('제목을 입력해 주세요'))
    if (!content) return err(errors.validation('내용을 입력해 주세요'))

    const id = crypto.randomUUID()
    try {
      await getDb().insert(announcements).values({
        id,
        companyId,
        authorId: employeeId,
        title,
        content,
        isPinned: input.isPinned ?? false,
        updatedAt: new Date(),
      })
    } catch (e) {
      console.error('[db] createAnnouncement 실패', e)
      return err(errors.internal('공지 작성 중 오류가 발생했어요'))
    }
    return ok({ id })
  }
  const res = await run()
  if (res.ok) revalidatePath('/')
  return toApiResponse(res)
}

export async function updateAnnouncementAction(
  announcementId: string,
  input: { title?: string; content?: string; isPinned?: boolean },
): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const { employeeId, companyId } = await requireEmployee()
    const db = getDb()
    const cur = await db
      .select({ authorId: announcements.authorId, companyId: announcements.companyId })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1)
    if (!cur.length) return err(errors.notFound('공지사항을 찾을 수 없어요'))
    if (cur[0].companyId !== companyId) return err(errors.forbidden('권한이 없어요'))
    // 작성자 본인만 수정 가능
    if (cur[0].authorId !== employeeId) return err(errors.forbidden('작성자만 수정할 수 있어요'))

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (input.title !== undefined) patch.title = input.title.trim()
    if (input.content !== undefined) patch.content = input.content.trim()
    if (input.isPinned !== undefined) patch.isPinned = input.isPinned

    try {
      await db.update(announcements).set(patch).where(eq(announcements.id, announcementId))
    } catch (e) {
      console.error('[db] updateAnnouncement 실패', e)
      return err(errors.internal('공지 수정 중 오류가 발생했어요'))
    }
    return ok(undefined)
  }
  const res = await run()
  if (res.ok) revalidatePath('/')
  return toApiResponse(res)
}

export async function deleteAnnouncementAction(
  announcementId: string,
): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const { employeeId, companyId } = await requireEmployee()
    const db = getDb()
    const cur = await db
      .select({ authorId: announcements.authorId, companyId: announcements.companyId })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1)
    if (!cur.length) return err(errors.notFound('공지사항을 찾을 수 없어요'))
    if (cur[0].companyId !== companyId) return err(errors.forbidden('권한이 없어요'))
    if (cur[0].authorId !== employeeId) return err(errors.forbidden('작성자만 삭제할 수 있어요'))

    try {
      await db.delete(announcements).where(eq(announcements.id, announcementId))
    } catch (e) {
      console.error('[db] deleteAnnouncement 실패', e)
      return err(errors.internal('공지 삭제 중 오류가 발생했어요'))
    }
    return ok(undefined)
  }
  const res = await run()
  if (res.ok) revalidatePath('/')
  return toApiResponse(res)
}

export async function togglePinAction(announcementId: string): Promise<ApiResponse<void>> {
  const run = async (): Promise<Result<void>> => {
    const { companyId } = await requireEmployee()
    const db = getDb()
    const cur = await db
      .select({ isPinned: announcements.isPinned, companyId: announcements.companyId })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1)
    if (!cur.length) return err(errors.notFound('공지사항을 찾을 수 없어요'))
    if (cur[0].companyId !== companyId) return err(errors.forbidden('권한이 없어요'))

    try {
      await db
        .update(announcements)
        .set({ isPinned: !cur[0].isPinned, updatedAt: new Date() })
        .where(eq(announcements.id, announcementId))
    } catch (e) {
      console.error('[db] togglePin 실패', e)
      return err(errors.internal('고정 처리 중 오류가 발생했어요'))
    }
    return ok(undefined)
  }
  const res = await run()
  if (res.ok) revalidatePath('/')
  return toApiResponse(res)
}

/* ──────────────────────────────────────────────────────────
   댓글 — announcement_comments 테이블이 schema.ts 에 없어 안전 degrade.
   목록은 빈 배열, 작성/삭제는 검증오류로 사용자에게 명확히 안내.
   (테이블이 schema.ts 에 추가되면 drizzle insert/select 로 교체 가능)
─────────────────────────────────────────────────────────── */
export async function listCommentsAction(
  _announcementId: string,
): Promise<ApiResponse<CommentItem[]>> {
  return toApiResponse(ok([]))
}

export async function createCommentAction(
  _announcementId: string,
  content: string,
): Promise<ApiResponse<{ id: string }>> {
  const trimmed = content.trim()
  if (!trimmed) return toApiResponse(err(errors.validation('댓글 내용을 입력해 주세요')))
  if (trimmed.length > 500)
    return toApiResponse(err(errors.validation('댓글은 500자 이내로 입력해 주세요')))
  // announcement_comments 테이블 미정의 — 저장 불가
  return toApiResponse(err(errors.internal('댓글 기능은 현재 준비 중이에요')))
}

export async function deleteCommentAction(_commentId: string): Promise<ApiResponse<void>> {
  return toApiResponse(err(errors.internal('댓글 기능은 현재 준비 중이에요')))
}
