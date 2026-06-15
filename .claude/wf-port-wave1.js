export const meta = {
  name: 'teamlet-port-wave1',
  description: '원본 teamlet 기능을 teamlet-v1로 충실 이식 — Wave1: 구성원/휴가+휴가관리/워크플로우',
  phases: [
    { title: 'Port', detail: '영역별 병렬 이식 (verbatim 컴포넌트 + drizzle 액션 + 페이지 와이어링)' },
  ],
}

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'filesWritten', 'actionsCreated', 'missingSchemaColumns', 'blockers', 'summary'],
  properties: {
    area: { type: 'string' },
    filesWritten: { type: 'array', items: { type: 'string' }, description: '작성/수정한 절대경로 전부' },
    actionsCreated: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'signature', 'writes'],
        properties: {
          name: { type: 'string' },
          signature: { type: 'string', description: '예: createDepartmentAction({name, parentId?}): Promise<Result<DepartmentNode>>' },
          writes: { type: 'string', description: '이 액션이 insert/update 하는 테이블·컬럼 (읽기전용이면 READ)' },
        },
      },
    },
    missingSchemaColumns: {
      type: 'array',
      description: 'lib/db/schema.ts 에 없어서 insert/update 못 한 컬럼 (table.column: udt, REQUIRED 여부)',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['table', 'column', 'udt', 'required'],
        properties: {
          table: { type: 'string' },
          column: { type: 'string' },
          udt: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
    },
    blockers: { type: 'array', items: { type: 'string' }, description: '미해결 이슈/런타임 위험' },
    summary: { type: 'string', description: '무엇을 이식했는지 1~3문장' },
  },
}

const RULES = `
당신은 모노레포 HR 앱(원본: D:/teamlet/apps/web/src, Prisma 기반)의 한 도메인 영역을
단일 Next.js 앱(타깃: D:/teamlet-v1, drizzle+Neon 기반)으로 **충실하게 1:1 이식**합니다.
사용자가 로컬에서 쓰던 모든 이벤트/모달/검색/디자인이 그대로 동작해야 합니다.

## 절대 규칙
- 원본 D:/teamlet 은 **읽기 전용**. 절대 수정 금지. 새 코드는 D:/teamlet-v1 에만.
- 모든 경로는 절대경로 사용.
- 다음 공용 파일은 **수정 금지**(다른 에이전트와 충돌):
  lib/db/schema.ts, tsconfig.json, package.json, components/ui/*, app/layout.tsx,
  app/_components/sidebar.tsx, lib/db.ts, lib/current-user.ts, lib/permissions.ts,
  components/common/recipient-picker*.
  (네 영역의 라우트/컴포넌트/액션/모듈타입 파일만 쓴다.)

## 작업 순서
1) 먼저 타깃 v1 의 현재 페이지를 Read 한다 — 이미 **동작하는 drizzle 읽기 + teamlet 디자인 CSS 클래스**가 들어있다.
   이 동작을 **절대 퇴행시키지 말 것**. 여기에 원본의 풍부한 이벤트/모달/탭/검색을 더한다.
2) 원본 영역 디렉터리를 find/Read 로 전부 파악한다 (page, _components, components/<area>, lib/actions/<area>, packages/modules/src/<area>).
3) **클라이언트 컴포넌트는 원본 그대로(verbatim) 복사**해서 v1 의 같은 위치에 만든다. import 만 조정:
   - '@teamlet/ui' → 그대로 (별칭 있음)
   - '@teamlet/shared' → 그대로 (별칭 있음: Result/ok/err/errors/zod 스키마/koreanUtils/dateUtils)
   - '@teamlet/modules/<x>'(주로 **타입**) → D:/teamlet-v1/lib/modules/<x>.ts 를 새로 만들어 그 타입들을
     원본 모듈 소스에서 추출해 정의(Prisma 타입은 평범한 string/유니온으로 대체)하고, import 경로는 그대로 둔다(별칭 resolve).
   - '@/lib/actions/<x>' → 그대로 두고, v1 lib/actions/<x>.ts 를 drizzle 로 새로 만든다.
   - '@/components/...' 또는 상대경로 → 그대로.
   - 'next/*', 'react', 'lucide-react' 등 → 그대로.
4) **서버 액션**: lib/actions/<area>.ts ('use server') 를 drizzle 로 작성.
   - 컴포넌트가 호출하는 **시그니처와 반환형을 정확히** 맞춘다. 원본은 보통 @teamlet/shared 의 Result 사용:
     성공 ok(data) / 실패 err(errors.validation('...')) 등. 컴포넌트가 res.ok / res.error.message 를 읽는다.
   - DB 접근: import { getDb } from '@/lib/db'; import { ...tables } from '@/lib/db/schema';
     import { getCurrentUser } from '@/lib/current-user' (companyId/employeeId).
   - 비즈니스 로직은 원본 packages/modules/src/<area> 를 읽어 동일 의미로 재현(권한·검증·기본값).
   - **INSERT/UPDATE 정확성(런타임 크래시 방지)**: 반드시 D:/teamlet-v1/lib/db/_db-columns.md 와
     _db-enums.md 를 Read 해서 실제 컬럼명/타입/REQUIRED(no default)/enum 값을 확인.
     insert 시 REQUIRED 컬럼을 모두 채운다(보통 id: crypto.randomUUID(), updatedAt: new Date()).
   - **schema.ts 에 선언 안 된 컬럼이 필요하면 schema.ts 를 고치지 말고**(충돌), missingSchemaColumns 에 보고하고,
     선언된 컬럼만으로 컴파일되게 작성한다(필수컬럼 누락 위험은 blockers 에도 적는다).
   - 참고 모범 예시(검증됨): D:/teamlet-v1/app/members/actions.ts (createEmployeeResult) 와
     D:/teamlet/apps/web/src/components/members/add-department-button.tsx (모달 패턴).
5) **페이지 와이어링**: 원본처럼 이벤트가 **페이지 전환이 아니라 Dialog(창)** 로 뜨도록 컴포넌트를 v1 페이지에 배치.
   검색/필터는 URL 쿼리 기반으로 실제 동작하게(원본 동작 보존). 디자인 CSS 클래스/인라인 스타일/CSS 변수(var(--fg) 등) 그대로.
6) 인사관리(관리자 전용) 영역이면 페이지 상단에서 권한 게이트:
   import { getCurrentUser } from '@/lib/current-user'; import { isHrAdmin } from '@/lib/permissions';
   const user = await getCurrentUser(); if (!(await isHrAdmin(user.employeeId))) { /* 안내 또는 redirect('/') */ }

## 산출
- 네 영역이 v1 에서 **빌드되고**(가능한 범위에서) 원본과 동일하게 동작하도록 파일을 작성.
- 마지막에 구조화 리포트를 반환(StructuredOutput): 작성 파일, 만든 액션(시그니처+write 대상), 누락 스키마 컬럼, 블로커, 요약.
- 산문 설명 말고 **파일을 실제로 작성**하라. 리포트가 곧 반환값이다.
`

const AREAS = [
  {
    key: 'members',
    title: '구성원(members)',
    body: `
영역: 구성원/조직/발령/초대.
원본:
 - app/(app)/members/page.tsx, app/(app)/members/_components/*, app/(app)/members/[id]/_components/*, app/(app)/members/org-chart/_components/*
 - components/members/* (add-department-button, add-position-button, add-member-button[이미 v1에 있음], csv-import-button, deactivate-button, department-actions, department-sidebar, edit-member-button, invite-link-button, member-roles-manager, pending-join-panel, register-appointment-button, search-input, status-tabs)
 - lib/actions/{department,position,employee,employee-profile,appointment,csv-import,invite}.ts
 - packages/modules/src/{department,position,employee,appointment}
타깃 v1: app/members/**(page, [id], [id]/edit, new, _components), components/members/*, lib/actions/<각>.ts, lib/modules/{department,position,employee,...}.ts
이미 존재(보존/활용): app/members/page.tsx 에 AddMemberButton·MembersFilterBar 연결됨, app/members/actions.ts(createEmployeeResult), department-sidebar/org-tree(app/members/_components).
주의: 구성원 추가/수정/부서추가/직책추가/발령등록/비활성화/역할관리/초대링크 전부 **모달**. 구성원 선택이 필요하면
 D:/teamlet-v1/components/common/recipient-picker.tsx 의 TargetPicker 를 활용 가능.
`,
    gated: false,
  },
  {
    key: 'leave',
    title: '휴가(leave) + 휴가관리(hr/leave)',
    body: `
영역: 직원 휴가 + 인사 휴가관리(관리자). lib/actions/leave.ts 를 **한 에이전트가** 소유(공유 충돌 방지).
원본:
 - app/(app)/leave/page.tsx, app/(app)/leave/_components/* (annual-detail-tab, annual-plan-tab, balance-section, dual-calendar, history-tab, leave-request-entry, leave-tabs, leave-type-cards, schedule-editor)
 - app/(app)/hr/leave/page.tsx, app/(app)/hr/leave/_components/* (balance-table, grant-download-modal, grant-history-full-view, leave-status-view, monthly-annual-table, promotion-table, requests-table, usage-upload-modal)
 - components/leave/* (approve-reject-buttons, cancel-leave-button, grant-leave-button, leave-request-button)
 - components/hr/* (adjust-leave-button, adjust-leave-dropdown, expiry-button, grant-history-button, grant-leave-button, grant-leave-dropdown, leave-type-picker)
 - lib/actions/{leave,leave-promotion}.ts ; packages/modules/src/leave/*
타깃 v1: app/leave/**(page, calendar, requests, new), app/hr/leave/**, components/leave/*, components/hr/*, lib/actions/{leave,leave-promotion}.ts, lib/modules/leave.ts
권한: **app/hr/leave 는 관리자 전용** — isHrAdmin 게이트. app/leave 는 전원.
주의: 휴가 신청/승인/반려/취소/부여/조정/촉진/소멸 전부 **모달 또는 인라인 드롭다운**(원본 그대로). 신청 모달은 leave-request-entry 흐름.
휴가 잔액(leave_balances)·요청(leave_requests, enum LeaveRequestStatus) insert/update 시 _db-columns.md 확인 필수.
`,
    gated: true,
  },
  {
    key: 'workflow',
    title: '워크플로우(workflow)',
    body: `
영역: 결재/워크플로우 + 문서.
원본:
 - app/(app)/workflow/page.tsx, app/(app)/workflow/_components/* (workflow-client, done-tab-client, pending-tab-client, requested-tab-client, join-requests-panel), app/(app)/workflow/documents/[id]/*
 - components/workflow/* (approve-document-buttons, create-document-button)
 - lib/actions/workflow.ts ; packages/modules/src/workflow/*
타깃 v1: app/workflow/**(page, documents/[id]), components/workflow/*, lib/actions/workflow.ts, lib/modules/workflow.ts
주의: 문서 생성(create-document-button)=양식 선택+승인선(RecipientPickerRow 사용 가능, D:/teamlet-v1/components/common/recipient-picker.tsx)=**모달**.
승인/반려=approve-document-buttons. 탭(요청함/진행/완료) 동작 보존. 결재선/액션 테이블(approval_lines, approval_actions, form_documents) insert 시 _db-columns.md 확인.
v1 에 이미 app/workflow/page.tsx, app/workflow/documents/[id] 존재 — 보존+강화.
`,
    gated: false,
  },
]

phase('Port')

const results = await parallel(
  AREAS.map((a) => () =>
    agent(
      `${RULES}\n\n## 당신의 영역: ${a.title}\n${a.body}\n\n지금 바로 파일을 작성하고, 끝나면 구조화 리포트를 반환하세요.`,
      { label: `port:${a.key}`, phase: 'Port', agentType: 'claude', schema: REPORT_SCHEMA },
    ),
  ),
)

return results.filter(Boolean)
