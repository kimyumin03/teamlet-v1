'use server'

import { redirect } from 'next/navigation'

export type ActionResult = { ok: true } | { ok: false; error: string }

// 구성원 추가 — Server Action.
// ⚠️ axhub SDK 는 읽기 전용: employees 동적테이블은 axhub 가 총괄하는 마스터 데이터예요.
//    역방향 수정(insert/update/delete) 절대 금지 — 저장은 teamlet 자체 DB(Neon) 연동 후 연결.

// useActionState 용 (인라인 결과 표시). 자체 DB 연동 전까지 저장 비활성.
export async function addEmployee(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  void formData
  return {
    ok: false,
    error: '구성원 저장은 teamlet 자체 DB 연동 후 제공돼요. (axhub 마스터 데이터에는 쓰지 않습니다)',
  }
}

// 폼 직접 제출용 (server component <form action>).
export async function createEmployee(formData: FormData): Promise<void> {
  // TODO(teamlet-db): name / email / department / position / status 를 teamlet 자체 DB 에 저장.
  //   axhub 동적테이블(employees)에는 절대 쓰지 않음.
  void formData
  redirect('/members?saved=pending')
}
