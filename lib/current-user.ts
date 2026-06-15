// 현재 로그인 사용자 — identity(로그인) 붙기 전까지 "실제 직원 1명"으로 고정해요.
// ⚠️ 직원 companyEmail 이 비어있어(null) 이메일이 아니라 employeeId 로 신원을 잡아요.
//    데모 직원: 김민준 (회사 cmq7v3cyy...). 나중에 실제 로그인 붙으면 이 함수만 바꾸면 돼요.
export type CurrentUser = { employeeId: string; name: string; companyId: string }

export function getCurrentUser(): CurrentUser {
  return {
    employeeId: 'cmq7v3e96001mwer06ubk0vtc',
    name: '김민준',
    companyId: 'cmq7v3cyy000swer045bbwytj',
  }
}
