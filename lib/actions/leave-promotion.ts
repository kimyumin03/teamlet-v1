'use server'

// 연차 촉진(leave-promotion) 서버 액션.
// ⚠️ v1 schema 에는 leave_promotions / leave_promotion_plan_dates 테이블이 선언돼 있지 않아요(missingSchemaColumns 참고).
//    따라서 촉진 조회는 빈 목록, 제출/취소는 검증만 통과시키는 안전 구현이에요.
//    (촉진 UI/모달/탭은 원본 그대로 살아있고, 데이터가 비어 있으면 "촉진 내역 없음" 빈 상태로 표시돼요.)

import { revalidatePath } from 'next/cache'
import { toApiResponse, ok, err, errors, type Result, type ApiResponse } from '@teamlet/shared'
import { getCurrentUser } from '@/lib/current-user'
import type { LeavePromotionItem, MyLeavePromotionItem, LeavePromotionDetail } from '@/lib/modules/leave'

/** 회사 연차 촉진 목록 — v1 에 촉진 테이블이 없어 빈 목록. */
export async function listCompanyLeavePromotions(_actorEmployeeId: string, _year: number): Promise<Result<LeavePromotionItem[]>> {
  return ok([])
}

/** 내 연차 촉진(사용 계획 탭) — v1 에 촉진 테이블이 없어 빈 목록. */
export async function getMyLeavePromotions(_employeeId: string, _year: number): Promise<Result<MyLeavePromotionItem[]>> {
  return ok([])
}

/** 촉진 취소 — 촉진 데이터가 없어 not-found. */
export async function cancelLeavePromotionAction(_promotionId: string): Promise<ApiResponse<void>> {
  await getCurrentUser()
  revalidatePath('/hr/leave')
  return toApiResponse(err(errors.notFound('연차 촉진 데이터를 찾을 수 없어요')) as Result<void>)
}

/** 촉진 상세 — 촉진 데이터가 없어 not-found. */
export async function getLeavePromotionDetailAction(_promotionId: string): Promise<ApiResponse<LeavePromotionDetail>> {
  await getCurrentUser()
  return toApiResponse(err(errors.notFound('연차 촉진 데이터를 찾을 수 없어요')) as Result<LeavePromotionDetail>)
}

/** 연차 사용 계획 제출 — 촉진 데이터가 없어 not-found(검증만). */
export async function submitLeavePlanAction(_promotionId: string, planDates: string[]): Promise<ApiResponse<{ id: string }>> {
  await getCurrentUser()
  if (planDates.length === 0)
    return toApiResponse(err(errors.validation('사용 희망일을 1개 이상 선택해 주세요.')) as Result<{ id: string }>)
  revalidatePath('/leave')
  revalidatePath('/hr/leave')
  return toApiResponse(err(errors.notFound('연차 촉진 데이터를 찾을 수 없어요')) as Result<{ id: string }>)
}
