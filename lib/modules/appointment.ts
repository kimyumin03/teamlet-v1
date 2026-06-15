// 인사 발령(appointment) 모듈 타입 — 원본 packages/modules/src/appointment/index.ts 추출.
// AppointmentKind 는 Prisma enum → 평범한 string 유니온으로 대체.

export type AppointmentKind =
  | "HIRE"
  | "TRANSFER"
  | "PROMOTION"
  | "POSITION_CHANGE"
  | "REASSIGN";

export type AppointmentItem = {
  id: string;
  kind: AppointmentKind;
  kindLabel: string;
  effectiveDate: Date;
  fromDepartmentName: string | null;
  toDepartmentName: string | null;
  fromPositionName: string | null;
  toPositionName: string | null;
  memo: string | null;
  appointedByName: string | null;
  createdAt: Date;
};

export const APPOINTMENT_KIND_LABEL: Record<AppointmentKind, string> = {
  HIRE: "입사",
  TRANSFER: "부서 이동",
  PROMOTION: "승진",
  POSITION_CHANGE: "직책 변경",
  REASSIGN: "부서·직책 변경",
};
