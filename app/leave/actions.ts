'use server'

import { redirect } from 'next/navigation'

// 휴가 신청 — Server Action.
// ⚠️ axhub SDK 는 읽기 전용: leave_requests 등 동적테이블은 axhub 가 총괄하는 마스터 데이터예요.
//    역방향 수정(insert/update/delete) 절대 금지 — 저장은 teamlet 자체 DB(Neon) 연동 후 연결.
//    그 전까지 axhub 에는 쓰지 않고, 폼 제출 시 목록으로 돌아가요.
export async function requestLeave(formData: FormData): Promise<void> {
  // TODO(teamlet-db): leave_type / start_date / end_date / reason 를 teamlet 자체 DB 에 저장.
  //   axhub 동적테이블(leave_requests)에는 절대 쓰지 않음.
  void formData
  redirect('/leave?saved=pending')
}
