'use server'

// 알림(notification) 서버 액션 — 원본 lib/actions/notification.ts 의 시그니처를 동일하게 재현.
// notification-bell 컴포넌트가 import 하는 markReadAction / markAllReadAction / listNotifications 를 제공.
//
// ⚠️ 스키마 한계(보고됨): notifications 테이블이 schema.ts 에 없음 →
//   목록은 빈 배열, 읽음 처리는 no-op 으로 안전 degrade. (테이블 추가 시 drizzle 로 교체)

import { toApiResponse, ok, type ApiResponse } from '@teamlet/shared'
import type { NotificationItem } from '@/lib/modules/notification'

/** 내 알림 목록 (최신순) — notifications 테이블 미정의로 빈 배열 degrade. */
export async function listNotifications(
  _employeeId?: string,
): Promise<ApiResponse<NotificationItem[]>> {
  return toApiResponse(ok([]))
}

/** 안 읽은 알림 수 — 미정의로 0. */
export async function countUnreadNotifications(_employeeId?: string): Promise<number> {
  return 0
}

/** 단건 읽음 처리 — no-op degrade. */
export async function markReadAction(_notificationId: string): Promise<ApiResponse<void>> {
  return toApiResponse(ok(undefined))
}

/** 모두 읽음 처리 — no-op degrade. */
export async function markAllReadAction(): Promise<ApiResponse<void>> {
  return toApiResponse(ok(undefined))
}
